"""Semantic chatbot: Claude API + tool use over the availability dataset.

The LLM never sees raw data. Instead it has a toolbox of analytics
functions and must decide which to call. Tool results come back and the
LLM synthesizes a natural language answer.
"""
from __future__ import annotations

import json
import os
from typing import Any

import pandas as pd
from anthropic import Anthropic

from . import analytics

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-7")

TOOLS = [
    {
        "name": "get_stats_for_range",
        "description": (
            "Calcula estadísticas descriptivas (min, max, media, mediana, p5, p95, "
            "timestamps de min/max) de la cantidad de tiendas visibles en un rango "
            "de tiempo. Si no se pasan fechas, usa todo el dataset."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "start": {"type": "string", "description": "ISO datetime, ej '2026-02-03T10:00:00'. Opcional."},
                "end": {"type": "string", "description": "ISO datetime. Opcional."},
            },
        },
    },
    {
        "name": "get_hourly_profile",
        "description": (
            "Retorna el promedio de tiendas por hora del día (0-23) "
            "agregado a lo largo de todos los días del dataset."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_daily_profile",
        "description": (
            "Retorna estadísticas (media, min, max, std) por día calendario, "
            "útil para comparar días entre sí."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_weekday_profile",
        "description": (
            "Retorna el promedio de tiendas por día de la semana (Lunes, Martes...)."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "find_drops",
        "description": (
            "Detecta caídas significativas en la cantidad de tiendas: momentos "
            "donde el promedio en una ventana cae más que threshold_pct respecto "
            "a la ventana anterior. Útil para encontrar incidentes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold_pct": {"type": "number", "description": "Umbral en % (ej 5). Default 5."},
                "window": {"type": "string", "description": "Ventana pandas, ej '5min', '15min'. Default '5min'."},
            },
        },
    },
    {
        "name": "get_peak_hours",
        "description": "Retorna las N horas del día con más tiendas disponibles en promedio.",
        "input_schema": {
            "type": "object",
            "properties": {"top_n": {"type": "integer", "description": "Default 5."}},
        },
    },
    {
        "name": "get_trough_hours",
        "description": "Retorna las N horas del día con menos tiendas disponibles en promedio.",
        "input_schema": {
            "type": "object",
            "properties": {"top_n": {"type": "integer", "description": "Default 5."}},
        },
    },
    {
        "name": "compare_ranges",
        "description": (
            "Compara dos rangos de tiempo y retorna la diferencia absoluta y "
            "porcentual en el promedio de tiendas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "a_start": {"type": "string"},
                "a_end": {"type": "string"},
                "b_start": {"type": "string"},
                "b_end": {"type": "string"},
            },
            "required": ["a_start", "a_end", "b_start", "b_end"],
        },
    },
]


def _run_tool(name: str, args: dict, series: pd.Series) -> Any:
    if name == "get_stats_for_range":
        return analytics.stats_for_range(series, args.get("start"), args.get("end"))
    if name == "get_hourly_profile":
        return analytics.hourly_profile(series).reset_index().to_dict(orient="records")
    if name == "get_daily_profile":
        df = analytics.daily_profile(series).reset_index()
        df["date"] = df["date"].astype(str)
        return df.to_dict(orient="records")
    if name == "get_weekday_profile":
        return analytics.weekday_profile(series).reset_index().to_dict(orient="records")
    if name == "find_drops":
        return analytics.find_drops(
            series,
            threshold_pct=args.get("threshold_pct", 5.0),
            window=args.get("window", "5min"),
        )[:20]  # cap
    if name == "get_peak_hours":
        return analytics.peak_hours(series, top_n=args.get("top_n", 5))
    if name == "get_trough_hours":
        return analytics.trough_hours(series, top_n=args.get("top_n", 5))
    if name == "compare_ranges":
        return analytics.compare_ranges(
            series, args["a_start"], args["a_end"], args["b_start"], args["b_end"]
        )
    return {"error": f"unknown tool {name}"}


def _system_prompt(info: dict) -> str:
    return f"""Eres un asistente analítico para el equipo de operaciones de Rappi.

Tu trabajo: responder preguntas sobre una serie temporal de disponibilidad
de tiendas usando las herramientas disponibles. NUNCA inventes cifras; si
no tienes el dato, llama una herramienta.

Dataset actual:
- Métrica: {info['metric']}
- Descripción: {info['description']}
- Rango: {info['start']} → {info['end']}
- Puntos: {info['points']} (cada 10 segundos)
- Tiendas promedio: {info['mean']:.0f}
- Rango min/max: {info['min']:.0f} – {info['max']:.0f}

Responde en español, breve y directo. Incluye cifras concretas.
Si la pregunta es ambigua, elige la interpretación más útil y responde."""


class Chatbot:
    def __init__(self, series: pd.Series, info: dict):
        self.series = series
        self.info = info
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.client = Anthropic(api_key=api_key) if api_key else None

    def available(self) -> bool:
        return self.client is not None

    def answer(self, history: list[dict], user_message: str) -> dict:
        """Run an agentic loop: model -> tools -> model -> ... -> final answer."""
        if not self.client:
            return {
                "reply": (
                    "Chatbot no disponible: falta ANTHROPIC_API_KEY. "
                    "Configúrala en .env para habilitar el asistente."
                ),
                "tool_calls": [],
            }

        messages = list(history) + [{"role": "user", "content": user_message}]
        system = _system_prompt(self.info)
        tool_calls: list[dict] = []

        for _ in range(6):  # max 6 rounds of tool use
            resp = self.client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=system,
                tools=TOOLS,
                messages=messages,
            )

            if resp.stop_reason == "tool_use":
                tool_uses = [b for b in resp.content if b.type == "tool_use"]
                messages.append({"role": "assistant", "content": resp.content})
                tool_results = []
                for tu in tool_uses:
                    result = _run_tool(tu.name, tu.input or {}, self.series)
                    tool_calls.append({"name": tu.name, "input": tu.input, "result_preview": str(result)[:200]})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tu.id,
                        "content": json.dumps(result, default=str),
                    })
                messages.append({"role": "user", "content": tool_results})
                continue

            # final answer
            text = "".join(b.text for b in resp.content if b.type == "text")
            return {"reply": text.strip(), "tool_calls": tool_calls}

        return {"reply": "No pude producir una respuesta en los pasos permitidos.", "tool_calls": tool_calls}
