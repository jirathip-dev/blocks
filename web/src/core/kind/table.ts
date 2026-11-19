import type { Cell, Column, Table, TableRow } from "../../gen/types.ts";
import { evaluate } from "../eval.ts";
import type { Nudge, Rules } from "../gesture.ts";
import { number } from "../table.ts";

/// What a table's gesture grabs: one cell to type into, or a row id by its handle.
export type GridGrab = { row: string; column: string } | string;
/// What a cell edit gives, as the crate's `CellEdit`.
export type CellEdit = { row: string; column: string; value: Cell };
/// What a table's gesture gives: one cell's new value, or every row id in the new order.
export type GridChange = CellEdit | string[];

const STEPS: [string, Nudge][] = [
  ["Move up", { dir: "up" }],
  ["Move down", { dir: "down" }],
  ["Move to top", { dir: "up", big: true }],
  ["Move to bottom", { dir: "down", big: true }],
];
const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const THAI = "ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.".split(" ");

/// A cell as drawn text, as the crate's `Column::shown`; `thai` writes a Buddhist-Era date's month in Thai.
export function shown(c: Column, v: Cell | undefined, thai = false): string {
  if (v === undefined) return "";
  if (typeof v === "object") return v.text;
  if (typeof v === "number") return number(c, v);
  const d = /^(\d+)-(\d+)-(\d+)$/.exec(v);
  if (c.kind !== "date" || !d) return v;
  const be = c.era === "be";
  const month = (be && thai ? THAI : MON)[Number(d[2]) - 1];
  return month ? `${Number(d[3])} ${month} ${Number(d[1]) + (be ? 543 : 0)}` : v;
}

/// The cell a typed text gives, as the crate's `Column::parse`; null when the column can't take it.
export function parse(c: Column, text: string): Cell | null {
  if (c.kind === "number" || c.kind === "money") {
    const t = text.replace(/[,\s]/g, "");
    return /^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(t) ? Number(t) : null;
  }
  if (c.kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : null;
  return c.kind === "text" ? text : null;
}

/// Whether a column's cells are typed into: `edit`, not worked out by `calc`, and a kind a text can give.
export const editable = (b: Table, c: Column) => c.edit === true && b.calc?.[c.id] == null && ["text", "number", "money", "date"].includes(c.kind);
/// A row's name: its first column's cell as drawn, else its id.
export const named = (b: Table, r: TableRow) => {
  const c = b.columns[0];
  return (c && shown(c, r.cells[c.id])) || r.id;
};

/// A row with each `calc` column worked out by `expr`, in column order; a group row as it is.
export function worked(b: Table, r: TableRow): TableRow {
  if (!b.calc || r.group) return r;
  const cells: Record<string, Cell> = { ...r.cells };
  for (const c of b.columns) {
    const e = b.calc[c.id];
    if (e == null) continue;
    const s = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, typeof v === "object" ? v.text : v]));
    const v = evaluate(e, s);
    if (typeof v === "number" || typeof v === "string") cells[c.id] = v;
    else delete cells[c.id];
  }
  return { ...r, cells };
}

const head = (b: Table, id: string) => b.rows.some((r) => r.id === id && r.group === true);
const row = (b: Table, id: string) => b.rows.find((r) => r.id === id);
const column = (b: Table, id: string) => b.columns.find((c) => c.id === id);

/// The rows before the first group row, then each group row with its items.
export function chunks(order: string[], isHead: (id: string) => boolean): [string[], string[][]] {
  const prefix: string[] = [];
  const out: string[][] = [];
  for (const id of order) {
    const last = out[out.length - 1];
    if (isHead(id)) out.push([id]);
    else if (last) last.push(id);
    else prefix.push(id);
  }
  return [prefix, out];
}

function itemTo(b: Table, from: string[], g: string, to: number): string[] | null {
  const rest = from.filter((i) => i !== g);
  const at = Math.min(to, rest.length);
  const first = rest.findIndex((i) => head(b, i));
  if (first >= 0 && at <= first) return null;
  rest.splice(at, 0, g);
  return rest;
}

function groupTo(b: Table, from: string[], g: string, to: number): string[] | null {
  const [prefix, all] = chunks(from, (i) => head(b, i));
  const at = all.findIndex((c) => c[0] === g);
  if (at < 0) return null;
  const [it = []] = all.splice(at, 1);
  all.splice(Math.min(to, all.length), 0, it);
  return [...prefix, ...all.flat()];
}

function rowsTo(b: Table, from: string[], g: string, n: number): string[] | null {
  const at = from.indexOf(g);
  if (at < 0) return null;
  const t = Math.max(0, at + n);
  if (!head(b, g)) return itemTo(b, from, g, t);
  const [prefix, all] = chunks(from, (i) => head(b, i));
  let start = prefix.length;
  let best: [number, number] = [Infinity, 0];
  const pick = (d: number, j: number): [number, number] => (d < best[0] || (d === best[0] && j < best[1]) ? [d, j] : best);
  all.filter((c) => c[0] !== g).forEach((c, j) => {
    best = pick(Math.abs(start - t), j);
    start += c.length;
  });
  best = pick(Math.abs(start - t), Math.max(0, all.length - 1));
  return groupTo(b, from, g, best[1]);
}

function nudged(b: Table, from: string[], g: string, by: Nudge): string[] | null {
  if (by.dir === "left" || by.dir === "right") return null;
  const up = by.dir === "up";
  let out: string[] | null;
  if (head(b, g)) {
    const [, all] = chunks(from, (i) => head(b, i));
    const at = all.findIndex((c) => c[0] === g);
    if (at < 0 || (up && !by.big && at === 0)) return null;
    out = groupTo(b, from, g, up ? (by.big ? 0 : at - 1) : by.big ? all.length - 1 : at + 1);
  } else {
    const at = from.indexOf(g);
    if (at < 0 || (up && !by.big && at === 0)) return null;
    out = itemTo(b, from, g, up ? (by.big ? from.findIndex((i) => head(b, i)) + 1 : at - 1) : by.big ? from.length : at + 1);
  }
  return out && out.join("\n") !== from.join("\n") ? out : null;
}

function place(b: Table, g: string, order: string[]): string {
  const r = row(b, g);
  const name = r ? named(b, r) : g;
  const [, all] = chunks(order, (i) => head(b, i));
  if (head(b, g)) return `${name}, ${all.findIndex((c) => c[0] === g) + 1} of ${all.length}`;
  const mine = all.find((c) => c.includes(g));
  const hr = mine?.[0] === undefined ? undefined : row(b, mine[0]);
  return mine && hr ? `${name}, ${mine.indexOf(g)} of ${mine.length - 1} in ${named(b, hr)}` : `${name}, ${order.indexOf(g) + 1} of ${order.length}`;
}

const free = (b: Table, id: string) => {
  const r = row(b, id);
  return r && r.fixed !== true ? r : undefined;
};

/// A table's rules, as the crate's `impl Rules for Table`: a cell's reach is the typed text, a row's a number of rows.
export const grid: Rules<Table, GridGrab, string | number, GridChange> = {
  word: (b, g) => {
    if (typeof g === "string") return b.reorder != null && free(b, g) ? "reorder" : null;
    const c = column(b, g.column);
    const r = free(b, g.row);
    return b.edit != null && r && !r.group && c && editable(b, c) ? "edit" : null;
  },
  start: (b, g) => {
    if (!grid.word(b, g)) return null;
    if (typeof g === "string") return b.rows.map((r) => r.id);
    return { row: g.row, column: g.column, value: row(b, g.row)?.cells[g.column] ?? "" };
  },
  candidate: (b, g, reach) => {
    const s = grid.start(b, g);
    if (s === null) return null;
    if (typeof g === "string") return Array.isArray(s) && typeof reach === "number" ? rowsTo(b, s, g, reach) : null;
    const c = column(b, g.column);
    const value = c && typeof reach === "string" ? parse(c, reach) : null;
    return value === null ? null : { row: g.row, column: g.column, value };
  },
  nudge: (b, g, from, by) => (grid.word(b, g) && typeof g === "string" && Array.isArray(from) ? nudged(b, from, g, by) : null),
  steps: (b, g) => {
    const s = grid.start(b, g);
    return s ? STEPS.filter(([, n]) => grid.nudge(b, g, s, n) !== null) : [];
  },
  says: (b, g, ch) => {
    if (Array.isArray(ch)) return typeof g === "string" ? place(b, g, ch) : "";
    const r = row(b, ch.row);
    const c = column(b, ch.column);
    return `${c?.label ?? ch.column}, ${r ? named(b, r) : ch.row}, ${c ? shown(c, ch.value) : ""}`;
  },
};
