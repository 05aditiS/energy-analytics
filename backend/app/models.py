"""Internal data models for actual generation, forecasts, and aligned records."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ActualWindRecord:
    start_time: str
    generation_mw: float
    source_file: Optional[str] = None
    id: Optional[int] = None


@dataclass
class WindForecastRecord:
    start_time: str
    publish_time: str
    generation_mw: float
    source_file: Optional[str] = None
    id: Optional[int] = None


@dataclass
class AlignedPeriod:
    settlement_period: int
    start_time: str
    actual_mw: Optional[float]
    forecast_mw: Optional[float]
    difference_mw: Optional[float]
    forecast_publish_time: Optional[str]
