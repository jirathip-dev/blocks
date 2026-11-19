import type { List, Row } from "../../gen/types.ts";
import type { Nudge, Rules } from "../gesture.ts";

const STEPS: [string, Nudge][] = [
  ["Move up", { dir: "up" }],
  ["Move down", { dir: "down" }],
  ["Move to top", { dir: "up", big: true }],
  ["Move to bottom", { dir: "down", big: true }],
];

const order = (b: List) => b.rows.flatMap((r) => (typeof r.id === "string" ? [r.id] : []));
const row = (b: List, id: string): Row | undefined => b.rows.find((r): r is { type: "row" } & Row => r.type === "row" && r.id === id);
const moved = (ids: string[], id: string, to: number): string[] | null => {
  const from = ids.indexOf(id);
  if (from < 0) return null;
  const out = ids.filter((i) => i !== id);
  out.splice(Math.min(Math.max(to, 0), out.length), 0, id);
  return out;
};

/// A list's reorder rules, as the crate's `impl Rules for List`: a grab is a row id, a reach a number of places.
export const list: Rules<List, string, number, string[]> = {
  word: (b, g) => (b.reorder != null && row(b, g)?.handle === true ? "reorder" : null),
  start: (b, g) => (list.word(b, g) ? order(b) : null),
  candidate: (b, g, r) => {
    const ids = list.start(b, g);
    return ids && moved(ids, g, ids.indexOf(g) + r);
  },
  nudge: (b, g, from, by) => {
    const at = from.indexOf(g);
    const last = from.length - 1;
    if (!list.word(b, g) || at < 0 || by.dir === "left" || by.dir === "right") return null;
    if (by.dir === "up") return at === 0 ? null : moved(from, g, by.big ? 0 : at - 1);
    return at === last ? null : moved(from, g, by.big ? last : at + 1);
  },
  steps: (b, g) => {
    const s = list.start(b, g);
    return s ? STEPS.filter(([, n]) => list.nudge(b, g, s, n) !== null) : [];
  },
  says: (b, g, c) => `${row(b, g)?.title ?? g}, ${c.indexOf(g) + 1} of ${c.length}`,
};
