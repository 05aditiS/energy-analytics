"""Accuracy metrics and settlement-period distribution calculation service.

Formulas:
For records where both actualMW and forecastMW exist:
- error = actualMW - forecastMW
- MAE = mean(abs(error))
- RMSE = sqrt(mean(error^2))
- Mean Error / Directional Bias = mean(error)
- nMAE = (MAE / mean(actualMW)) * 100

Settlement-Period Distribution:
- Group records by SP 1 to 48 (SP1: 00:00 UTC, SP2: 00:30 UTC ... SP48: 23:30 UTC)
- For each SP: averageErrorMW, maeMW, sampleCount
- Excludes records missing actualMW or forecastMW from error calculations.
"""

import math
from typing import List, Optional, Tuple, Union

from app.schemas import MetricsSummaryResponse, SettlementPeriodMetric, SettlementPeriodRecord


def calculate_mae(errors: List[float]) -> Optional[float]:
    """Calculate Mean Absolute Error (MAE)."""
    if not errors:
        return None
    return sum(abs(e) for e in errors) / len(errors)


def calculate_rmse(errors: List[float]) -> Optional[float]:
    """Calculate Root Mean Squared Error (RMSE)."""
    if not errors:
        return None
    mean_sq = sum(e ** 2 for e in errors) / len(errors)
    return math.sqrt(mean_sq)


def calculate_bias(errors: List[float]) -> Optional[float]:
    """Calculate Mean Error (Directional Bias): actual - forecast."""
    if not errors:
        return None
    return sum(errors) / len(errors)


def calculate_nmae(mae: Optional[float], actuals: List[float]) -> Optional[float]:
    """Calculate Normalized MAE (nMAE) as percentage of mean actual generation."""
    if mae is None or not actuals:
        return None
    mean_actual = sum(actuals) / len(actuals)
    if mean_actual == 0:
        return None
    return (mae / mean_actual) * 100.0


class MetricsService:
    """Service to compute overall and settlement-period level metrics."""

    @staticmethod
    def calculate_summary_metrics(records: List[SettlementPeriodRecord]) -> MetricsSummaryResponse:
        """Calculate overall summary metrics across the provided aligned records."""
        comparable_records = [
            r for r in records if r.actualMW is not None and r.forecastMW is not None
        ]

        missing_actual_count = sum(1 for r in records if r.actualMW is None)
        missing_forecast_count = sum(1 for r in records if r.forecastMW is None)
        comparable_count = len(comparable_records)

        if comparable_count == 0:
            return MetricsSummaryResponse(
                maeMW=None,
                rmseMW=None,
                meanErrorMW=None,
                nMAEPercent=None,
                comparablePeriods=0,
                missingActualPeriods=missing_actual_count,
                missingForecastPeriods=missing_forecast_count,
            )

        errors = [r.actualMW - r.forecastMW for r in comparable_records]
        actuals = [r.actualMW for r in comparable_records]

        raw_mae = calculate_mae(errors)
        raw_rmse = calculate_rmse(errors)
        raw_bias = calculate_bias(errors)
        raw_nmae = calculate_nmae(raw_mae, actuals)

        return MetricsSummaryResponse(
            maeMW=round(raw_mae, 2) if raw_mae is not None else None,
            rmseMW=round(raw_rmse, 2) if raw_rmse is not None else None,
            meanErrorMW=round(raw_bias, 2) if raw_bias is not None else None,
            nMAEPercent=round(raw_nmae, 2) if raw_nmae is not None else None,
            comparablePeriods=comparable_count,
            missingActualPeriods=missing_actual_count,
            missingForecastPeriods=missing_forecast_count,
        )

    @staticmethod
    def calculate_hourly_distribution(records: List[SettlementPeriodRecord]) -> List[SettlementPeriodMetric]:
        """Group records by settlement period (1-48) and calculate error profile for each period."""
        # Initialize buckets for all 48 settlement periods
        sp_errors: dict[int, List[float]] = {sp: [] for sp in range(1, 49)}

        for r in records:
            if r.actualMW is not None and r.forecastMW is not None:
                sp = r.settlementPeriod
                if 1 <= sp <= 48:
                    sp_errors[sp].append(r.actualMW - r.forecastMW)

        distribution: List[SettlementPeriodMetric] = []
        for sp in range(1, 49):
            errs = sp_errors[sp]
            sample_count = len(errs)
            avg_err = round(calculate_bias(errs), 2) if sample_count > 0 else None
            mae = round(calculate_mae(errs), 2) if sample_count > 0 else None

            distribution.append(
                SettlementPeriodMetric(
                    settlementPeriod=sp,
                    averageErrorMW=avg_err,
                    maeMW=mae,
                    sampleCount=sample_count,
                )
            )

        return distribution
