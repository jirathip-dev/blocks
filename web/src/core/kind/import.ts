import type { Import, ImportColumn, ImportRow, ImportSheet } from "../../gen/types.ts";
import { words } from "../../gen/words.ts";
import { importWords } from "../../gen/words-import.ts";

/// Where an import stands on this device: uploading, the server reading, the review, the confirm, sending or done.
export type Phase = "idle" | "up" | "upfail" | "reading" | "readfail" | "review" | "checking" | "ask" | "sending" | "done";
/// The device's side of an import: the phase, the picked file, and a column match or sheet the server has not answered yet.
export type ImportState = { phase: Phase; id: string; name: string; size: number; part: number; why: string; map: Record<string, string> | null; sheet: string | null; show: "all" | "errors"; open: boolean; seq: number; stop?: AbortController | undefined };
/// What an import draws now, from its block and its state.
export type ImportView = { phase: Phase | "off"; sheet: ImportSheet | null; map: Record<string, string>; bad: ImportRow[]; good: number; shown: ImportRow[]; hidden: number; missing: ImportColumn | undefined; extra: string[]; got: number };

/// A fresh state: done or the server's read if the block carries one, else empty.
export const fresh = (b: Import): ImportState => ({ phase: b.done ? "done" : b.sheet ? "review" : "idle", id: b.sheet?.file.id ?? "", name: b.sheet?.file.name ?? "", size: b.sheet?.file.size ?? 0, part: 0, why: "", map: null, sheet: null, show: "all", open: false, seq: 0 });

/// Word `key` of the import kind in `lang`, its `{name}`s filled from `v`.
export const say = (lang: string | null | undefined, key: string, v: Record<string, string | number> = {}): string =>
  ((importWords[key] ?? words[key])?.[lang === "th" ? 1 : 0] ?? key).replace(/\{(\w+)\}/g, (_, k: string) => {
    const x = v[k];
    return typeof x === "number" ? x.toLocaleString("en-US") : (x ?? "");
  });

/// The file input's `accept` and the hint's kinds: `.xlsx`, `.csv` unless the block names others.
export const kinds = (b: Import): string[] => (b.accept?.length ? b.accept : ["xlsx", "csv"]).map((a) => `.${a.replace(/^\./, "")}`);

/// Whether a picked file of `size` bytes is over the block's `mb`.
export const over = (b: Import, size: number): boolean => b.mb != null && size > b.mb * 1048576;

/// The import as drawn now. Without a file handler, a `read` or an `action` it is off.
export function view(b: Import, st: ImportState, on: boolean): ImportView {
  const live = ["review", "checking", "ask", "sending"].includes(st.phase);
  const sheet = (live || st.phase === "done") && b.sheet?.file.id === st.id ? b.sheet : null;
  const phase = !on || !b.read || !b.action ? "off" : live && !sheet ? "idle" : st.phase;
  const map = st.map ?? sheet?.map ?? {};
  const bad = sheet ? [...(b.refused ?? []), ...(sheet.bad ?? [])] : [];
  const rows = sheet?.rows ?? [];
  const shown = st.show === "errors" && bad.length ? bad : rows;
  const used = new Set(Object.values(map));
  return {
    phase, sheet, map, bad, shown,
    good: Math.max(0, (sheet?.file.rows ?? 0) - bad.length),
    hidden: shown === rows ? Math.max(0, (sheet?.file.rows ?? 0) - rows.length) : 0,
    missing: b.columns.find((c) => c.required && !map[c.key]),
    extra: (sheet?.headers ?? []).filter((h) => h && !used.has(h)),
    got: b.columns.filter((c) => map[c.key]).length,
  };
}

/// Two sample values of column `c` from the server's first rows.
export const sample = (c: ImportColumn, v: ImportView): string => v.shown.slice(0, 2).map((r) => r.cells[c.key] ?? "").filter(Boolean).join(", ");

/// What both actions send: the file's id, the sheet and the match. The same state sends the same values.
export const values = (b: Import, st: ImportState) => ({ file: st.id, sheet: st.sheet ?? b.sheet?.file.sheet ?? null, map: st.map ?? (b.sheet?.file.id === st.id ? b.sheet.map : {}) });

/// The phase after the app answered a read or the import; `b` is the block as the answer left it.
export function answered(st: ImportState, b: Import, ok: boolean): void {
  const ours = b.sheet?.file.id === st.id;
  if (st.phase === "reading") st.phase = !ok ? "readfail" : ours ? "review" : "idle";
  else if (st.phase === "sending") st.phase = ok && b.done ? "done" : "review";
  else if (st.phase === "checking") st.phase = ours ? "review" : "idle";
  if (st.phase !== "readfail") Object.assign(st, { map: null, sheet: null, show: "all" });
}
