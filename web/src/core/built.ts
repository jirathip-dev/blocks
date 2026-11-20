import type { Of } from "../gen/builders.ts";
import { hooks } from "../gen/hooks.ts";
import type { Fallback, Table } from "../gen/types.ts";
import { worked } from "./kind/table.ts";
import { total, unit } from "./table.ts";

const checked: unique symbol = Symbol("built");
/// A screen with its fallbacks written, as the crate's `Built::of`; only this goes into a view.
export type Built = Of<"screen"> & { readonly [checked]: true };

type Obj = Record<string, unknown>;

const KINDS = Object.keys(hooks);
const LISTS = ["blocks", "rows", "buttons"];
const DRAWN = ["row", "text", "island"];
const NAMED = ["title", "label", "header", "question", "name", "file", "command", "source", "src"];

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isTable = (o: Obj): o is Obj & Table => o.type === "table" && Array.isArray(o.columns) && Array.isArray(o.rows);
const text = (o: Obj, k: string) => (typeof o[k] === "string" && o[k] !== "" ? o[k] : undefined);

function tabled(t: Table): Fallback {
  const rows = t.rows.filter((r) => !r.group).map((r) => worked(t, r));
  const n = rows.length;
  const sum = t.columns.find((c) => c.total === "sum");
  const v = sum && total(sum, rows);
  const count = `${n} row${n === 1 ? "" : "s"}`;
  const sub = sum && v ? `${count} · total ${sum.label.toLowerCase()} ${unit(sum) ?? ""}${v[1]}` : count;
  return { title: t.title ?? "Table", subtitle: sub };
}

function plain(o: Obj, kind: string): Fallback {
  if (isTable(o)) return tabled(o);
  const subtitle = text(o, "subtitle");
  const f: Fallback = { title: NAMED.map((k) => text(o, k)).find((t) => t !== undefined) ?? kind };
  if (subtitle !== undefined) f.subtitle = subtitle;
  if (isObj(o.tap)) f.tap = o.tap;
  return f;
}

const copy = (v: unknown) => (isObj(v) ? fill({ ...v }) : v);
const each = (l: unknown) => (Array.isArray(l) ? l.map(copy) : l);

function fill(o: Obj): Obj {
  const kind = typeof o.type === "string" ? o.type : "";
  if (KINDS.includes(kind) && !DRAWN.includes(kind) && o.fallback === undefined) o.fallback = plain(o, kind);
  for (const k of LISTS) if (k in o) o[k] = each(o[k]);
  if (Array.isArray(o.rounds)) o.rounds = o.rounds.map((r) => (isObj(r) && "blocks" in r ? { ...r, blocks: each(r.blocks) } : r));
  return o;
}

/// Writes each fallback a client may need, as the crate's `Built::of` does, and brands the screen.
export function built(screen: Of<"screen">): Built {
  const out = { ...screen, [checked]: true as const };
  fill(out);
  return out;
}
