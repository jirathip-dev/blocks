import type { Column, Import, ImportColumn } from "../../gen/types.ts";
import { words } from "../../gen/words.ts";
import type { Book, Row } from "../../sheet/index.ts";
import { shown } from "./table.ts";

type Sheet = typeof import("../../sheet/index.ts");
/// Where an import stands on this device: its file as read, the columns as mapped, and the step it is at.
export type Picked = { name: string; bytes: Uint8Array; book: Book; map: Record<string, number> };
export type ImportState = { file: Picked | null; error: string; show: "all" | "errors"; step: "pick" | "review" | "ask" | "sending"; open: boolean; sent: boolean; again: boolean };
/// What an import draws: its step, the checked rows, the ones shown, and what holds the confirm back.
export type ImportView = { step: ImportState["step"] | "done" | "off"; rows: Row[]; good: Row[]; bad: Row[]; shown: Row[]; hidden: number; missing: ImportColumn | undefined; extra: string[]; got: number };

let sheet: Promise<Sheet> | null = null, S: Sheet | null = null;
/// The reader and writer, fetched on first use so the page's script stays small.
export const load = (): Promise<Sheet> => (sheet ??= import("../../sheet/index.ts").then((m) => (S = m)));

export const fresh = (): ImportState => ({ file: null, error: "", show: "all", step: "pick", open: false, sent: false, again: false });
/// Word `key` of the import kind in `lang`, its `{name}`s filled from `v`.
export const say = (lang: string | null | undefined, key: string, v: Record<string, string | number> = {}): string =>
  (words[key]?.[lang === "th" ? 1 : 0] ?? key).replace(/\{(\w+)\}/g, (_, k: string) => {
    const x = v[k];
    return typeof x === "number" ? x.toLocaleString("en-US") : (x ?? "");
  });
export const column = (c: ImportColumn): Column => ({ id: c.key, label: c.label, kind: c.type === "money" || c.type === "number" || c.type === "date" ? c.type : "text" });
export const cell = (c: ImportColumn, r: Row): string => (c.key in r.values ? shown(column(c), r.values[c.key]) : r.cells[c.key]);

/// Reads `bytes` as the file to import, or sets the reason it cannot be read.
export async function pick(b: Import, st: ImportState, name: string, bytes: Uint8Array, lang?: string | null, at = 0) {
  const M = await load(), book = await M.read(name, bytes, at), max = b.max ?? 5000;
  const why = book === "old" ? say(lang, "imOld") : book === "not" ? say(lang, "imNotSheet") : !book.rows.length ? say(lang, "imNoRows") : book.rows.length > max ? say(lang, "imTooMany", { n: book.rows.length, max }) : "";
  if (why || typeof book === "string") return Object.assign(st, { error: why, file: null, step: "pick" });
  Object.assign(st, { error: "", file: { name, bytes, book, map: M.match(b.columns, book.head) }, step: "review", show: "all", open: false, sent: false });
}

/// The import as drawn now, from its block and its state.
export function view(b: Import, st: ImportState, lang?: string | null): ImportView {
  const f = st.file;
  const rows = f && S ? S.check(b.columns, f.map, f.book.rows, (k, v) => say(lang, k, v), b.refused ?? []) : [];
  const bad = rows.filter((r) => Object.keys(r.bad).length), good = rows.filter((r) => !Object.keys(r.bad).length);
  const shown = st.show === "errors" ? bad.slice(0, 100) : rows.filter((r, i) => i < 5 || bad.includes(r)).slice(0, 60);
  const used = new Set(Object.values(f?.map ?? {}));
  const step = !b.action ? "off" : b.done != null && !st.again && (!f || st.sent) ? "done" : st.step;
  return {
    step, rows, good, bad, shown, hidden: rows.length - shown.length,
    missing: f ? b.columns.find((c) => c.required && f.map[c.key] < 0) : undefined,
    extra: (f?.book.head ?? []).filter((h, i) => h && !used.has(i)),
    got: b.columns.filter((c) => (f?.map[c.key] ?? -1) >= 0).length,
  };
}

/// What the import action sends: the good rows typed by their columns, the file's name and how many were left out.
export const values = (st: ImportState, v: ImportView) => ({ rows: v.good.map((r) => r.values), file: st.file?.name ?? "", left: v.bad.length });

/// Downloads the empty workbook for `b`.
export async function template(b: Import, lang?: string | null) {
  const M = await load();
  M.save(`${b.title}.xlsx`, M.template(b.title, b.columns, (k, v) => say(lang, k, v)));
}

/// Downloads the rows left out, each with its reasons in a last column.
export async function leftOut(b: Import, v: ImportView, lang?: string | null) {
  const M = await load(), head = [say(lang, "imRow"), ...b.columns.map((c) => c.label), say(lang, "imError")];
  const rows = v.bad.map((r) => [r.n, ...b.columns.map((c) => r.cells[c.key]), Object.entries(r.bad).map(([k, m]) => `${b.columns.find((c) => c.key === k)?.label ?? k}: ${m}`).join(" · ")]);
  M.save(`${b.title} – ${say(lang, "imError")}.xlsx`, M.book([{ name: b.title, rows: [head, ...rows] }]));
}
