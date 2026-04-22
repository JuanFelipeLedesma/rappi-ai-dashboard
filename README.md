# Rappi · AI-Powered Availability Dashboard

Dashboard de disponibilidad de tiendas + chatbot semántico sobre los datos.
Todo corre con **un solo comando**: `docker compose up`.

![stack](https://img.shields.io/badge/stack-FastAPI_+_Next.js_+_Claude-FF441F)

## 🎥 Demo en video (10 min)

**[▶ Ver demo en YouTube](https://youtu.be/yX3YcnpyEiA)** — presentación completa: entendimiento del problema, de los datos, arquitectura, decisión Tool Use vs RAG, dashboard y chatbot en vivo.

---

## Cómo correrlo

1. (Opcional, pero recomendado) copia `.env.example` a `.env` y pon tu `ANTHROPIC_API_KEY` para activar el chatbot:
   ```bash
   cp .env.example .env
   # edita .env con tu key
   ```
2. Levanta todo:
   ```bash
   docker compose up --build
   ```
3. Abre **http://localhost:3000**.

Sin `ANTHROPIC_API_KEY` el dashboard funciona igual; solo el chatbot aparece deshabilitado con un mensaje explicativo.

---

## Qué construí

- **Dashboard de visualización** (Next.js 14 + React + Tailwind + Recharts)
  - 5 KPI cards (promedio, máx, mín, P95, desviación) con timestamps.
  - Serie temporal con brush para zoom y 6 frecuencias de agregación (10s → 1d).
  - Filtro por rango de fecha/hora que repropaga a KPIs y chart.
  - Barras de promedio por hora del día (curva de demanda).
  - Heatmap día de la semana × hora.
  - Tabla de caídas detectadas con umbral configurable.

- **Chatbot semántico** flotante (esquina inferior derecha)
  - Claude con **tool use** sobre un toolbox de 8 herramientas analíticas.
  - Pregunta ejemplo: *"¿Cuál fue la hora con menos tiendas? ¿Hubo caídas mayores a 10%?"*
  - Muestra qué tools se llamaron (UI transparente).

---

## El uso de AI — decisiones y por qué

### El problema con RAG + series temporales
Un chatbot que "chatee con datos" normalmente se hace con embeddings. Para
series temporales numéricas **eso no funciona**: un embedding no te dice el
promedio, no sabe detectar caídas, no compara rangos. Vectorizar 67k puntos
sería caro y no respondería preguntas cuantitativas.

### La solución: Tool Use
Le di a Claude (Anthropic) una API de 8 funciones analíticas (ver
[`backend/app/chatbot.py`](backend/app/chatbot.py)) y un system prompt con
metadata del dataset. El LLM decide qué tool llamar, recibe el resultado
en JSON, y sintetiza la respuesta en lenguaje natural.

| Tool | Qué hace |
|---|---|
| `get_stats_for_range` | stats descriptivas en un rango |
| `get_hourly_profile` | promedio por hora del día |
| `get_daily_profile` | stats por día calendario |
| `get_weekday_profile` | stats por día de la semana |
| `find_drops` | detecta caídas > X% |
| `get_peak_hours` / `get_trough_hours` | horas pico / valle |
| `compare_ranges` | diferencia entre dos rangos |

**Ventajas:**
- El LLM nunca alucina números: los saca de Pandas.
- El costo por pregunta es constante (solo envía el toolbox y la respuesta
  agregada, no los datos crudos).
- Agrego una tool nueva y el chatbot la usa sin re-entrenar nada.
- Loop agéntico de hasta 6 rondas: el LLM puede encadenar tools.

---

## Arquitectura

```
 ┌──────────┐    HTTP    ┌──────────────┐    Pandas    ┌──────────┐
 │ Browser  │ ─────────► │   Frontend   │ ───────────► │  Backend │
 └──────────┘            │   Next.js    │    (REST)    │  FastAPI │
                         │  (port 3000) │ ◄─────────── │  (8000)  │
                         └──────────────┘              └────┬─────┘
                                                            │
                                            ┌───────────────┼───────────────┐
                                            ▼               ▼               ▼
                                       ┌─────────┐    ┌──────────┐    ┌──────────┐
                                       │ 201 CSV │    │ Analytics│    │  Claude  │
                                       │ (vol ro)│    │ (pandas) │    │ API +    │
                                       └─────────┘    └──────────┘    │ tools    │
                                                                      └──────────┘
```

- **Volumen montado solo-lectura** de `./data` → `/app/data` en el backend.
- Backend consolida los 201 CSVs al arrancar (dedup por timestamp, orden
  cronológico). **Cacheado en memoria**, 67k puntos, ~2 MB.
- Next.js en modo `standalone` + `rewrites()` que proxeca `/api/*` al
  backend → no hay CORS en el navegador.
- Healthcheck del backend; el frontend espera a que esté healthy.

### Árbol
```
.
├── docker-compose.yml
├── .env.example
├── data/                      # CSVs del zip
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI + rutas
│       ├── data_loader.py     # merge de CSVs
│       ├── analytics.py       # pandas ops
│       └── chatbot.py         # Claude + tool use
└── frontend/
    ├── Dockerfile             # multi-stage, standalone
    ├── package.json
    └── src/
        ├── app/page.tsx       # dashboard
        ├── components/
        │   ├── KpiCard.tsx
        │   ├── TimeSeriesChart.tsx
        │   ├── HourlyChart.tsx
        │   ├── Heatmap.tsx
        │   ├── DropsTable.tsx
        │   ├── DateRangeFilter.tsx
        │   └── Chatbot.tsx
        └── lib/api.ts
```

---

## API del backend

| Endpoint | Método | Uso |
|---|---|---|
| `/api/health` | GET | estado + chatbot on/off |
| `/api/info` | GET | metadata del dataset |
| `/api/stats?start=&end=` | GET | stats descriptivas |
| `/api/timeseries?freq=&start=&end=` | GET | serie temporal agregada |
| `/api/hourly` | GET | promedio por hora |
| `/api/daily` | GET | stats por día |
| `/api/weekday` | GET | promedio por día semana |
| `/api/heatmap` | GET | heatmap weekday × hour |
| `/api/drops?threshold_pct=` | GET | caídas detectadas |
| `/api/chat` | POST | `{message, history}` → `{reply, tool_calls}` |

Docs interactivas en **http://localhost:8000/docs** (Swagger autogenerado
por FastAPI).

---

## Sobre los datos

- Métrica: `synthetic_monitoring_visible_stores` (monitoreo sintético de
  disponibilidad).
- Muestreo cada **10 s**.
- Rango: **2026-02-01 06:11 → 2026-02-11 15:00** (~10 días, 67 141 puntos).
- **Patrón claro**: mínimo en madrugada (~0), rampa a partir de las 8 AM,
  pico en la tarde (3-5 PM), descenso en la noche. El heatmap lo hace
  evidente en segundos.

---

## Decisiones que quiero poder defender

1. **Tool Use > RAG** para preguntas cuantitativas sobre series numéricas.
2. **Consolidación en memoria al boot**: 67k puntos caben fácil; evita leer
   201 archivos en cada request.
3. **Dedup por timestamp**: los CSVs se solapan 20s en los bordes;
   `keep=first` garantiza determinismo.
4. **Next.js standalone + rewrites**: una imagen mínima y cero CORS en
   producción.
5. **Frontend desacoplado del LLM**: toda la lógica de IA vive en el
   backend. El frontend solo conoce `/api/chat`. Cambiar de Claude a otro
   proveedor no toca el frontend.
6. **UI transparente del chatbot**: muestro las tool calls que hizo Claude;
   un reviewer puede auditar qué cálculos respaldan cada respuesta.
7. **Dark mode + paleta Rappi**: es un dashboard de operaciones, uso
   prolongado, contraste alto.

---

## Lo que dejé fuera (a propósito, por tiempo)

- Tests automáticos — la capa de `analytics` es la candidata natural.
- Autenticación — prototipo local.
- Persistencia de conversaciones del chatbot.
- Streaming de la respuesta (respuesta no-stream, se recibe completa).

---

## Preguntas sugeridas al chatbot

- "¿Cuál es la hora pico y la hora valle?"
- "Resume la disponibilidad del 5 de febrero entre 10 AM y 4 PM."
- "¿Hubo caídas mayores a 10% esta semana? Dame las 3 más severas."
- "Compara el lunes 2 contra el viernes 6."
- "¿Qué día tuvo el máximo absoluto y a qué hora?"
