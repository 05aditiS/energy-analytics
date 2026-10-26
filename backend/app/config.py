"""Configuration settings for Energy Analytics application."""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
PROJECT_ROOT = BASE_DIR.parent                     # energy-analytics/

# Raw data directory resolution with fallbacks
default_raw_dir = BASE_DIR / "data" / "raw"
if not default_raw_dir.exists() or not any(default_raw_dir.glob("*.json")):
    fallback_data_dir = PROJECT_ROOT / "data"
    if fallback_data_dir.exists() and any(fallback_data_dir.glob("*.json")):
        default_raw_dir = fallback_data_dir

RAW_DATA_DIR = Path(os.getenv("RAW_DATA_DIR", str(default_raw_dir)))

# Database file location
default_db_dir = BASE_DIR / "data" / "processed"
default_db_dir.mkdir(parents=True, exist_ok=True)
default_db_path = default_db_dir / "energy_analytics.db"

DB_PATH = Path(os.getenv("DATABASE_PATH", os.getenv("DB_PATH", str(default_db_path))))

# Analysis scope settings
ANALYSIS_YEAR = int(os.getenv("ANALYSIS_YEAR", "2026"))
ANALYSIS_MONTH = int(os.getenv("ANALYSIS_MONTH", "1"))
CUTOFF_HOUR_UTC = int(os.getenv("CUTOFF_HOUR_UTC", "11"))  # D-1 11:00 UTC
