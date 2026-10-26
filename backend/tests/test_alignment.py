"""Unit tests for day-ahead temporal alignment logic and settlement periods."""

import sqlite3
import pytest
from pathlib import Path

from app.database import init_db
from app.services.alignment import (
    AlignmentService,
    compute_day_ahead_cutoff,
    get_settlement_period_number,
    get_settlement_period_start_time,
)


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """Fixture providing a fresh, initialized SQLite database."""
    db_file = tmp_path / "test_energy.db"
    init_db(db_file)
    return db_file


def test_settlement_period_mappings():
    """Verify settlement period numbers (1-48) correctly map to 30-min start times."""
    assert get_settlement_period_number("2026-01-15T00:00:00Z") == 1
    assert get_settlement_period_number("2026-01-15T00:30:00Z") == 2
    assert get_settlement_period_number("2026-01-15T14:00:00Z") == 29
    assert get_settlement_period_number("2026-01-15T23:30:00Z") == 48

    assert get_settlement_period_start_time("2026-01-15", 1) == "2026-01-15T00:00:00Z"
    assert get_settlement_period_start_time("2026-01-15", 2) == "2026-01-15T00:30:00Z"
    assert get_settlement_period_start_time("2026-01-15", 29) == "2026-01-15T14:00:00Z"
    assert get_settlement_period_start_time("2026-01-15", 48) == "2026-01-15T23:30:00Z"


def test_cutoff_computation():
    """Verify D-1 11:00:00 UTC day-ahead cutoff calculation."""
    # For Jan 15, cutoff is Jan 14 at 11:00:00 UTC
    assert compute_day_ahead_cutoff("2026-01-15") == "2026-01-14T11:00:00Z"
    assert compute_day_ahead_cutoff("2026-01-15T14:00:00Z") == "2026-01-14T11:00:00Z"
    # For Jan 1, cutoff is Dec 31 at 11:00:00 UTC
    assert compute_day_ahead_cutoff("2026-01-01") == "2025-12-31T11:00:00Z"
    # For Jan 31, cutoff is Jan 30 at 11:00:00 UTC
    assert compute_day_ahead_cutoff("2026-01-31") == "2026-01-30T11:00:00Z"


def test_forecast_eligibility_and_latest_selection(temp_db: Path):
    """Verify the core requirement:
    Delivery: 2026-01-15T14:00:00Z (SP29)
    Cutoff:   2026-01-14T11:00:00Z
    Forecasts:
    - 2026-01-13T11:00:00Z (1000 MW)
    - 2026-01-14T05:00:00Z (1100 MW)
    - 2026-01-14T10:30:00Z (1200 MW)  <- LATEST ELIGIBLE
    - 2026-01-14T11:30:00Z (1300 MW)  <- MUST BE REJECTED
    """
    delivery_time = "2026-01-15T14:00:00Z"

    with sqlite3.connect(temp_db) as conn:
        # Insert actual
        conn.execute(
            "INSERT INTO actual_wind (start_time, generation_mw) VALUES (?, ?)",
            (delivery_time, 1500.0),
        )
        # Insert forecast candidates
        forecasts = [
            (delivery_time, "2026-01-13T11:00:00Z", 1000.0),
            (delivery_time, "2026-01-14T05:00:00Z", 1100.0),
            (delivery_time, "2026-01-14T10:30:00Z", 1200.0),
            (delivery_time, "2026-01-14T11:30:00Z", 1300.0),
        ]
        conn.executemany(
            "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw) VALUES (?, ?, ?)",
            forecasts,
        )
        conn.commit()

    service = AlignmentService(db_path=temp_db)
    day_periods = service.get_day_ahead_periods("2026-01-15")
    assert len(day_periods) == 48

    # SP29 corresponds to 14:00:00Z
    sp29 = next(p for p in day_periods if p.settlementPeriod == 29)
    assert sp29.startTime == delivery_time
    assert sp29.actualMW == 1500.0
    assert sp29.forecastPublishTime == "2026-01-14T10:30:00Z"
    assert sp29.forecastMW == 1200.0
    assert sp29.differenceMW == 300.0  # 1500 - 1200


def test_forecast_exactly_at_cutoff_is_eligible(temp_db: Path):
    """Verify that a forecast published exactly at 11:00:00 UTC is eligible."""
    delivery_time = "2026-01-15T14:00:00Z"
    exact_cutoff = "2026-01-14T11:00:00Z"

    with sqlite3.connect(temp_db) as conn:
        conn.execute(
            "INSERT INTO actual_wind (start_time, generation_mw) VALUES (?, ?)",
            (delivery_time, 2000.0),
        )
        conn.execute(
            "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw) VALUES (?, ?, ?)",
            (delivery_time, exact_cutoff, 1850.0),
        )
        conn.commit()

    service = AlignmentService(db_path=temp_db)
    day_periods = service.get_day_ahead_periods("2026-01-15")
    sp29 = next(p for p in day_periods if p.settlementPeriod == 29)

    assert sp29.forecastPublishTime == exact_cutoff
    assert sp29.forecastMW == 1850.0
    assert sp29.differenceMW == 150.0


def test_forecast_one_second_after_cutoff_is_rejected(temp_db: Path):
    """Verify that a forecast published at 11:00:01 UTC is rejected."""
    delivery_time = "2026-01-15T14:00:00Z"
    rejected_pub = "2026-01-14T11:00:01Z"
    eligible_pub = "2026-01-14T10:59:59Z"

    with sqlite3.connect(temp_db) as conn:
        conn.execute(
            "INSERT INTO actual_wind (start_time, generation_mw) VALUES (?, ?)",
            (delivery_time, 2000.0),
        )
        conn.execute(
            "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw) VALUES (?, ?, ?)",
            (delivery_time, eligible_pub, 1800.0),
        )
        conn.execute(
            "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw) VALUES (?, ?, ?)",
            (delivery_time, rejected_pub, 1950.0),
        )
        conn.commit()

    service = AlignmentService(db_path=temp_db)
    day_periods = service.get_day_ahead_periods("2026-01-15")
    sp29 = next(p for p in day_periods if p.settlementPeriod == 29)

    # Must pick eligible_pub, NOT rejected_pub
    assert sp29.forecastPublishTime == eligible_pub
    assert sp29.forecastMW == 1800.0
    assert sp29.differenceMW == 200.0


def test_future_forecast_never_leaks(temp_db: Path):
    """Verify that a forecast published on delivery day D or later is never selected."""
    delivery_time = "2026-01-15T14:00:00Z"
    same_day_pub = "2026-01-15T08:00:00Z"

    with sqlite3.connect(temp_db) as conn:
        conn.execute(
            "INSERT INTO actual_wind (start_time, generation_mw) VALUES (?, ?)",
            (delivery_time, 2000.0),
        )
        conn.execute(
            "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw) VALUES (?, ?, ?)",
            (delivery_time, same_day_pub, 2100.0),
        )
        conn.commit()

    service = AlignmentService(db_path=temp_db)
    day_periods = service.get_day_ahead_periods("2026-01-15")
    sp29 = next(p for p in day_periods if p.settlementPeriod == 29)

    # Since only same_day_pub exists and it is past cutoff, forecast must be None
    assert sp29.forecastMW is None
    assert sp29.forecastPublishTime is None
    assert sp29.differenceMW is None
    assert sp29.actualMW == 2000.0


def test_missing_forecast_retained_as_null(temp_db: Path):
    """Verify that periods without eligible forecast retain null without data fabrication."""
    delivery_time = "2026-01-15T00:00:00Z"  # SP1

    with sqlite3.connect(temp_db) as conn:
        conn.execute(
            "INSERT INTO actual_wind (start_time, generation_mw) VALUES (?, ?)",
            (delivery_time, 500.0),
        )
        conn.commit()

    service = AlignmentService(db_path=temp_db)
    day_periods = service.get_day_ahead_periods("2026-01-15")
    sp1 = next(p for p in day_periods if p.settlementPeriod == 1)

    assert sp1.actualMW == 500.0
    assert sp1.forecastMW is None
    assert sp1.differenceMW is None
    assert sp1.forecastPublishTime is None


def test_missing_actual_retained_as_null(temp_db: Path):
    """Verify that periods without actual generation retain null without data fabrication."""
    delivery_time = "2026-01-15T00:30:00Z"  # SP2
    valid_pub = "2026-01-14T09:00:00Z"

    with sqlite3.connect(temp_db) as conn:
        conn.execute(
            "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw) VALUES (?, ?, ?)",
            (delivery_time, valid_pub, 650.0),
        )
        conn.commit()

    service = AlignmentService(db_path=temp_db)
    day_periods = service.get_day_ahead_periods("2026-01-15")
    sp2 = next(p for p in day_periods if p.settlementPeriod == 2)

    assert sp2.actualMW is None
    assert sp2.forecastMW == 650.0
    assert sp2.forecastPublishTime == valid_pub
    assert sp2.differenceMW is None
