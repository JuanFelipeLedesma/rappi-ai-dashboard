"use client";
import { useEffect, useState } from "react";
import { api, Drop } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export function DropsTable() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(3);

  useEffect(() => {
    setLoading(true);
    api.drops(threshold).then((d) => { setDrops(d); setLoading(false); });
  }, [threshold]);

  return (
    <div className="rounded-2xl bg-ink-800 border border-ink-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-lg font-semibold">Caídas detectadas</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Umbral:</span>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="bg-ink-900 border border-ink-700 rounded px-2 py-1"
          >
            <option value={2}>-2%</option>
            <option value={3}>-3%</option>
            <option value={5}>-5%</option>
            <option value={10}>-10%</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-gray-500 text-sm">Cargando...</div>
      ) : drops.length === 0 ? (
        <div className="text-gray-500 text-sm">Sin caídas sobre el umbral.</div>
      ) : (
        <div className="overflow-auto max-h-[260px] scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 sticky top-0 bg-ink-800">
              <tr>
                <th className="text-left py-2">Momento</th>
                <th className="text-right py-2">Valor</th>
                <th className="text-right py-2">Previo</th>
                <th className="text-right py-2">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {drops.slice(0, 50).map((d) => (
                <tr key={d.timestamp} className="border-t border-ink-700">
                  <td className="py-2">
                    {new Date(d.timestamp).toLocaleString("es-CO", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 text-right tabular-nums">{d.value.toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-gray-500">
                    {d.prev_value.toLocaleString()}
                  </td>
                  <td className="py-2 text-right tabular-nums text-red-400 font-medium">
                    {d.drop_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
