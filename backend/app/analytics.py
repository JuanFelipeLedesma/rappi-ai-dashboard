"""Analytics on the consolidated time series.

These functions are the building blocks that power both the dashboard
endpoints and the chatbot's tool use.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd


def _slice(series: pd.Series, start: Optional[str], end: Optional[str]) -> pd.Series:
    s = series
    if start:
        s = s[s.index >= pd.to_datetime(start)]
    if end:
        s = s[s.index <= pd.to_datetime(end)]
    return s


def stats_for_range(series: pd.Series, start: Optional[str] = None,
                    end: Optional[str] = None) -> dict:
    s = _slice(series, start, end)
    if s.empty:
        return {"error": "no data in range"}
    return {
        "start": s.index.min().isoformat(),
        "end": s.index.max().isoformat(),
        "points": int(s.shape[0]),
        "min": float(s.min()),
        "max": float(s.max()),
        "mean": round(float(s.mean()), 2),
        "median": float(s.median()),
        "std": round(float(s.std()), 2),
        "p5": float(np.percentile(s, 5)),
        "p95": float(np.percentile(s, 95)),
        "min_at": s.idxmin().isoformat(),
        "max_at": s.idxmax().isoformat(),
    }


def resample(series: pd.Series, freq: str = "5min",
             start: Optional[str] = None, end: Optional[str] = None) -> pd.Series:
    """Downsample to a chart-friendly frequency.

    freq examples: '10s', '1min', '5min', '15min', '1H', '1D'
    """
    s = _slice(series, start, end)
    return s.resample(freq).mean().dropna()


def hourly_profile(series: pd.Series) -> pd.DataFrame:
    """Mean stores by hour-of-day across the whole dataset."""
    df = series.to_frame("v")
    df["hour"] = df.index.hour
    return df.groupby("hour")["v"].agg(["mean", "min", "max"]).round(1)


def daily_profile(series: pd.Series) -> pd.DataFrame:
    df = series.to_frame("v")
    df["date"] = df.index.date
    g = df.groupby("date")["v"]
    out = g.agg(["mean", "min", "max", "std"]).round(1)
    out["points"] = g.size()
    return out


def weekday_profile(series: pd.Series) -> pd.DataFrame:
    df = series.to_frame("v")
    df["weekday"] = df.index.day_name()
    return df.groupby("weekday")["v"].agg(["mean", "min", "max"]).round(1)


def hour_weekday_heatmap(series: pd.Series) -> pd.DataFrame:
    df = series.to_frame("v")
    df["hour"] = df.index.hour
    df["weekday"] = df.index.day_name()
    return df.pivot_table(index="weekday", columns="hour", values="v", aggfunc="mean").round(0)


def find_drops(series: pd.Series, threshold_pct: float = 5.0, window: str = "5min") -> list[dict]:
    """Find significant drops: windows where mean falls > threshold_pct vs previous window."""
    rolled = series.resample(window).mean().dropna()
    pct = rolled.pct_change() * 100
    drops = pct[pct < -threshold_pct]
    out = []
    for ts, d in drops.items():
        out.append({
            "timestamp": ts.isoformat(),
            "drop_pct": round(float(d), 2),
            "value": round(float(rolled.loc[ts]), 0),
            "prev_value": round(float(rolled.shift(1).loc[ts]), 0),
        })
    return out


def peak_hours(series: pd.Series, top_n: int = 5) -> list[dict]:
    prof = hourly_profile(series).sort_values("mean", ascending=False).head(top_n)
    return [{"hour": int(h), "mean": float(v)} for h, v in prof["mean"].items()]


def trough_hours(series: pd.Series, top_n: int = 5) -> list[dict]:
    prof = hourly_profile(series).sort_values("mean", ascending=True).head(top_n)
    return [{"hour": int(h), "mean": float(v)} for h, v in prof["mean"].items()]


def compare_ranges(series: pd.Series, a_start: str, a_end: str,
                   b_start: str, b_end: str) -> dict:
    a = _slice(series, a_start, a_end)
    b = _slice(series, b_start, b_end)
    if a.empty or b.empty:
        return {"error": "one or both ranges are empty"}
    am, bm = float(a.mean()), float(b.mean())
    return {
        "a": {"start": a_start, "end": a_end, "mean": round(am, 2), "points": int(a.shape[0])},
        "b": {"start": b_start, "end": b_end, "mean": round(bm, 2), "points": int(b.shape[0])},
        "abs_diff": round(bm - am, 2),
        "pct_diff": round((bm - am) / am * 100, 2) if am else None,
    }
