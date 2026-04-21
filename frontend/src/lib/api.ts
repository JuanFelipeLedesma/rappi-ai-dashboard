export type Info = {
  metric: string;
  description: string;
  start: string;
  end: string;
  points: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
};

export type TsPoint = { t: string; v: number };
export type Drop = { timestamp: string; drop_pct: number; value: number; prev_value: number };
export type HourlyRow = { hour: number; mean: number; min: number; max: number };
export type DailyRow = { date: string; mean: number; min: number; max: number; std: number; points: number };
export type WeekdayRow = { weekday: string; mean: number; min: number; max: number };
export type Heatmap = { weekdays: string[]; hours: number[]; values: number[][] };

const base = "";

async function j<T>(path: string): Promise<T> {
  const r = await fetch(base + path, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export const api = {
  info: () => j<Info>("/api/info"),
  stats: (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set("start", start);
    if (end) q.set("end", end);
    return j<any>(`/api/stats?${q.toString()}`);
  },
  timeseries: (freq: string, start?: string, end?: string) => {
    const q = new URLSearchParams({ freq });
    if (start) q.set("start", start);
    if (end) q.set("end", end);
    return j<{ freq: string; points: TsPoint[] }>(`/api/timeseries?${q.toString()}`);
  },
  hourly: () => j<HourlyRow[]>("/api/hourly"),
  daily: () => j<DailyRow[]>("/api/daily"),
  weekday: () => j<WeekdayRow[]>("/api/weekday"),
  heatmap: () => j<Heatmap>("/api/heatmap"),
  drops: (threshold_pct = 3) =>
    j<Drop[]>(`/api/drops?threshold_pct=${threshold_pct}`),
  chat: async (message: string, history: any[]) => {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (!r.ok) throw new Error(`/api/chat -> ${r.status}`);
    return r.json() as Promise<{ reply: string; tool_calls: any[] }>;
  },
};
