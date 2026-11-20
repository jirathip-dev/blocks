import type { Cell, Column, TableRow } from "../gen/types.ts";

const SIGN: Record<string, string> = { THB: "฿", USD: "$", EUR: "€" };

export const at = (r: TableRow, id: string): Cell | undefined => r.cells[id];
export const unit = (c: Column) => (c.kind === "money" ? (c.currency ? (SIGN[c.currency] ?? c.currency) : null) : c.unit);
const grouped = (v: number, d: number, fixed: boolean) => v.toLocaleString("en-US", { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d });
export const number = (c: Column, v: number) => (c.kind === "money" ? grouped(v, 2, true) : grouped(v, c.digits ?? 2, false));

export function total(c: Column, rows: TableRow[]): [string, string] | null {
  const cells = rows.map((r) => at(r, c.id)).filter((v) => v !== undefined);
  const vs = cells.filter((v) => typeof v === "number");
  const sum = vs.reduce((a, v) => a + v, 0);
  if (!c.total) return null;
  if (c.total === "count") return ["count", String(cells.length)];
  if (!vs.length) return ["", "—"];
  return c.total === "avg" ? ["avg", grouped(sum / vs.length, 1, false)] : ["", number(c, sum)];
}
