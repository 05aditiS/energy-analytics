"""FastAPI Application for UK National Wind Generation Day-Ahead Analysis."""

import re
from datetime import date
from typing import List

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from app.config import ANALYSIS_MONTH, ANALYSIS_YEAR
from app.database import init_db
from app.schemas import (
    DataQualityReport,
    DayAheadResponse,
    MetricsSummaryResponse,
    SettlementPeriodMetric,
)
from app.services.alignment import AlignmentService
from app.services.metrics import MetricsService


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Lifespan context manager to ensure database is initialized on startup."""
    init_db()
    yield


app = FastAPI(
    title="UK Wind Energy Analytics API",
    description="Day-ahead wind generation forecast and actuals analysis API for January 2026.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS to allow future React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

aligner = AlignmentService()


@app.get("/", tags=["Health"])
def root_endpoint():
    """Root health check and welcome endpoint."""
    return {
        "status": "healthy",
        "service": "UK Wind Energy Analytics API",
        "version": "1.0.0",
        "analysis_period": f"{ANALYSIS_YEAR}-{ANALYSIS_MONTH:02d}",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """Service health check."""
    return {"status": "ok"}


@app.get(
    "/api/dates",
    response_model=List[str],
    tags=["Analysis"],
    summary="List available January 2026 delivery dates",
)
def get_available_dates():
    """Return all January 2026 delivery dates in ascending order (YYYY-MM-DD)."""
    return aligner.get_available_dates()


@app.get(
    "/api/day-ahead",
    response_model=DayAheadResponse,
    tags=["Analysis"],
    summary="Get 48 settlement periods for a delivery date",
)
def get_day_ahead(
    date_str: str = Query(..., alias="date", description="Delivery date (YYYY-MM-DD)")
):
    """Return exactly 48 chronological settlement periods for the specified January 2026 date.
    
    Each period contains actual generation, day-ahead forecast (published <= D-1 11:00 UTC),
    the generation difference (actual - forecast), and the forecast publication timestamp.
    """
    # 1. Format validation
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD.",
        )

    # 2. Scope validation (January 2026 only)
    try:
        d = date.fromisoformat(date_str)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid calendar date: {e}",
        )

    if d.year != ANALYSIS_YEAR or d.month != ANALYSIS_MONTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date '{date_str}' is outside the analysis period ({ANALYSIS_YEAR}-{ANALYSIS_MONTH:02d}).",
        )

    periods = aligner.get_day_ahead_periods(d)
    return DayAheadResponse(date=date_str, settlementPeriods=periods)


@app.get(
    "/api/metrics/summary",
    response_model=MetricsSummaryResponse,
    tags=["Metrics"],
    summary="Overall January 2026 day-ahead forecast accuracy metrics",
)
def get_metrics_summary():
    """Calculate aggregate forecast accuracy metrics across January 2026:
    
    - MAE: Mean Absolute Error (MW)
    - RMSE: Root Mean Squared Error (MW)
    - Mean Error / Directional Bias: Mean(actual - forecast) (MW)
    - nMAE: Normalized MAE (% of mean actual generation)
    - Sample counts for comparable and missing periods
    """
    records = aligner.get_all_aligned_periods(ANALYSIS_YEAR, ANALYSIS_MONTH)
    return MetricsService.calculate_summary_metrics(records)


@app.get(
    "/api/metrics/hourly",
    response_model=List[SettlementPeriodMetric],
    tags=["Metrics"],
    summary="Settlement period (1-48) error distribution",
)
def get_hourly_metrics():
    """Calculate error metrics grouped by settlement period (1 to 48, half-hourly intervals)."""
    records = aligner.get_all_aligned_periods(ANALYSIS_YEAR, ANALYSIS_MONTH)
    return MetricsService.calculate_hourly_distribution(records)


@app.get(
    "/api/data-quality",
    response_model=DataQualityReport,
    tags=["Quality"],
    summary="January 2026 data quality and alignment report",
)
def get_data_quality():
    """Return pipeline data quality statistics: record counts, missing periods, duplicates."""
    return aligner.get_data_quality_report()
