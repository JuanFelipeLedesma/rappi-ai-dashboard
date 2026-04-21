"""Loads all AVAILABILITY CSVs into a single consolidated time series."""
from __future__ import annotations

import glob
import os
import re
from datetime import datetime

import numpy as np
import pandas as pd

MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

_TS_RE = re.compile(r"\w+ (\w+) (\d+) (\d+) (\d+):(\d+):(\d+)")


def _parse_ts(s: str) -> datetime | None:
    m = _TS_RE.match(s)
    if not m:
        return None
    month, day, year, h, mn, sec = m.groups()
    return datetime(int(year), MONTHS[month], int(day), int(h), int(mn), int(sec))


def load_series(data_dir: str) -> pd.Series:
    """Merge all CSVs in *data_dir* into a single deduplicated time series.

    The source files overlap at boundaries (each file covers ~1h and repeats
    the last ~20s of the previous file). We keep the first value for any
    duplicate timestamp.
    """
    files = sorted(glob.glob(os.path.join(data_dir, "*.csv")))
    if not files:
        raise FileNotFoundError(f"No CSV files found in {data_dir}")

    frames: list[pd.Series] = []
    for fp in files:
        df = pd.read_csv(fp)
        ts_cols = df.columns[4:]
        # Only one row per file, metric synthetic_monitoring_visible_stores
        row = df.iloc[0, 4:]
        parsed = [(_parse_ts(str(c)), v) for c, v in zip(ts_cols, row.values)]
        parsed = [(t, v) for t, v in parsed if t is not None]
        s = pd.Series(
            data=[float(v) if pd.notna(v) else np.nan for _, v in parsed],
            index=pd.to_datetime([t for t, _ in parsed]),
        )
        frames.append(s)

    merged = pd.concat(frames)
    merged = merged[~merged.index.duplicated(keep="first")].sort_index()
    merged.name = "visible_stores"
    merged.index.name = "timestamp"
    return merged


def get_info(series: pd.Series) -> dict:
    return {
        "metric": "synthetic_monitoring_visible_stores",
        "description": (
            "Número de tiendas visibles/disponibles en el sistema de Rappi, "
            "medido por el monitoreo sintético cada 10 segundos."
        ),
        "start": series.index.min().isoformat(),
        "end": series.index.max().isoformat(),
        "points": int(series.shape[0]),
        "min": float(series.min()),
        "max": float(series.max()),
        "mean": float(series.mean()),
        "median": float(series.median()),
        "std": float(series.std()),
    }
