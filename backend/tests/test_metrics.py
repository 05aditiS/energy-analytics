"""Unit tests for metrics and error distribution functions with hand-calculated test vectors."""

import math
import pytest
from app.schemas import SettlementPeriodRecord
from app.services.metrics import (
    MetricsService,
    calculate_bias,
    calculate_mae,
    calculate_nmae,
    calculate_rmse,
)


def test_calculate_mae_hand_calculated():
    """Hand-calculated MAE: errors = [10.0, -20.0, 30.0] -> (|10| + |-20| + |30|) / 3 = 60 / 3 = 20.0."""
    errors = [10.0, -20.0, 30.0]
    result = calculate_mae(errors)
    assert result == pytest.approx(20.0)


def test_calculate_rmse_hand_calculated():
    """Hand-calculated RMSE: errors = [3.0, -4.0] -> (3^2 + (-4)^2) / 2 = (9 + 16) / 2 = 12.5 -> sqrt(12.5) = 3.5355339..."""
    errors = [3.0, -4.0]
    result = calculate_rmse(errors)
    assert result == pytest.approx(math.sqrt(12.5))


def test_calculate_bias_hand_calculated():
    """Hand-calculated Directional Bias: errors = [10.0, -20.0, 40.0] -> (10 - 20 + 40) / 3 = 30 / 3 = 10.0."""
    errors = [10.0, -20.0, 40.0]
    result = calculate_bias(errors)
    assert result == pytest.approx(10.0)


def test_calculate_nmae_hand_calculated():
    """Hand-calculated nMAE: actuals = [100.0, 200.0] (mean = 150.0), MAE = 15.0 -> 15.0 / 150.0 * 100 = 10.0%."""
    actuals = [100.0, 200.0]
    mae = 15.0
    result = calculate_nmae(mae, actuals)
    assert result == pytest.approx(10.0)


def test_metrics_service_excludes_missing_records():
    """Verify that records with missing actual or forecast are excluded from error calculations."""
    records = [
        # Comparable 1: error = 1000 - 900 = 100
        SettlementPeriodRecord(settlementPeriod=1, startTime="2026-01-01T00:00:00Z", actualMW=1000.0, forecastMW=900.0),
        # Comparable 2: error = 2000 - 2200 = -200
        SettlementPeriodRecord(settlementPeriod=2, startTime="2026-01-01T00:30:00Z", actualMW=2000.0, forecastMW=2200.0),
        # Missing actual
        SettlementPeriodRecord(settlementPeriod=3, startTime="2026-01-01T01:00:00Z", actualMW=None, forecastMW=1500.0),
        # Missing forecast
        SettlementPeriodRecord(settlementPeriod=4, startTime="2026-01-01T01:30:00Z", actualMW=1800.0, forecastMW=None),
        # Missing both
        SettlementPeriodRecord(settlementPeriod=5, startTime="2026-01-01T02:00:00Z", actualMW=None, forecastMW=None),
    ]

    summary = MetricsService.calculate_summary_metrics(records)

    assert summary.comparablePeriods == 2
    assert summary.missingActualPeriods == 2
    assert summary.missingForecastPeriods == 2

    # errors = [100, -200]
    # MAE = (100 + 200) / 2 = 150.0
    assert summary.maeMW == 150.0
    # RMSE = sqrt((10000 + 40000) / 2) = sqrt(25000) = 158.11
    assert summary.rmseMW == 158.11
    # Bias = (100 - 200) / 2 = -50.0
    assert summary.meanErrorMW == -50.0
    # Mean actual = (1000 + 2000) / 2 = 1500.0; nMAE = 150.0 / 1500.0 * 100 = 10.0%
    assert summary.nMAEPercent == 10.0


def test_hourly_distribution():
    """Verify settlement period distribution generates 48 records with correct SP grouping."""
    records = [
        # SP1 on day 1
        SettlementPeriodRecord(settlementPeriod=1, startTime="2026-01-01T00:00:00Z", actualMW=100.0, forecastMW=80.0),
        # SP1 on day 2
        SettlementPeriodRecord(settlementPeriod=1, startTime="2026-01-02T00:00:00Z", actualMW=120.0, forecastMW=100.0),
        # SP48 on day 1
        SettlementPeriodRecord(settlementPeriod=48, startTime="2026-01-01T23:30:00Z", actualMW=500.0, forecastMW=600.0),
    ]

    dist = MetricsService.calculate_hourly_distribution(records)

    assert len(dist) == 48
    sp1 = next(d for d in dist if d.settlementPeriod == 1)
    assert sp1.sampleCount == 2
    assert sp1.averageErrorMW == 20.0  # (20 + 20) / 2
    assert sp1.maeMW == 20.0

    sp48 = next(d for d in dist if d.settlementPeriod == 48)
    assert sp48.sampleCount == 1
    assert sp48.averageErrorMW == -100.0  # 500 - 600
    assert sp48.maeMW == 100.0

    sp2 = next(d for d in dist if d.settlementPeriod == 2)
    assert sp2.sampleCount == 0
    assert sp2.averageErrorMW is None
    assert sp2.maeMW is None
