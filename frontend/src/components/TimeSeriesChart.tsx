"use client";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
} from "recharts";
import { api, TsPoint } from "@/lib/api";

const FREQS = [
  { label: "10s", value: "10s" },
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" },
  { label: "1h", value: "1H" },
  { label: "1d", value: "1D" },
];

export function TimeSeriesChart({
  start,
  end,
}: { start?: string; end?: string }) {
  const [freq, setFreq] = useState("15min");
  const [data, setData] = useState<TsPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .timeseries(freq, start, end)
      .then((r) => setData(r.points))
      .finally(() => setLoading(false));
  }, [freq, start, end]);

  const fmt = (s: string) => {
    const d = new Date(s);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Tiendas visibles en el tiempo</h3>
          <p className="text-xs text-gray-500">
            Agregación {freq} · {data.length} puntos
          </p>
        </div>
        <div className="flex gap-1 bg-ink-900 rounded-lg p-1">
          {FREQS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFreq(f.value)}
              className={`px-2.5 py-1 text-xs rounded-md transition ${
                freq === f.value
                  ? "bg-rappi text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[380px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Cargando...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF441F" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#FF441F" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2230" />
              <XAxis
                dataKey="t"
                tickFormatter={fmt}
                stroke="#6B7280"
                tick={{ fontSize: 11 }}
                minTickGap={60}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: "#121621",
                  border: "1px solid #2A3142",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={fmt}
                formatter={(v: number) => [v.toLocaleString(), "tiendas"]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#FF441F"
                strokeWidth={2}
                fill="url(#grad)"
              />
              <Brush
                dataKey="t"
                height={24}
                stroke="#3A4256"
                fill="#1C2230"
                tickFormatter={fmt}
                travellerWidth={8}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
