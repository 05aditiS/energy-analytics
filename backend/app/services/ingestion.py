"""Data ingestion pipeline for Elexon FUELHH (actuals) and WINDFOR (forecasts)."""

import json
import logging
import math
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app.config import ANALYSIS_MONTH, ANALYSIS_YEAR, DB_PATH, RAW_DATA_DIR
from app.database import get_db_connection, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class IngestionStats:
    """Summary statistics for data ingestion."""
    raw_files_scanned: int = 0
    actual_files_processed: int = 0
    forecast_files_processed: int = 0
    actual_records_raw: int = 0
    actual_records_january: int = 0
    actual_records_outside_january: int = 0
    actual_duplicates_removed: int = 0
    actual_records_stored: int = 0
    actual_malformed_skipped: int = 0
    forecast_records_raw: int = 0
    forecast_records_january: int = 0
    forecast_records_outside_january: int = 0
    forecast_duplicates_removed: int = 0
    forecast_records_stored: int = 0
    forecast_malformed_skipped: int = 0


def parse_and_normalize_utc(ts: Union[str, datetime]) -> datetime:
    """Parse a timestamp string or datetime and normalize to timezone-aware UTC datetime.
    
    Handles:
    - ISO 8601 strings with 'Z' suffix (e.g. '2026-01-01T00:00:00Z')
    - ISO 8601 strings with offset (e.g. '+00:00')
    - Naive datetime strings (treated as UTC per Elexon BMRS standard)
    """
    if isinstance(ts, datetime):
        dt = ts
    else:
        clean_ts = str(ts).strip()
        if clean_ts.endswith("Z"):
            clean_ts = clean_ts[:-1] + "+00:00"
        dt = datetime.fromisoformat(clean_ts)
        
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def format_utc_iso(dt: datetime) -> str:
    """Format datetime as canonical ISO 8601 UTC string: YYYY-MM-DDTHH:MM:SSZ."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_generation(val: Any) -> Optional[float]:
    """Normalize numeric generation value to float MW, returning None if invalid."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def is_in_january_2026(dt: datetime, year: int = ANALYSIS_YEAR, month: int = ANALYSIS_MONTH) -> bool:
    """Check if delivery start time falls within the January 2026 analysis period."""
    return dt.year == year and dt.month == month


class IngestionService:
    """Service to ingest raw Elexon FUELHH and WINDFOR files into SQLite."""

    def __init__(self, raw_data_dir: Optional[Path | str] = None, db_path: Optional[Path | str] = None):
        self.raw_data_dir = Path(raw_data_dir) if raw_data_dir else RAW_DATA_DIR
        self.db_path = Path(db_path) if db_path else DB_PATH

    def discover_files(self) -> Tuple[List[Path], List[Path]]:
        """Discover and classify JSON files in the raw data directory.
        
        Files are sorted alphabetically to ensure strictly deterministic ingestion order.
        """
        if not self.raw_data_dir.exists():
            raise FileNotFoundError(f"Raw data directory does not exist: {self.raw_data_dir}")

        json_files = sorted(self.raw_data_dir.glob("*.json"))
        actual_files: List[Path] = []
        forecast_files: List[Path] = []

        for f in json_files:
            # Inspection revealed forecast files contain 'wind' in name,
            # or contain WINDFOR dataset directly in the file.
            name_lower = f.name.lower()
            if "wind" in name_lower:
                forecast_files.append(f)
            else:
                actual_files.append(f)

        return actual_files, forecast_files

    def parse_actual_file(self, file_path: Path) -> Tuple[List[Dict[str, Any]], int]:
        """Parse an actual FUELHH JSON file.
        
        Filters for fuelType == 'WIND', normalizes timestamps and generation values.
        Returns parsed records and malformed record count.
        """
        records: List[Dict[str, Any]] = []
        malformed_count = 0

        with open(file_path, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        raw_list = data.get("data", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])

        for item in raw_list:
            # Keep only records where fuelType == "WIND"
            if item.get("fuelType") != "WIND":
                continue

            try:
                raw_start = item.get("startTime")
                if not raw_start:
                    malformed_count += 1
                    continue
                dt_start = parse_and_normalize_utc(raw_start)
                start_iso = format_utc_iso(dt_start)

                gen = normalize_generation(item.get("generation"))
                if gen is None:
                    malformed_count += 1
                    continue

                records.append({
                    "start_time": start_iso,
                    "dt_start": dt_start,
                    "generation_mw": gen,
                    "source_file": file_path.name
                })
            except Exception as e:
                logger.warning(f"Skipping malformed FUELHH record in {file_path.name}: {e}")
                malformed_count += 1

        return records, malformed_count

    def parse_forecast_file(self, file_path: Path) -> Tuple[List[Dict[str, Any]], int]:
        """Parse a WINDFOR JSON file.
        
        Preserves startTime, publishTime, and generation in MW.
        Returns parsed records and malformed record count.
        """
        records: List[Dict[str, Any]] = []
        malformed_count = 0

        with open(file_path, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        raw_list = data if isinstance(data, list) else (data.get("data", []) if isinstance(data, dict) else [])

        for item in raw_list:
            try:
                raw_start = item.get("startTime")
                raw_pub = item.get("publishTime")
                if not raw_start or not raw_pub:
                    malformed_count += 1
                    continue

                dt_start = parse_and_normalize_utc(raw_start)
                dt_pub = parse_and_normalize_utc(raw_pub)

                start_iso = format_utc_iso(dt_start)
                pub_iso = format_utc_iso(dt_pub)

                gen = normalize_generation(item.get("generation"))
                if gen is None:
                    malformed_count += 1
                    continue

                records.append({
                    "start_time": start_iso,
                    "publish_time": pub_iso,
                    "dt_start": dt_start,
                    "dt_pub": dt_pub,
                    "generation_mw": gen,
                    "source_file": file_path.name
                })
            except Exception as e:
                logger.warning(f"Skipping malformed WINDFOR record in {file_path.name}: {e}")
                malformed_count += 1

        return records, malformed_count

    def run_ingestion(self) -> IngestionStats:
        """Execute deterministic ingestion pipeline from raw files to SQLite.
        
        Deduplication rule:
        - Files are processed in alphabetical order.
        - For identical unique keys (start_time for actuals, start_time + publish_time for forecasts),
          the first valid record encountered is preserved, and duplicate records are logged and discarded.
        """
        init_db(self.db_path)
        actual_files, forecast_files = self.discover_files()

        stats = IngestionStats(
            raw_files_scanned=len(actual_files) + len(forecast_files),
            actual_files_processed=len(actual_files),
            forecast_files_processed=len(forecast_files),
        )

        # 1. Process Actuals
        dedup_actuals: Dict[str, Dict[str, Any]] = {}
        for af in actual_files:
            recs, malformed = self.parse_actual_file(af)
            stats.actual_malformed_skipped += malformed
            for r in recs:
                stats.actual_records_raw += 1
                if is_in_january_2026(r["dt_start"]):
                    stats.actual_records_january += 1
                    key = r["start_time"]
                    if key in dedup_actuals:
                        stats.actual_duplicates_removed += 1
                    else:
                        dedup_actuals[key] = r
                else:
                    stats.actual_records_outside_january += 1

        # 2. Process Forecasts
        dedup_forecasts: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for ff in forecast_files:
            recs, malformed = self.parse_forecast_file(ff)
            stats.forecast_malformed_skipped += malformed
            for r in recs:
                stats.forecast_records_raw += 1
                if is_in_january_2026(r["dt_start"]):
                    stats.forecast_records_january += 1
                    key = (r["start_time"], r["publish_time"])
                    if key in dedup_forecasts:
                        stats.forecast_duplicates_removed += 1
                    else:
                        dedup_forecasts[key] = r
                else:
                    stats.forecast_records_outside_january += 1

        # 3. Store into SQLite atomically
        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            # Clean existing tables for deterministic idempotent reload
            cursor.execute("DELETE FROM actual_wind")
            cursor.execute("DELETE FROM wind_forecasts")

            actual_rows = [
                (r["start_time"], r["generation_mw"], r["source_file"])
                for r in dedup_actuals.values()
            ]
            cursor.executemany(
                "INSERT INTO actual_wind (start_time, generation_mw, source_file) VALUES (?, ?, ?)",
                actual_rows
            )
            stats.actual_records_stored = len(actual_rows)

            forecast_rows = [
                (r["start_time"], r["publish_time"], r["generation_mw"], r["source_file"])
                for r in dedup_forecasts.values()
            ]
            cursor.executemany(
                "INSERT INTO wind_forecasts (start_time, publish_time, generation_mw, source_file) VALUES (?, ?, ?, ?)",
                forecast_rows
            )
            stats.forecast_records_stored = len(forecast_rows)
            conn.commit()

        logger.info(
            f"Ingestion complete: stored {stats.actual_records_stored} actuals, "
            f"{stats.forecast_records_stored} forecasts into {self.db_path}"
        )
        return stats


def print_data_quality_report(stats: IngestionStats, db_path: Optional[Path | str] = None) -> None:
    """Print comprehensive January 2026 Data Quality Report with sample aligned records."""
    from app.services.alignment import AlignmentService

    aligner = AlignmentService(db_path=db_path)
    report = aligner.get_data_quality_report(stats)

    print("\n" + "=" * 55)
    print("January 2026 Data Quality Report")
    print("=" * 55)
    print(f"Expected delivery periods:        {report.expectedDeliveryPeriods}")
    print(f"Actual wind records:              {report.actualRecords}")
    print(f"Forecast records loaded:          {report.forecastRecordsLoaded}")
    print(f"Aligned periods:                  {report.alignedPeriods}")
    print(f"Missing actuals:                  {report.missingActuals}")
    print(f"Missing eligible forecasts:       {report.missingEligibleForecasts}")
    print(f"Duplicate actual records removed: {report.duplicateActualsRemoved}")
    print(f"Duplicate forecast removed:       {report.duplicateForecastsRemoved}")
    print("=" * 55)

    print("\nSample Aligned Records (January 15, 2026):")
    print("-" * 85)
    sample_day = aligner.get_day_ahead_periods("2026-01-15")
    for record in sample_day[:6]:
        act = f"{record.actualMW:8.1f} MW" if record.actualMW is not None else "     None"
        fc = f"{record.forecastMW:8.1f} MW" if record.forecastMW is not None else "     None"
        diff = f"{record.differenceMW:8.1f} MW" if record.differenceMW is not None else "     None"
        pub = record.forecastPublishTime or "None"
        print(f"SP{record.settlementPeriod:02d} | {record.startTime} | Act: {act} | Fcast: {fc} | Diff: {diff} | Pub: {pub}")
    print("-" * 85 + "\n")


if __name__ == "__main__":
    service = IngestionService()
    stats = service.run_ingestion()
    print_data_quality_report(stats)
