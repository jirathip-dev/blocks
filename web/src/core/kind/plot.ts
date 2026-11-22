import type { Axis, Op, Plot, Trace } from "../../gen/types.ts";
import { decimals, fixed, nice } from "./chart.ts";

export type Points = Extract<Op, { op: "points" }>;
/// A tick, as the crate's `PlotTick`: where it sits, its text, and whether its step is odd.
export type PlotTick = { at: number; text: string; odd: boolean };
/// What every renderer draws of a plot, as the crate's `PlotDrawn`.
export type PlotDrawn = { x: [number, number]; y: [number, number]; xTicks: PlotTick[]; yTicks: PlotTick[]; lines: number[][]; last: string[]; band: string | null };

const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];

/// Grows the plot's series by a `points` op as the crate's `Plot::grow` does; undefined when it does not fit.
export function grow(series: Trace[], op: Points): Trace[] | undefined {
  const at = series.findIndex((s) => s.name === op.series);
  const s = series[at];
  const drop = op.drop ?? 0;
  if (!s || drop > s.x.length || op.x.length !== op.y.length) return undefined;
  const out = [...series];
  out[at] = { ...s, x: [...s.x.slice(drop), ...op.x], y: [...s.y.slice(drop), ...op.y] };
  return out;
}

const step = (span: number, most: number, time: boolean): number =>
  time ? (TIME_STEPS.find((s) => span / s <= most) ?? 3600 * Math.ceil(span / most / 3600)) : nice(span / most);

function signed(v: number, d: number): string {
  const s = fixed(Math.abs(v), d);
  return v < 0 && /[1-9]/.test(s) ? `-${s}` : s;
}

function clock(v: number, hours: boolean): string {
  const t = Math.floor(Math.abs(v) + 0.5);
  const [h, m, s] = [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60];
  const two = (n: number) => String(n).padStart(2, "0");
  const sign = v < 0 && t > 0 ? "-" : "";
  return hours ? `${sign}${h}:${two(m)}:${two(s)}` : `${sign}${h * 60 + m}:${two(s)}`;
}

function ticks(range: [number, number], st: number, time: boolean): PlotTick[] {
  const out: PlotTick[] = [];
  for (let k = Math.ceil(range[0] / st - 1e-9); k * st <= range[1] + 1e-9; k++) {
    const v = k * st;
    out.push({ at: v, text: time ? clock(v, range[1] >= 3600) : signed(v, decimals(st)), odd: Math.abs(k % 2) > 0.5 });
  }
  return out;
}

const shown = (v: number) => signed(v, Math.min(decimals(v), 2));
const unit = (text: string, u: string) => (u ? `${text} ${u}` : text);
const isTime = (a: Axis | null | undefined) => a?.scale === "time";

function first(xs: number[], below: (v: number) => boolean): number {
  let [lo, hi] = [0, xs.length];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (below(xs[mid] ?? 0)) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function xRange(p: Plot): [number, number] {
  const held = p.series.filter((s) => s.x.length);
  const start = Math.min(Infinity, ...held.map((s) => s.x[0] ?? 0));
  const newest = Math.max(-Infinity, ...held.map((s) => s.x[s.x.length - 1] ?? 0));
  const w = p.window;
  let [lo, hi] = start > newest ? [0, w ?? 1] : w == null ? [start, newest] : newest - w < start ? [start, start + w] : [newest - w, newest];
  lo = p.x?.min ?? lo;
  hi = p.x?.max ?? hi;
  return [lo, hi > lo ? hi : lo + 1];
}

function line(s: Trace, [lo, hi]: [number, number]): number[] {
  const n = Math.min(s.x.length, s.y.length);
  const a = Math.min(first(s.x, (v) => v < lo), n);
  const b = Math.min(first(s.x, (v) => v <= hi), n);
  const [from, to] = [Math.max(a - 1, 0), Math.min(b + 1, n)];
  const out: number[] = [];
  if (to - from <= 2000) {
    for (let i = from; i < to; i++) out.push(i);
    return out;
  }
  const y = (i: number) => s.y[i] ?? 0;
  let col: { c: number; k: [number, number, number, number] } | undefined;
  const flush = () => {
    if (!col) return;
    for (const i of [...col.k].sort((p, q) => p - q)) if (out[out.length - 1] !== i) out.push(i);
  };
  for (let i = from; i < to; i++) {
    const c = Math.min(999, Math.max(0, Math.floor((((s.x[i] ?? 0) - lo) / (hi - lo)) * 1000)));
    if (col && Math.abs(col.c - c) < 0.5) {
      if (y(i) < y(col.k[1])) col.k[1] = i;
      if (y(i) > y(col.k[2])) col.k[2] = i;
      col.k[3] = i;
    } else {
      flush();
      col = { c, k: [i, i, i, i] };
    }
  }
  flush();
  return out;
}

function yRange(p: Plot, lines: number[][], time: boolean): [[number, number], number] {
  const all = p.series.flatMap((s, i) => (lines[i] ?? []).map((j) => s.y[j] ?? 0));
  if (p.target) all.push(p.target.min, p.target.max);
  if (p.peak) all.push(p.peak.y);
  let [lo, hi] = [0, 1];
  if (all.length) {
    const [l, h] = all.reduce(([a, b], v) => [Math.min(a, v), Math.max(b, v)], [Infinity, -Infinity]);
    const st = step(h > l ? h - l : 1, 4, time);
    [lo, hi] = [Math.floor(l / st) * st, Math.ceil(h / st) * st];
    if (!(hi > lo)) hi = lo + st;
  }
  const [min, max] = [p.y?.min, p.y?.max];
  lo = min ?? lo;
  hi = max ?? hi;
  if (!(hi > lo)) hi = lo + 1;
  const st = step(hi - lo, 4, time);
  return [[min != null ? lo : Math.floor(lo / st) * st, max != null ? hi : Math.ceil(hi / st) * st], st];
}

/// What every renderer draws, as the crate's `Plot::drawn`: both ranges, their ticks, each series' points to join and latest value, the target's text.
export function drawn(p: Plot): PlotDrawn {
  const [xt, yt] = [isTime(p.x), isTime(p.y)];
  const x = xRange(p);
  const lines = p.series.map((s) => line(s, x));
  const [y, ys] = yRange(p, lines, yt);
  const u = p.y?.unit ?? "";
  return {
    x,
    y,
    xTicks: ticks(x, step(x[1] - x[0], 6, xt), xt),
    yTicks: ticks(y, ys, yt),
    lines,
    last: p.series.map((s) => (s.y.length ? unit(shown(s.y[s.y.length - 1] ?? 0), u) : "")),
    band: p.target ? unit(`${shown(p.target.min)}–${shown(p.target.max)}`, u) : null,
  };
}
