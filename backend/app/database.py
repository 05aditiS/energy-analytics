"""Database connection and initialization module for SQLite storage."""

import sqlite3
from pathlib import Path
from typing import Optional
from app.config import DB_PATH

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS actual_wind (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL UNIQUE,
    generation_mw REAL NOT NULL,
    source_file TEXT
);

CREATE INDEX IF NOT EXISTS idx_actual_wind_start_time ON actual_wind(start_time);

CREATE TABLE IF NOT EXISTS wind_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    publish_time TEXT NOT NULL,
    generation_mw REAL NOT NULL,
    source_file TEXT,
    UNIQUE(start_time, publish_time)
);

CREATE INDEX IF NOT EXISTS idx_wind_forecasts_start_time ON wind_forecasts(start_time);
CREATE INDEX IF NOT EXISTS idx_wind_forecasts_publish_time ON wind_forecasts(publish_time);
CREATE INDEX IF NOT EXISTS idx_wind_forecasts_start_pub ON wind_forecasts(start_time, publish_time);
"""


def get_db_connection(db_path: Optional[Path | str] = None) -> sqlite3.Connection:
    """Get a SQLite database connection with row factory configured."""
    target_path = Path(db_path) if db_path else DB_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[Path | str] = None) -> None:
    """Initialize database tables and indexes if they do not exist."""
    with get_db_connection(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
