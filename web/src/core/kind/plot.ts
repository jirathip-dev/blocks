import type { Fallback, Op, Plot, PlotAxis, Trace } from "../../gen/types.ts";
import { decimals, fixed, nice } from "./chart.ts";

export type Points = Extract<Op, { op: "points" }>;
type PlotTick = { at: number; text: string; odd: boolean };
/// What every renderer draws of a plot, as the crate's `PlotDrawn`.
export type PlotDrawn = { x: [number, number]; y: [number, number]; xTicks: PlotTick[]; yTicks: PlotTick[]; lines: number[][]; last: string[]; band: string | null };

const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];

/// Grows the plot's series in place by a `points` op as the crate's `Plot::grow` does; undefined, and unchanged, when it does not fit.
export function grow(series: Trace[], op: Points): Trace[] | undefined {
  const s = series.find((t) => t.name === op.series);
  const drop = op.drop ?? 0;
  if (!s || drop > s.x.length || op.x.length !== op.y.length) return undefined;
  s.x.splice(0, drop);
  s.y.splice(0, drop);
  for (const v of op.x) s.x.push(v);
  for (const v of op.y) s.y.push(v);
  return series;
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
const isTime = (a: PlotAxis | null | undefined) => a?.scale === "time";

function first(xs: number[], below: (v: number) => boolean): number {
  let [lo, hi] = [0, xs.length];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (below(xs[mid] ?? 0)) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function auto(start: number, newest: number, w: number | null | undefined): [number, number] {
  if (start > newest) return [0, w ?? 1];
  if (w == null) return [start, newest];
  return newest - w < start ? [start, start + w] : [newest - w, newest];
}

function xRange(p: Plot): [number, number] {
  const held = p.series.filter((s) => s.x.length);
  const start = Math.min(Infinity, ...held.map((s) => s.x[0] ?? 0));
  const newest = Math.max(-Infinity, ...held.map((s) => s.x[s.x.length - 1] ?? 0));
  const [a, b] = auto(start, newest, p.window);
  const [lo, hi] = [p.x?.min ?? a, p.x?.max ?? b];
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
  let c = -1, a0 = 0, lo0 = 0, hi0 = 0, z = 0;
  const add = (i: number) => {
    if (out[out.length - 1] !== i) out.push(i);
  };
  const flush = () => {
    if (c < 0) return;
    add(a0);
    add(Math.min(lo0, hi0));
    add(Math.max(lo0, hi0));
    add(z);
  };
  for (let i = from; i < to; i++) {
    const at = Math.min(499, Math.max(0, Math.floor((((s.x[i] ?? 0) - lo) / (hi - lo)) * 500)));
    if (Math.abs(c - at) < 0.5) {
      if (y(i) < y(lo0)) lo0 = i;
      if (y(i) > y(hi0)) hi0 = i;
      z = i;
    } else {
      flush();
      c = at;
      a0 = lo0 = hi0 = z = i;
    }
  }
  flush();
  return out;
}

function yRange(p: Plot, lines: number[][], time: boolean): [[number, number], number] {
  let [l, h] = [Infinity, -Infinity];
  const see = (v: number) => ((l = Math.min(l, v)), (h = Math.max(h, v)));
  p.series.forEach((s, i) => {
    for (const j of lines[i] ?? []) see(s.y[j] ?? 0);
  });
  if (p.target) [p.target.min, p.target.max].forEach(see);
  if (p.peak) see(p.peak.y);
  let [lo, hi] = [0, 1];
  if (l <= h) {
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

/// What a client with no plot view draws, as the crate's `Plot::fallback`: the title, and each line's name with its latest value.
export function fallback(p: Plot): Fallback {
  const u = p.y?.unit ?? "";
  const lines = p.series.flatMap((s) => (s.y.length ? [`${s.name} ${unit(shown(s.y[s.y.length - 1] ?? 0), u)}`] : []));
  return lines.length ? { title: p.title, subtitle: lines.join(", ") } : { title: p.title };
}
