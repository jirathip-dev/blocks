import type { DaySpan, TimeBar, Timeline, TimeRow } from "../../gen/types.ts";
import type { Nudge, Rules } from "../gesture.ts";

/// What a timeline's gesture grabs, as the crate's `BarGrab`: a bar's part, or a row to draw on.
export type BarGrab = { bar: string; part: "body" | "start" | "end" } | { row: string };
/// A reach in whole days, as the crate's `Days`; a draw's starts at `from`, else at the row's first free day.
export type Days = { days: number; from?: string | null };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MS = 864e5;
const STEPS: [string, string, Nudge][] = [
  ["body", "One day earlier", { dir: "left" }],
  ["body", "One day later", { dir: "right" }],
  ["body", "One week earlier", { dir: "left", big: true }],
  ["body", "One week later", { dir: "right", big: true }],
  ["start", "Start one day earlier", { dir: "left" }],
  ["start", "Start one day later", { dir: "right" }],
  ["end", "End one day earlier", { dir: "left" }],
  ["end", "End one day later", { dir: "right" }],
];

/// An ISO day as a day number from 1970-01-01; null unless it is a real `YYYY-MM-DD`.
export function day(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const n = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS;
  return iso(n) === s ? n : null;
}
/// A day number as its ISO day.
export const iso = (n: number) => new Date(n * MS).toISOString().slice(0, 10);
/// A day number's day of the month, month (0 to 11), year and weekday (0 is Sunday).
export const parts = (n: number) => {
  const d = new Date(n * MS);
  return { date: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), weekday: d.getUTCDay() };
};
const short = (n: number) => `${parts(n).date} ${MONTHS[parts(n).month] ?? ""}`;
/// The words for a span of days: "6 Dec to 8 Dec, 3 days".
export function words(start: string, end: string): string {
  const [a, b] = [day(start), day(end)];
  if (a === null || b === null) return `${start} to ${end}`;
  const k = b - a + 1;
  return `${a === b ? short(a) : `${short(a)} to ${short(b)}`}, ${k} ${k === 1 ? "day" : "days"}`;
}

const covers = (b: TimeBar, a: number, z: number) => {
  const [s, e] = [day(b.start), day(b.end)];
  return s !== null && e !== null && s <= z && e >= a;
};
const range = (t: Timeline) => {
  const [f, z] = [day(t.from), day(t.to)];
  return f === null || z === null ? null : { f, z };
};
const track = (t: Timeline, id: string) => t.tracks.find((r) => r.id === id);
const bar = (t: Timeline, id: string): [TimeRow, TimeBar] | null => {
  for (const r of t.tracks) for (const b of r.bars) if (b.id === id) return [r, b];
  return null;
};
/// The first day of `r` no bar covers; null when every day is taken.
export function firstFree(t: Timeline, r: TimeRow): number | null {
  const at = range(t);
  for (let d = at?.f ?? 0; at && d <= at.z; d++) if (!r.bars.some((b) => covers(b, d, d))) return d;
  return null;
}
const span = (a: number, b: number, id: { id: string } | { row: string }): DaySpan => ({ ...id, start: iso(a), end: iso(b) });

function fits(t: Timeline, g: BarGrab, a: number, b: number): DaySpan | null {
  const at = range(t);
  if (!at || a > b) return null;
  if ("row" in g) {
    const r = track(t, g.row);
    return r && a >= at.f && b <= at.z && !r.bars.some((o) => covers(o, a, b)) ? span(a, b, { row: g.row }) : null;
  }
  const found = bar(t, g.bar);
  const [s, e] = found ? [day(found[1].start), day(found[1].end)] : [null, null];
  if (!found || s === null || e === null) return null;
  const past = (a !== s && a < at.f) || (b !== e && b > at.z);
  const onto = found[0].bars.some((o) => o.id !== g.bar && o.fixed === true && covers(o, a, b));
  return past || onto ? null : span(a, b, { id: g.bar });
}

function edit(t: Timeline, g: BarGrab, from: DaySpan, by: number): DaySpan | null {
  const [a, b] = [day(from.start), day(from.end)];
  if (a === null || b === null) return null;
  if ("row" in g) return by >= 0 ? fits(t, g, a, a + by) : fits(t, g, a + by, a);
  if (g.part === "body") return fits(t, g, a + by, b + by);
  return g.part === "start" ? fits(t, g, Math.min(a + by, b), b) : fits(t, g, a, Math.max(b + by, a));
}

const same = (x: DaySpan, y: DaySpan) => x.id === y.id && x.row === y.row && x.start === y.start && x.end === y.end;

/// A timeline's rules, as the crate's `impl Rules for Timeline`: a grab is a bar's part or a row, a reach whole days.
export const timeline: Rules<Timeline, BarGrab, Days, DaySpan> = {
  word: (t, g) => {
    if ("row" in g) {
      const r = track(t, g.row);
      return t.draw != null && r && firstFree(t, r) !== null ? "draw" : null;
    }
    const x = bar(t, g.bar)?.[1];
    if (!x || x.fixed === true || day(x.start) === null || day(x.end) === null) return null;
    if (g.part === "body") return t.move != null ? "move" : null;
    return t.stretch != null ? "stretch" : null;
  },
  start: (t, g) => {
    if (!timeline.word(t, g)) return null;
    if ("bar" in g) {
      const x = bar(t, g.bar)?.[1];
      return x ? { id: x.id, start: x.start, end: x.end } : null;
    }
    const r = track(t, g.row);
    const d = r ? firstFree(t, r) : null;
    return d === null ? null : { start: iso(d), end: iso(d) };
  },
  candidate: (t, g, r) => {
    const s = timeline.start(t, g);
    if (!s) return null;
    return edit(t, g, "row" in g && r.from != null ? { start: r.from, end: r.from } : s, r.days);
  },
  nudge: (t, g, from, n) => {
    if (n.dir === "up" || n.dir === "down") return null;
    const by = (n.dir === "left" ? -1 : 1) * (n.big ? 7 : 1);
    const [a, b] = [day(from.start), day(from.end)];
    let next: DaySpan | null;
    if ("row" in g && from.row == null) next = edit(t, g, from, Math.min(Math.abs(by) - 1, 6));
    else if ("row" in g) next = a === null || b === null ? null : fits(t, g, a, Math.max(b + by, a));
    else next = edit(t, g, from, by);
    return next && !same(next, from) ? next : null;
  },
  steps: (t, g) => {
    const s = timeline.start(t, g);
    if (!s) return [];
    if ("row" in g) return [["Add a bar", { dir: "right" }]];
    return STEPS.filter(([p, , n]) => p === g.part && timeline.nudge(t, g, s, n) !== null).map(([, name, n]) => [name, n]);
  },
  says: (_, __, c) => words(c.start, c.end),
};

/// The sub-lane of each bar of a row, by first fit in start order, and how many there are.
export function lanes(bars: TimeBar[]): { of: Map<string, number>; n: number } {
  const ends: number[] = [];
  const of = new Map<string, number>();
  for (const x of [...bars].sort((p, q) => (day(p.start) ?? 0) - (day(q.start) ?? 0))) {
    const s = day(x.start) ?? 0;
    let i = ends.findIndex((e) => e < s);
    if (i < 0) i = ends.push(0) - 1;
    ends[i] = day(x.end) ?? s;
    of.set(x.id, i);
  }
  return { of, n: Math.max(1, ends.length) };
}

/// A bar's accessible name: its label, its span in words, how far along and whether it is fixed.
export const barName = (x: TimeBar) => `${x.label ?? "Bar"}, ${words(x.start, x.end)}${x.progress != null ? `, ${x.progress} % done` : ""}${x.fixed ? ", fixed" : ""}`;
