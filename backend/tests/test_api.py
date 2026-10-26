"""Integration tests for FastAPI endpoints using TestClient."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root health check endpoint returns 200."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["analysis_period"] == "2026-01"


def test_get_available_dates():
    """Verify /api/dates returns all 31 days of January 2026 in ascending order."""
    response = client.get("/api/dates")
    assert response.status_code == 200
    dates = response.json()
    assert len(dates) == 31
    assert dates[0] == "2026-01-01"
    assert dates[-1] == "2026-01-31"
    assert dates == sorted(dates)


def test_get_day_ahead_valid_date():
    """Verify /api/day-ahead returns exactly 48 settlement periods for a valid January date."""
    response = client.get("/api/day-ahead?date=2026-01-15")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-01-15"
    periods = data["settlementPeriods"]
    assert len(periods) == 48

    # Verify chronological ordering and valid period numbers
    for idx, p in enumerate(periods, start=1):
        assert p["settlementPeriod"] == idx
        assert "startTime" in p
        assert "actualMW" in p
        assert "forecastMW" in p
        assert "differenceMW" in p
        assert "forecastPublishTime" in p


def test_get_day_ahead_invalid_date_format():
    """Verify /api/day-ahead rejects malformed date format with 400."""
    response = client.get("/api/day-ahead?date=15-01-2026")
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]


def test_get_day_ahead_outside_january_2026():
    """Verify /api/day-ahead rejects dates outside January 2026 with 400."""
    response = client.get("/api/day-ahead?date=2026-02-01")
    assert response.status_code == 400
    assert "outside the analysis period" in response.json()["detail"]

    response2 = client.get("/api/day-ahead?date=2025-12-31")
    assert response2.status_code == 400
    assert "outside the analysis period" in response2.json()["detail"]


def test_get_metrics_summary():
    """Verify /api/metrics/summary returns valid summary metric schema."""
    response = client.get("/api/metrics/summary")
    assert response.status_code == 200
    data = response.json()
    for key in ["comparablePeriods", "missingActualPeriods", "missingForecastPeriods"]:
        assert key in data
        assert isinstance(data[key], int)


def test_get_hourly_metrics():
    """Verify /api/metrics/hourly returns exactly 48 settlement period profiles."""
    response = client.get("/api/metrics/hourly")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 48
    for idx, sp in enumerate(data, start=1):
        assert sp["settlementPeriod"] == idx
        assert "sampleCount" in sp
        assert "averageErrorMW" in sp
        assert "maeMW" in sp


def test_get_data_quality():
    """Verify /api/data-quality returns valid pipeline quality statistics."""
    response = client.get("/api/data-quality")
    assert response.status_code == 200
    data = response.json()
    assert data["expectedDeliveryPeriods"] == 1488
    assert "actualRecords" in data
    assert "forecastRecordsLoaded" in data
    assert "alignedPeriods" in data
