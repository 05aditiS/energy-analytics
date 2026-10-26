"""Day-Ahead Temporal Alignment Service for UK Wind Generation Analysis.

Business Logic:
For every 30-minute delivery period on delivery date D:
- Day-ahead market decision cutoff: D-1 at 11:00:00 UTC
- Candidate forecasts must have: publishTime <= cutoff
- If multiple eligible forecasts exist, the one with the latest publishTime is selected
- Forecasts published after cutoff (even by 1 second, e.g. 11:00:01Z) MUST NOT be selected
- Joins with actual generation for the same delivery startTime: differenceMW = actualMW - forecastMW
- Preserves forecastPublishTime
- Missing actual or forecast is retained with None (no data fabrication)
"""

from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app.config import ANALYSIS_MONTH, ANALYSIS_YEAR, CUTOFF_HOUR_UTC, DB_PATH
from app.database import get_db_connection, init_db
from app.schemas import DataQualityReport, SettlementPeriodRecord


def compute_day_ahead_cutoff(delivery_time: Union[str, datetime, date]) -> str:
    """Compute the D-1 11:00:00 UTC day-ahead market decision cutoff timestamp.
    
    For any delivery period occurring on calendar day D, the cutoff is:
    (D - 1 day) at 11:00:00 UTC.
    
    Example:
    Delivery date: 2026-01-15 (any period between 00:00 and 23:30)
    Cutoff:        2026-01-14T11:00:00Z
    """
    if isinstance(delivery_time, str):
        # Format can be 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SSZ'
        clean_str = delivery_time.strip()
        if "T" in clean_str:
            d = datetime.fromisoformat(clean_str.replace("Z", "+00:00")).date()
        else:
            d = date.fromisoformat(clean_str)
    elif isinstance(delivery_time, datetime):
        d = delivery_time.date()
    elif isinstance(delivery_time, date):
        d = delivery_time
    else:
        raise ValueError(f"Unsupported delivery time type: {type(delivery_time)}")

    cutoff_date = d - timedelta(days=1)
    cutoff_dt = datetime.combine(cutoff_date, time(hour=CUTOFF_HOUR_UTC, minute=0, second=0, tzinfo=timezone.utc))
    return cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def get_settlement_period_number(delivery_time: Union[str, datetime]) -> int:
    """Derive settlement period number (1 to 48) from 30-minute delivery period start time.
    
    SP1:  00:00 UTC
    SP2:  00:30 UTC
    ...
    SP48: 23:30 UTC
    """
    if isinstance(delivery_time, str):
        clean_str = delivery_time.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
    else:
        dt = delivery_time

    # Calculate 1-indexed 30-minute interval
    sp = (dt.hour * 60 + dt.minute) // 30 + 1
    if not (1 <= sp <= 48):
        raise ValueError(f"Invalid settlement period {sp} derived from {delivery_time}")
    return sp


def get_settlement_period_start_time(delivery_date: Union[str, date], sp: int) -> str:
    """Get UTC start time ISO string for a given date and settlement period (1-48)."""
    if not (1 <= sp <= 48):
        raise ValueError(f"Settlement period must be between 1 and 48, got {sp}")
    
    d_str = str(delivery_date) if isinstance(delivery_date, date) else delivery_date.strip()
    total_minutes = (sp - 1) * 30
    hour = total_minutes // 60
    minute = total_minutes % 60
    return f"{d_str}T{hour:02d}:{minute:02d}:00Z"


class AlignmentService:
    """Service to execute temporal alignment between actual wind and day-ahead forecasts."""

    def __init__(self, db_path: Optional[Path | str] = None):
        self.db_path = Path(db_path) if db_path else DB_PATH
        init_db(self.db_path)

    def get_day_ahead_periods(self, delivery_date: Union[str, date]) -> List[SettlementPeriodRecord]:
        """Align all 48 settlement periods for a single calendar day D.
        
        Applies cutoff: D-1 at 11:00:00 UTC.
        Selects latest forecast where publish_time <= cutoff.
        Returns exactly 48 SettlementPeriodRecord instances sorted by settlementPeriod.
        """
        d_str = str(delivery_date) if isinstance(delivery_date, date) else delivery_date.strip()
        cutoff_str = compute_day_ahead_cutoff(d_str)

        start_day_iso = f"{d_str}T00:00:00Z"
        # Calculate day bounds
        d_obj = date.fromisoformat(d_str)
        next_day_obj = d_obj + timedelta(days=1)
        next_day_iso = f"{next_day_obj.isoformat()}T00:00:00Z"

        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()

            # 1. Fetch actuals for the delivery day
            cursor.execute(
                """
                SELECT start_time, generation_mw
                FROM actual_wind
                WHERE start_time >= ? AND start_time < ?
                """,
                (start_day_iso, next_day_iso),
            )
            actuals_map: Dict[str, float] = {row["start_time"]: row["generation_mw"] for row in cursor.fetchall()}

            # 2. Fetch eligible forecasts using window function to select latest publish_time <= cutoff
            cursor.execute(
                """
                WITH eligible AS (
                    SELECT 
                        start_time,
                        publish_time,
                        generation_mw,
                        ROW_NUMBER() OVER (
                            PARTITION BY start_time 
                            ORDER BY publish_time DESC, id DESC
                        ) as rn
                    FROM wind_forecasts
                    WHERE start_time >= ? 
                      AND start_time < ? 
                      AND publish_time <= ?
                )
                SELECT start_time, publish_time, generation_mw
                FROM eligible
                WHERE rn = 1
                """,
                (start_day_iso, next_day_iso, cutoff_str),
            )
            forecasts_map: Dict[str, Tuple[str, float]] = {
                row["start_time"]: (row["publish_time"], row["generation_mw"]) for row in cursor.fetchall()
            }

        # 3. Assemble exactly 48 settlement periods in chronological order
        records: List[SettlementPeriodRecord] = []
        for sp in range(1, 49):
            st_iso = get_settlement_period_start_time(d_str, sp)
            actual_mw = actuals_map.get(st_iso)
            
            fc_data = forecasts_map.get(st_iso)
            fc_pub_time: Optional[str] = None
            fc_mw: Optional[float] = None
            if fc_data:
                fc_pub_time, fc_mw = fc_data

            diff_mw: Optional[float] = None
            if actual_mw is not None and fc_mw is not None:
                diff_mw = round(actual_mw - fc_mw, 4)

            records.append(
                SettlementPeriodRecord(
                    settlementPeriod=sp,
                    startTime=st_iso,
                    actualMW=round(actual_mw, 4) if actual_mw is not None else None,
                    forecastMW=round(fc_mw, 4) if fc_mw is not None else None,
                    differenceMW=diff_mw,
                    forecastPublishTime=fc_pub_time,
                )
            )

        return records

    def get_all_aligned_periods(self, year: int = ANALYSIS_YEAR, month: int = ANALYSIS_MONTH) -> List[SettlementPeriodRecord]:
        """Align all settlement periods across the entire analysis month (Jan 2026 = 1488 periods)."""
        import calendar
        num_days = calendar.monthrange(year, month)[1]

        all_records: List[SettlementPeriodRecord] = []
        for d in range(1, num_days + 1):
            date_str = f"{year:04d}-{month:02d}-{d:02d}"
            all_records.extend(self.get_day_ahead_periods(date_str))

        return all_records

    def get_available_dates(self) -> List[str]:
        """Return all January 2026 calendar dates (YYYY-MM-DD) in ascending order."""
        import calendar
        num_days = calendar.monthrange(ANALYSIS_YEAR, ANALYSIS_MONTH)[1]
        return [f"{ANALYSIS_YEAR:04d}-{ANALYSIS_MONTH:02d}-{d:02d}" for d in range(1, num_days + 1)]

    def get_data_quality_report(self, stats: Optional[Any] = None) -> DataQualityReport:
        """Calculate comprehensive data quality statistics for January 2026."""
        all_aligned = self.get_all_aligned_periods(ANALYSIS_YEAR, ANALYSIS_MONTH)

        expected_count = len(all_aligned)  # 31 * 48 = 1488
        aligned_count = expected_count

        missing_actuals = sum(1 for r in all_aligned if r.actualMW is None)
        missing_forecasts = sum(1 for r in all_aligned if r.forecastMW is None)

        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM actual_wind WHERE start_time >= '2026-01-01T00:00:00Z' AND start_time < '2026-02-01T00:00:00Z'"
            )
            actual_count = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM wind_forecasts WHERE start_time >= '2026-01-01T00:00:00Z' AND start_time < '2026-02-01T00:00:00Z'"
            )
            forecast_count = cursor.fetchone()[0]

        dup_actuals = getattr(stats, "actual_duplicates_removed", 0) if stats else 0
        dup_forecasts = getattr(stats, "forecast_duplicates_removed", 0) if stats else 0

        return DataQualityReport(
            expectedDeliveryPeriods=expected_count,
            actualRecords=actual_count,
            forecastRecordsLoaded=forecast_count,
            alignedPeriods=aligned_count,
            missingActuals=missing_actuals,
            missingEligibleForecasts=missing_forecasts,
            duplicateActualsRemoved=dup_actuals,
            duplicateForecastsRemoved=dup_forecasts,
        )
