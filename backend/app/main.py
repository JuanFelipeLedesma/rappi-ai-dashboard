"""FastAPI app: serves analytics endpoints and the chatbot."""
from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import analytics
from .chatbot import Chatbot
from .data_loader import get_info, load_series

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")

app = FastAPI(title="Rappi Availability Dashboard API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    app.state.series = load_series(DATA_DIR)
    app.state.info = get_info(app.state.series)
    app.state.chatbot = Chatbot(app.state.series, app.state.info)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "chatbot_enabled": app.state.chatbot.available()}


@app.get("/api/info")
def info() -> dict:
    return app.state.info


@app.get("/api/stats")
def stats(start: Optional[str] = None, end: Optional[str] = None) -> dict:
    return analytics.stats_for_range(app.state.series, start, end)


@app.get("/api/timeseries")
def timeseries(freq: str = "5min", start: Optional[str] = None,
               end: Optional[str] = None) -> dict:
    s = analytics.resample(app.state.series, freq=freq, start=start, end=end)
    return {
        "freq": freq,
        "points": [
            {"t": t.isoformat(), "v": round(float(v), 1)}
            for t, v in s.items()
        ],
    }


@app.get("/api/hourly")
def hourly() -> list[dict]:
    df = analytics.hourly_profile(app.state.series).reset_index()
    return df.to_dict(orient="records")


@app.get("/api/daily")
def daily() -> list[dict]:
    df = analytics.daily_profile(app.state.series).reset_index()
    df["date"] = df["date"].astype(str)
    return df.to_dict(orient="records")


@app.get("/api/weekday")
def weekday() -> list[dict]:
    df = analytics.weekday_profile(app.state.series).reset_index()
    return df.to_dict(orient="records")


@app.get("/api/heatmap")
def heatmap() -> dict:
    df = analytics.hour_weekday_heatmap(app.state.series)
    return {
        "weekdays": list(df.index),
        "hours": [int(h) for h in df.columns],
        "values": df.fillna(0).values.tolist(),
    }


@app.get("/api/drops")
def drops(threshold_pct: float = 3.0, window: str = "5min") -> list[dict]:
    return analytics.find_drops(app.state.series, threshold_pct=threshold_pct, window=window)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.post("/api/chat")
def chat(req: ChatRequest) -> dict:
    if not req.message.strip():
        raise HTTPException(400, "empty message")
    return app.state.chatbot.answer(req.history, req.message)
