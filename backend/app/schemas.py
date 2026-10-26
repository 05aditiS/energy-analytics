"""Pydantic schemas for API request validation and response serialization."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SettlementPeriodRecord(BaseModel):
    """Wind actual and aligned day-ahead forecast for a single settlement period."""
    settlementPeriod: int = Field(..., ge=1, le=48, description="Settlement period number (1-48)")
    startTime: str = Field(..., description="Target 30-minute delivery period start time in ISO 8601 UTC")
    actualMW: Optional[float] = Field(None, description="Actual wind generation in MW")
    forecastMW: Optional[float] = Field(None, description="Day-ahead forecast wind generation in MW")
    differenceMW: Optional[float] = Field(None, description="Actual minus forecast wind generation (MW)")
    forecastPublishTime: Optional[str] = Field(None, description="Publication timestamp of the selected day-ahead forecast")


class DayAheadResponse(BaseModel):
    """Response containing 48 settlement periods for a requested delivery date."""
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Delivery date (YYYY-MM-DD)")
    settlementPeriods: List[SettlementPeriodRecord] = Field(..., description="Chronological settlement periods")


class MetricsSummaryResponse(BaseModel):
    """Summary accuracy metrics for January 2026 day-ahead wind forecasts."""
    maeMW: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    rmseMW: Optional[float] = Field(None, description="Root Mean Squared Error in MW")
    meanErrorMW: Optional[float] = Field(None, description="Mean Error / Directional Bias in MW (actual - forecast)")
    nMAEPercent: Optional[float] = Field(None, description="Normalized MAE as percentage of mean actual generation")
    comparablePeriods: int = Field(..., description="Count of periods where both actual and forecast are present")
    missingActualPeriods: int = Field(..., description="Count of periods missing actual generation")
    missingForecastPeriods: int = Field(..., description="Count of periods missing eligible day-ahead forecast")


class SettlementPeriodMetric(BaseModel):
    """Error metrics for an individual settlement period (1-48)."""
    settlementPeriod: int = Field(..., ge=1, le=48, description="Settlement period number (1-48)")
    averageErrorMW: Optional[float] = Field(None, description="Average directional error in MW (actual - forecast)")
    maeMW: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    sampleCount: int = Field(..., description="Number of comparable samples for this settlement period")


class DataQualityReport(BaseModel):
    """Comprehensive January 2026 data quality and alignment report."""
    expectedDeliveryPeriods: int
    actualRecords: int
    forecastRecordsLoaded: int
    alignedPeriods: int
    missingActuals: int
    missingEligibleForecasts: int
    duplicateActualsRemoved: int
    duplicateForecastsRemoved: int
