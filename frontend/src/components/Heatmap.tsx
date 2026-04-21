"use client";
import { useEffect, useState } from "react";
import { api, Heatmap as HM } from "@/lib/api";

const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_ES: Record<string, string> = {
  Monday: "Lun", Tuesday: "Mar", Wednesday: "Mié", Thursday: "Jue",
  Friday: "Vie", Saturday: "Sáb", Sunday: "Dom",
};

export function HeatmapChart() {
  const [hm, setHm] = useState<HM | null>(null);

  useEffect(() => {
    api.heatmap().then(setHm);
  }, []);

  if (!hm) return <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5 h-full">Cargando heatmap...</div>;

  const flat = hm.values.flat().filter((v) => v > 0);
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  const ordered = WEEKDAY_ORDER.filter((d) => hm.weekdays.includes(d));
  const indexByWeekday = new Map(hm.weekdays.map((w, i) => [w, i]));

  const color = (v: number) => {
    if (!v) return "#121621";
    const t = (v - min) / (max - min || 1);
    const r = Math.round(255 * t + 30 * (1 - t));
    const g = Math.round(68 * t + 34 * (1 - t));
    const b = Math.round(31 * t + 46 * (1 - t));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5">
      <h3 className="text-lg font-semibold mb-1">Patrón semanal</h3>
      <p className="text-xs text-gray-500 mb-4">
        Tiendas promedio por hora del día × día de la semana
      </p>
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
