import type { Boxplot, Fallback, PlotBox, Tone } from "../../gen/types.ts";

const TONES: Record<string, string> = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", mute: "--mute" };

const close = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;
export const decimals = (v: number) => [0, 1].find((d) => close(v * 10 ** d)) ?? 2;
export const colour = (tone: Tone | null | undefined) => `var(${TONES[tone ?? ""] ?? "--l"})`;
const values = (x: PlotBox) => [x.min, x.q1, x.median, x.q3, x.max, ...(x.outliers ?? [])];

export function places(p: Boxplot): number {
  return p.boxes.reduce((d, x) => Math.max(d, ...values(x).map(decimals)), 0);
}

export function axis(p: Boxplot): [number, number, number] | null {
  const all = p.boxes.flatMap((x) => [x.min, x.max, ...(x.outliers ?? [])]);
  if (!all.length) return null;
  const lo = Math.min(...all), hi = Math.max(...all);
  const raw = hi > lo ? (hi - lo) / 4 : 0.25, pow = 10 ** Math.floor(Math.log10(raw));
  const step = pow * ([1, 2, 2.5, 5].find((m) => raw / pow <= m) ?? 10);
  let bottom = Math.floor(lo / step) * step, top = Math.ceil(hi / step) * step;
  if (close((top - hi) / step)) top += step;
  if (close((bottom - lo) / step) && lo > 0) bottom -= step;
  return [bottom, top, step];
}

export function says(p: Boxplot, x: PlotBox): string {
  const d = places(p), s = (v: number) => v.toFixed(d), u = p.unit ? ` ${p.unit}` : "", o = x.outliers ?? [];
  const more = o.length ? `, ${o.length} outlier${o.length > 1 ? "s" : ""}: ${o.map(s).join(", ")}` : "";
  return `${x.name}: median ${s(x.median)}${u}, quartiles ${s(x.q1)} to ${s(x.q3)}, range ${s(x.min)} to ${s(x.max)}${more}`;
}

export function boxFallback(p: Boxplot): Fallback {
  const d = places(p), u = p.unit ? ` ${p.unit}` : "";
  const f: Fallback = { title: p.title };
  if (p.boxes.length) f.subtitle = p.boxes.map((x) => `${x.name} median ${x.median.toFixed(d)}${u}`).join(", ");
  if (p.tap) f.tap = p.tap;
  return f;
}
