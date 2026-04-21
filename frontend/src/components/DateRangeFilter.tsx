"use client";
import { Calendar } from "lucide-react";

export function DateRangeFilter({
  minDate,
  maxDate,
  start,
  end,
  onChange,
}: {
  minDate: string;
  maxDate: string;
  start?: string;
  end?: string;
  onChange: (start?: string, end?: string) => void;
}) {
  const fmt = (s: string) => s.slice(0, 16);
  return (
    <div className="rounded-2xl bg-ink-800 border border-ink-700 p-4 flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Calendar className="h-4 w-4" />
        <span>Rango:</span>
      </div>
      <input
        type="datetime-local"
        value={start ? fmt(start) : ""}
        min={fmt(minDate)}
        max={fmt(maxDate)}
        onChange={(e) => onChange(e.target.value || undefined, end)}
        className="bg-ink-900 border border-ink-700 rounded-lg px-3 py-1.5 text-sm"
      />
      <span className="text-gray-500">→</span>
      <input
        type="datetime-local"
        value={end ? fmt(end) : ""}
        min={fmt(minDate)}
        max={fmt(maxDate)}
        onChange={(e) => onChange(start, e.target.value || undefined)}
        className="bg-ink-900 border border-ink-700 rounded-lg px-3 py-1.5 text-sm"
      />
      {(start || end) && (
        <button
          onClick={() => onChange(undefined, undefined)}
          className="text-xs text-gray-400 hover:text-white px-2"
        >
          limpiar
        </button>
      )}
    </div>
  );
}
