"use client";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-5 border",
        accent
          ? "bg-gradient-to-br from-rappi to-rappi-dark border-rappi-light text-white shadow-lg shadow-rappi/20"
          : "bg-ink-800 border-ink-700"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={clsx("text-xs uppercase tracking-wider", accent ? "text-white/80" : "text-gray-400")}>
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
          {hint && (
            <div className={clsx("mt-1 text-xs", accent ? "text-white/70" : "text-gray-500")}>{hint}</div>
          )}
        </div>
        {Icon && <Icon className={clsx("h-5 w-5", accent ? "text-white/80" : "text-gray-500")} />}
      </div>
    </div>
  );
}
