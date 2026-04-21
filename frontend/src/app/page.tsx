"use client";
import { useEffect, useState } from "react";
import {
  Activity, Store, TrendingUp, TrendingDown, Gauge, Clock,
} from "lucide-react";
import { api, Info } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { HourlyChart } from "@/components/HourlyChart";
import { HeatmapChart } from "@/components/Heatmap";
import { DropsTable } from "@/components/DropsTable";
import { Chatbot } from "@/components/Chatbot";
import { DateRangeFilter } from "@/components/DateRangeFilter";

export default function Page() {
  const [info, setInfo] = useState<Info | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();
  const [chatbotOn, setChatbotOn] = useState<boolean | null>(null);

  useEffect(() => {
    api.info().then(setInfo);
    fetch("/api/health").then((r) => r.json()).then((h) => setChatbotOn(h.chatbot_enabled));
  }, []);

  useEffect(() => {
    api.stats(start, end).then(setStats);
  }, [start, end]);

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      Cargando...
    </div>
  );

  const days = Math.ceil(
    (new Date(info.end).getTime() - new Date(info.start).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rappi to-rappi-dark flex items-center justify-center shadow-lg shadow-rappi/30">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Disponibilidad de Tiendas</h1>
            <p className="text-sm text-gray-400">
              {info.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-800 border border-ink-700">
            <span className={`h-2 w-2 rounded-full ${chatbotOn ? "bg-emerald-400" : "bg-amber-400"}`} />
            {chatbotOn === null ? "..." : chatbotOn ? "Chatbot activo" : "Chatbot sin API key"}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-ink-800 border border-ink-700 text-gray-400">
            {info.points.toLocaleString()} puntos · {days} días
          </span>
        </div>
      </header>

      {/* Filter */}
      <DateRangeFilter
        minDate={info.start}
        maxDate={info.end}
        start={start}
        end={end}
        onChange={(s, e) => { setStart(s); setEnd(e); }}
      />

      {/* KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Tiendas promedio"
          value={stats ? Math.round(stats.mean).toLocaleString() : "—"}
          hint={`mediana ${stats ? Math.round(stats.median).toLocaleString() : "—"}`}
          icon={Activity}
          accent
        />
        <KpiCard
          label="Máximo"
          value={stats ? Math.round(stats.max).toLocaleString() : "—"}
          hint={stats ? new Date(stats.max_at).toLocaleString("es-CO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          icon={TrendingUp}
        />
        <KpiCard
          label="Mínimo"
          value={stats ? Math.round(stats.min).toLocaleString() : "—"}
          hint={stats ? new Date(stats.min_at).toLocaleString("es-CO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          icon={TrendingDown}
        />
        <KpiCard
          label="P95"
          value={stats ? Math.round(stats.p95).toLocaleString() : "—"}
          hint={`p5 ${stats ? Math.round(stats.p5).toLocaleString() : "—"}`}
          icon={Gauge}
        />
        <KpiCard
          label="Desviación"
          value={stats ? `±${Math.round(stats.std).toLocaleString()}` : "—"}
          hint={`sobre ${stats ? stats.points.toLocaleString() : "—"} puntos`}
          icon={Clock}
        />
      </section>

      {/* Main chart */}
      <TimeSeriesChart start={start} end={end} />

      {/* Secondary row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HourlyChart />
        <HeatmapChart />
      </section>

      {/* Drops */}
      <DropsTable />

      {/* Footer */}
      <footer className="text-xs text-gray-500 text-center pt-6 pb-10">
        Dataset: <code>{info.metric}</code> · {new Date(info.start).toLocaleString("es-CO")} → {new Date(info.end).toLocaleString("es-CO")}
      </footer>

      <Chatbot />
    </div>
  );
}
