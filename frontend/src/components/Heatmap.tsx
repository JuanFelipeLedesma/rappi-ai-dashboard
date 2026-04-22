"use client";
import { useEffect, useMemo, useState } from "react";
import { api, Heatmap as HM } from "@/lib/api";

const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_ES: Record<string, string> = {
  Monday: "Lun", Tuesday: "Mar", Wednesday: "Mié", Thursday: "Jue",
  Friday: "Vie", Saturday: "Sáb", Sunday: "Dom",
};

type Scale = "percentile" | "log" | "linear";

export function HeatmapChart() {
  const [hm, setHm] = useState<HM | null>(null);
  const [scale, setScale] = useState<Scale>("percentile");

  useEffect(() => {
    api.heatmap().then(setHm);
  }, []);

  const rank = useMemo(() => {
    if (!hm) return null;
    const sorted = hm.values.flat().filter((v) => v > 0).sort((a, b) => a - b);
    // binary-search rank in [0,1]
    return (v: number) => {
      if (!v) return 0;
      let lo = 0, hi = sorted.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid] < v) lo = mid + 1;
        else hi = mid;
      }
      return sorted.length ? lo / sorted.length : 0;
    };
  }, [hm]);

  if (!hm || !rank) return <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5 h-full">Cargando heatmap...</div>;

  const flat = hm.values.flat().filter((v) => v > 0);
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);

  const ordered = WEEKDAY_ORDER.filter((d) => hm.weekdays.includes(d));
  const indexByWeekday = new Map(hm.weekdays.map((w, i) => [w, i]));

  const color = (v: number) => {
    if (!v) return "#121621";
    let t: number;
    if (scale === "percentile") t = rank(v);
    else if (scale === "log") t = (Math.log10(v) - logMin) / (logMax - logMin || 1);
    else t = (v - min) / (max - min || 1);
    t = Math.max(0, Math.min(1, t));
    const r = Math.round(255 * t + 30 * (1 - t));
    const g = Math.round(68 * t + 34 * (1 - t));
    const b = Math.round(31 * t + 46 * (1 - t));
    return `rgb(${r},${g},${b})`;
  };

  const scaleHint: Record<Scale, string> = {
    percentile: "color por percentil · máxima diferenciación",
    log: "color por log₁₀ del valor",
    linear: "color lineal al valor",
  };

  return (
    <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Patrón semanal</h3>
          <p className="text-xs text-gray-500">
            Tiendas promedio por hora del día × día de la semana · {scaleHint[scale]}
          </p>
        </div>
        <div className="flex gap-1 bg-ink-900 rounded-lg p-1 shrink-0">
          {(["percentile", "log", "linear"] as Scale[]).map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`px-2.5 py-1 text-[11px] rounded-md transition ${
                scale === s ? "bg-rappi text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {s === "percentile" ? "Percentil" : s === "log" ? "Log" : "Lineal"}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="inline-block">
          <div className="grid" style={{ gridTemplateColumns: `60px repeat(${hm.hours.length}, 22px)` }}>
            <div />
            {hm.hours.map((h) => (
              <div key={h} className="text-[10px] text-gray-500 text-center">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
            {ordered.map((wd) => {
              const row = hm.values[indexByWeekday.get(wd)!];
              return (
                <>
                  <div key={wd} className="text-xs text-gray-400 pr-2 flex items-center">
                    {WEEKDAY_ES[wd] || wd}
                  </div>
                  {row.map((v, i) => (
                    <div
                      key={`${wd}-${i}`}
                      className="h-[22px] w-[22px] rounded-[3px] m-[1px]"
                      style={{ background: color(v) }}
                      title={`${WEEKDAY_ES[wd]} ${hm.hours[i]}:00 → ${v ? v.toLocaleString() : "sin datos"}`}
                    />
                  ))}
                </>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
        <span>menos</span>
        <div className="flex-1 h-2 rounded-full" style={{
          background: "linear-gradient(90deg, rgb(30,34,46), rgb(255,68,31))",
        }} />
        <span>más</span>
      </div>
    </div>
  );
}
