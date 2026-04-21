"use client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, HourlyRow } from "@/lib/api";

export function HourlyChart() {
  const [data, setData] = useState<HourlyRow[]>([]);
  useEffect(() => { api.hourly().then(setData); }, []);

  return (
    <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5">
      <h3 className="text-lg font-semibold mb-1">Promedio por hora del día</h3>
      <p className="text-xs text-gray-500 mb-4">Curva de demanda diaria</p>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2230" />
            <XAxis dataKey="hour" stroke="#6B7280" tick={{ fontSize: 11 }} />
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
              formatter={(v: number) => [Math.round(v).toLocaleString(), "tiendas"]}
              labelFormatter={(h) => `${h}:00h`}
            />
            <Bar dataKey="mean" fill="#FF441F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
