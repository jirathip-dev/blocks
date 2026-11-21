import type { Chart, PointMove, Series } from "../../gen/types.ts";
import type { Nudge, Rules } from "../gesture.ts";

/// What a chart's move grabs, as the crate's `PointGrab`: one point, by its series' name and its x.
export type PointGrab = { series: string; at: string };
/// A reach in whole steps of the grabbed series, as the crate's `PointReach`; up is more.
export type PointReach = { steps: number };

const round = (v: number) => Math.floor(v + 0.5);

function nice(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return p * ([1, 2, 2.5, 5].find((m) => v / p <= m) ?? 10);
}

function decimals(x: number): number {
  for (let d = 0; d < 6; d++) {
    const v = x * Math.pow(10, d);
    if (Math.abs(v - round(v)) < 1e-6) return d;
  }
  return 6;
}

function fixed(v: number, d: number): string {
  const p = Math.pow(10, d);
  const n = round(v * p);
  const whole = Math.floor(n / p);
  const out = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return d > 0 ? `${out}.${String(n - whole * p).padStart(d, "0")}` : out;
}

/// Whether a series is drawn as a line, as the crate's `Chart::is_line`.
export const isLine = (c: Chart, s: Series) => c.chart === "line" || (c.chart === "combo" && s.as === "line");

/// The value axis, bottom and top, as the crate's `Chart::axis`: a line's spans its values, the others start at zero.
export function axis(c: Chart): [number, number] {
  const all = c.series.flatMap((s) => s.values);
  if (c.chart === "line") {
    if (!all.length) return [0, 1];
    const lo = Math.min(...all), hi = Math.max(...all);
    const step = nice(hi > lo ? (hi - lo) / 2 : Math.max(Math.abs(hi), 1) / 2);
    const low = Math.floor(lo / step) * step;
    let top = Math.max(Math.ceil(hi / step) * step, low + step);
    if (Math.round((top - low) / step) % 2 === 1) top += step;
    return [low, top];
  }
  let max = 0;
  for (let i = 0; i < c.x.length; i++) {
    const at = (line: boolean) => c.series.filter((s) => isLine(c, s) === line).flatMap((s) => (s.values[i] === undefined ? [] : [s.values[i] ?? 0]));
    const bars = at(false);
    const bar = c.chart !== "bar" ? bars.reduce((a, v) => a + v, 0) : Math.max(0, ...bars);
    max = Math.max(max, bar, ...at(true));
  }
  return [0, nice(max * 1.04)];
}

/// The step a series' point moves by, as the crate's `Chart::step`: its `step`, else what the format shows.
export function stepOf(c: Chart, s: Series): number {
  if (s.step != null && s.step > 0) return s.step;
  if (c.format === "thb_m") return 1e5;
  return c.format === "percent" ? 0.1 : 1;
}

/// A value at its series' step precision, as the crate's `Chart::shown`: ฿1.35M for a 50K step.
export function shown(c: Chart, s: Series, v: number): string {
  const sign = v < 0 ? "-" : "", a = Math.abs(v), st = stepOf(c, s);
  if (c.format === "thb_m" && a >= 1e6) return `${sign}฿${fixed(a / 1e6, Math.max(1, decimals(st / 1e6)))}M`;
  if (c.format === "thb_m" && a >= 1e3) return `${sign}฿${fixed(a / 1e3, decimals(st / 1e3))}K`;
  if (c.format === "thb_m" || c.format === "thb") return `${sign}฿${fixed(a, decimals(st))}`;
  return `${sign}${fixed(a, decimals(st))}${c.format === "percent" ? "%" : ""}`;
}

const point = (c: Chart, g: PointGrab): [Series, number] | null => {
  const i = c.x.indexOf(g.at);
  const s = c.series.find((x) => x.name === g.series);
  const v = s?.values[i];
  return s && i >= 0 && v !== undefined ? [s, v] : null;
};

function moved(c: Chart, g: PointGrab, from: number, by: number): PointMove | null {
  const p = point(c, g);
  if (!p) return null;
  const st = stepOf(c, p[0]), [lo, hi] = axis(c), k = 10 ** decimals(st);
  const n = Math.min(Math.floor(hi / st + 1e-9), Math.max(Math.ceil(lo / st - 1e-9), round(from / st) + by));
  return { series: g.series, at: g.at, y: round(n * st * k) / k };
}

/// A chart's rules, as the crate's `impl Rules for Chart`: a grab is a point, a reach whole steps of its series.
export const chart: Rules<Chart, PointGrab, PointReach, PointMove> = {
  word: (c, g) => {
    const p = point(c, g);
    return p && c.move != null && p[0].fixed !== true && (c.chart === "line" || c.chart === "bar" || c.chart === "combo") ? "move" : null;
  },
  start: (c, g) => {
    const p = point(c, g);
    return p && chart.word(c, g) ? { series: g.series, at: g.at, y: p[1] } : null;
  },
  candidate: (c, g, r) => {
    const s = chart.start(c, g);
    return s && r.steps !== 0 ? moved(c, g, s.y, r.steps) : s;
  },
  nudge: (c, g, from, n: Nudge) => {
    if (!chart.word(c, g) || n.dir === "left" || n.dir === "right") return null;
    const next = moved(c, g, from.y, (n.dir === "up" ? 1 : -1) * (n.big ? 10 : 1));
    return next && next.y !== from.y ? next : null;
  },
  steps: (c, g) => {
    const s = chart.start(c, g);
    const all: [string, Nudge][] = [["Raise", { dir: "up" }], ["Lower", { dir: "down" }]];
    return s ? all.filter(([, n]) => chart.nudge(c, g, s, n) !== null) : [];
  },
  says: (c, g, m) => {
    const p = point(c, g);
    return p ? `${p[0].name}: ${shown(c, p[0], m.y)}` : String(m.y);
  },
};
