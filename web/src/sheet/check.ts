import type { ImportColumn, Refused } from "../gen/types.ts";
import type { Line } from "./read.ts";

export type Say = (key: string, v?: Record<string, string | number>) => string;
export type Row = { n: number; cells: Record<string, string>; values: Record<string, string | number>; bad: Record<string, string> };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/// Each column's header index in `head` (by label, key or an `also` name), or -1.
export const match = (cols: ImportColumn[], head: string[]): Record<string, number> =>
  Object.fromEntries(cols.map((c) => [c.key, head.findIndex((h) => [c.label, c.key, ...(c.also ?? [])].some((x) => norm(x) === norm(h)))]));

function number(s: string): number | null {
  const t = s.replace(/[\s,฿$€£]/g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

function date(s: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s), dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]].map(Number) : dmy ? [dmy[3], dmy[2], dmy[1]].map(Number) : [0, 0, 0];
  const year = y > 2400 ? y - 543 : y, t = new Date(Date.UTC(year, m - 1, d));
  return y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null;
}

function typed(c: ImportColumn, s: string, say: Say): string | number | { bad: string } {
  if (c.type === "number" || c.type === "money") return number(s) ?? { bad: say("imNotNum", { v: s }) };
  if (c.type === "date") return date(s) ?? { bad: say("imNotDate", { v: s }) };
  const one = c.values?.find((x) => norm(x) === norm(s));
  if (c.type === "choice" && c.values && one === undefined) return { bad: say("imNotOne", { v: s, list: c.values.join(", ") }) };
  return one ?? s;
}

/// The rows as the columns read them: each cell's text, its typed value, and the reason it is wrong.
export function check(cols: ImportColumn[], map: Record<string, number>, lines: Line[], say: Say, refused: Refused[] = []): Row[] {
  const seen = new Map<string, number>();
  return lines.map((l) => {
    const r: Row = { n: l.n, cells: {}, values: {}, bad: {} };
    for (const c of cols) {
      const s = (map[c.key] >= 0 ? (l.cells[map[c.key]] ?? "") : "").trim();
      r.cells[c.key] = s;
      if (!s) {
        if (c.required) r.bad[c.key] = say("imReq");
        continue;
      }
      const v = typed(c, s, say);
      if (typeof v === "object") r.bad[c.key] = v.bad;
      else r.values[c.key] = v;
      const at = seen.get(`${c.key}\n${norm(s)}`);
      if (c.unique && at !== undefined) r.bad[c.key] = say("imTwice", { v: s, n: at });
      else if (c.unique) seen.set(`${c.key}\n${norm(s)}`, l.n);
    }
    for (const x of refused) if (x.row === l.n) r.bad[x.key] = x.text;
    return r;
  });
}
