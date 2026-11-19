import type { Cell, Column, SortDir, Table, TableRow, TableSort } from "../../gen/types.ts";
import type { Ctx } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";

type St = { sort: TableSort | null; q: string; hidden: Set<string>; sel: Set<string>; menu: string; seen: Map<string, string>; changed: Set<string>; fresh: Set<string> };

const MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const THAI = "ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.".split(" ");
const SIGN: Record<string, string> = { THB: "฿", USD: "$", EUR: "€" };
const FORMAT: Record<string, string> = { csv: "CSV", xlsx: "Excel" };
const states = new Map<string, St>();

const at = (r: TableRow, id: string): Cell | undefined => r.cells[id];
const numeric = (c: Column) => c.kind === "number" || c.kind === "money" || c.kind === "bar";
const end = (c: Column) => (c.align ?? (numeric(c) ? "end" : "start")) === "end";
const unit = (c: Column) => (c.kind === "money" ? (c.currency ? (SIGN[c.currency] ?? c.currency) : null) : c.unit);
const grouped = (v: number, d: number, fixed: boolean) => v.toLocaleString("en-US", { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d });
const number = (c: Column, v: number) => (c.kind === "money" ? grouped(v, 2, true) : grouped(v, c.digits ?? 2, false));

function shown(c: Column, v: Cell | undefined): string {
  if (v === undefined) return "";
  if (typeof v === "object") return v.text;
  if (typeof v === "number") return number(c, v);
  const d = /^(\d+)-(\d+)-(\d+)$/.exec(v);
  if (c.kind !== "date" || !d) return v;
  const be = c.era === "be";
  const month = (be && document.documentElement.lang.startsWith("th") ? THAI : MON)[Number(d[2]) - 1];
  return month ? `${Number(d[3])} ${month} ${Number(d[1]) + (be ? 543 : 0)}` : v;
}

const key = (c: Column, v: Cell) => (c.kind === "date" && typeof v === "string" ? v : shown(c, v).toLowerCase());
const cmp = (c: Column, a: Cell, b: Cell) => (numeric(c) && typeof a === "number" && typeof b === "number" ? a - b : key(c, a) < key(c, b) ? -1 : key(c, a) > key(c, b) ? 1 : 0);

function sorted(rows: TableRow[], c?: Column, dir?: SortDir): TableRow[] {
  if (!c) return rows;
  return [...rows].sort((r, s) => {
    const a = at(r, c.id), b = at(s, c.id);
    if (a === undefined || b === undefined) return Number(a === undefined) - Number(b === undefined);
    return dir === "desc" ? cmp(c, b, a) : cmp(c, a, b);
  });
}

function total(c: Column, rows: TableRow[]): [string, string] | null {
  const cells = rows.map((r) => at(r, c.id)).filter((v) => v !== undefined);
  const vs = cells.filter((v) => typeof v === "number");
  const sum = vs.reduce((a, v) => a + v, 0);
  if (!c.total) return null;
  if (c.total === "count") return ["count", String(cells.length)];
  if (!vs.length) return ["", "—"];
  return c.total === "avg" ? ["avg", grouped(sum / vs.length, 1, false)] : ["", number(c, sum)];
}

function roles(cols: Column[]): string[] {
  const r: (string | undefined)[] = cols.map((c) => c.phone ?? undefined);
  const claim = (part: string, ok: (c: Column) => boolean, pick: (free: number[]) => number | undefined) => {
    const i = r.includes(part) ? undefined : pick(cols.flatMap((c, i) => (r[i] === undefined && ok(c) ? [i] : [])));
    if (i !== undefined) r[i] = part;
  };
  claim("title", (c) => c.kind === "text", (f) => f[0]);
  claim("tag", (c) => c.kind === "tone", (f) => f[0]);
  claim("value", (c) => c.kind === "number" || c.kind === "money", (f) => f.filter((i) => cols[i].total).pop() ?? f.pop());
  return r.map((x) => x ?? "meta");
}

function cell(tag: "td" | "th", c: Column, role: string, kids: (Node | string)[], blank: boolean) {
  const e = h(tag, `${end(c) ? "end" : "start"} k-${c.kind} p-${role}${c.width ? " w" : ""}${blank ? " nil" : ""}`, ...kids);
  e.dataset.l = c.label;
  if (c.width) e.style.cssText = `--w:${c.width}ch`;
  return e;
}

const press = <E extends HTMLElement>(e: E, go: () => void): E => {
  e.onclick = go;
  return e;
};

type View = { b: Table; c: Ctx; st: St; q: HTMLInputElement; draw: () => void };
type Shown = { cols: Column[]; role: string[]; kept: TableRow[]; rows: TableRow[]; pick: boolean; sel: number; all: boolean };

const send = (v: View, action: string, values: unknown) => void v.c.act({ action, block: v.b.id, values });
const go = <E extends HTMLElement>(v: View, e: E, f: () => void): E => press(e, () => (f(), v.draw()));

function tick(v: View, on: boolean, label: string, set: (on: boolean) => void, mixed = false) {
  const i = Object.assign(el("input"), { type: "checkbox", checked: on, indeterminate: mixed });
  i.setAttribute("aria-label", label);
  i.onclick = (e) => (e.stopPropagation(), set(i.checked), v.draw());
  return i;
}

const every = (v: View, d: Shown) => tick(v, d.all, "Select all shown rows", (on) => (v.st.sel = new Set(on ? d.rows.map((r) => r.id) : [])), d.sel > 0 && !d.all);

function menu(v: View, name: string, label: string) {
  const m = go(v, btn(label), () => (v.st.menu = v.st.menu === name ? "" : name));
  m.setAttribute("aria-expanded", String(v.st.menu === name));
  return m;
}

function exporter(v: View, d: Shown, f: string) {
  const label = v.b.export?.length === 1 ? `export ${(FORMAT[f] ?? f).toLowerCase()}` : (FORMAT[f] ?? f);
  const values = () => ({ format: f, columns: d.cols.map((x) => x.id), sort: v.st.sort, q: v.st.q, rows: [...v.st.sel] });
  return press(btn(label, "", undefined, "export"), () => send(v, "export", values()));
}

function sorter(v: View, d: Shown) {
  const s = el("select", "tbs");
  s.setAttribute("aria-label", "Sort");
  const now = v.st.sort ? `${v.st.sort.by}:${v.st.sort.dir}` : "";
  const opt = (value: string, t: string) => s.append(Object.assign(el("option"), { value, textContent: t, selected: value === now }));
  opt("", "sort: as sent");
  for (const x of d.cols) if (x.sort !== false) for (const dir of ["asc", "desc"]) opt(`${x.id}:${dir}`, `sort: ${x.label.toLowerCase()} ${dir === "asc" ? "↑" : "↓"}`);
  s.onchange = () => {
    const [by, dir] = s.value.split(":");
    v.st.sort = by && (dir === "asc" || dir === "desc") ? { by, dir } : null;
    v.draw();
  };
  return s;
}

function bar(v: View, d: Shown): HTMLElement[] {
  const { b, st } = v, n = b.rows.length;
  const out = el("div", "tbh");
  if (d.pick) out.append(Object.assign(every(v, d), { className: "tbk" }));
  if (d.sel) {
    out.append(h("b", "tbt", `${d.sel} selected`));
    for (const a of b.select?.actions ?? []) out.append(press(btn(a.label, a.bad ? "bad" : "", undefined, a.action), () => send(v, a.action, { rows: [...st.sel] })));
    out.append(el("span", "tbn"));
  } else out.append(...(b.title ? [h("b", "tbt", b.title)] : []), h("span", "tbn", st.q ? `${d.kept.length} of ${n} rows` : `${n} row${n === 1 ? "" : "s"}`));
  if (n && !d.sel) {
    if (b.filter !== false) out.append(v.q);
    out.append(sorter(v, d));
    if (b.columns.length > 2) out.append(menu(v, "columns", st.hidden.size ? `columns · ${st.hidden.size} hidden` : "columns"));
  }
  const formats = n ? (b.export ?? []) : [];
  if (formats.length === 1) out.append(exporter(v, d, formats[0]));
  else if (formats.length) out.append(menu(v, "export", "export"));
  if (d.sel) out.append(go(v, btn("clear"), () => st.sel.clear()));
  const menus: HTMLElement[] = [];
  if (st.menu === "columns" && !d.sel && n) {
    const m = el("div", "tbm");
    m.setAttribute("role", "group");
    m.setAttribute("aria-label", "Columns");
    b.columns.forEach((x, i) => {
      const k = tick(v, i === 0 || !st.hidden.has(x.id), `Show ${x.label}`, (on) => (on ? st.hidden.delete(x.id) : st.hidden.add(x.id)));
      k.disabled = i === 0;
      m.append(h("label", "", k, x.label));
    });
    menus.push(m);
  }
  const note = d.sel ? `${d.sel} selected rows` : `${d.kept.length} rows, as sorted and shown`;
  if (st.menu === "export" && formats.length > 1) menus.push(h("div", "tbm", ...formats.map((f) => exporter(v, d, f)), h("p", "note", note)));
  return [out, ...menus];
}

function head(v: View, d: Shown): HTMLElement {
  const out = h("tr", "", ...(d.pick ? [h("th", "tbc", every(v, d))] : []));
  for (const x of d.cols) {
    const on = v.st.sort?.by === x.id ? v.st.sort.dir : null;
    const u = unit(x);
    const label = [h("span", "", x.label), ...(u ? [h("span", "tbu", u)] : []), h("i", "", on === "asc" ? "↑" : on === "desc" ? "↓" : "")];
    const cycle = () => (v.st.sort = on === "desc" ? null : { by: x.id, dir: on === "asc" ? "desc" : "asc" });
    const th = cell("th", x, "meta", x.sort === false ? label : [go(v, Object.assign(h("button", "tsh", ...label), { type: "button" }), cycle)], false);
    th.scope = "col";
    if (on) th.setAttribute("aria-sort", on === "asc" ? "ascending" : "descending");
    out.append(th);
  }
  return h("thead", "", out);
}

function body(v: View, d: Shown): HTMLElement {
  const { b, st } = v;
  const out = el("tbody");
  const max = (x: Column) => x.max ?? Math.max(1, ...b.rows.map((r) => at(r, x.id)).filter((n) => typeof n === "number"));
  for (const r of d.rows) {
    const tr = h("tr", [r.tap ? "tap" : "", st.changed.has(r.id) ? "chg" : "", st.fresh.has(r.id) ? "b-late" : "", st.sel.has(r.id) ? "sel" : ""].filter(Boolean).join(" "));
    tr.dataset.id = r.id;
    if (r.tap) press(tr, () => v.c.tap(r.tap));
    if (d.pick) tr.append(h("td", "tbc", tick(v, st.sel.has(r.id), `Select ${r.id}`, (on) => (on ? st.sel.add(r.id) : st.sel.delete(r.id)))));
    d.cols.forEach((x, i) => {
      const c = at(r, x.id), text = shown(x, c);
      const fill = el("i");
      fill.style.width = `${Math.min(1, Math.max(0, Number(c) / max(x))) * 100}%`;
      const kids = c === undefined ? [] : typeof c === "object" ? [h("span", `tag ${c.tone ?? ""}`, text)] : x.kind === "bar" ? [h("span", `tbb ${x.tone ?? ""}`, fill), text] : [text];
      const td = cell("td", x, d.role[i], kids, c === undefined);
      if (x.width && c !== undefined) td.title = text;
      tr.append(td);
    });
    out.append(tr);
  }
  if (!d.rows.length) {
    const td = h("td", "", b.rows.length ? `No rows match “${st.q}”. ` : (b.empty ?? "No rows yet."));
    td.colSpan = d.cols.length + (d.pick ? 1 : 0);
    if (b.rows.length) td.append(go(v, btn("clear"), () => (st.q = v.q.value = "")));
    out.append(h("tr", "tbe", td));
  }
  return out;
}

function foot(d: Shown): HTMLElement[] {
  if (!d.rows.length || !d.cols.some((x) => x.total)) return [];
  const out = h("tr", "", ...(d.pick ? [el("td", "tbc")] : []), Object.assign(h("th", "p-title", "Total"), { scope: "row" }));
  d.cols.forEach((x, i) => {
    const v = total(x, d.rows);
    if (i > 0) out.append(cell("td", x, d.role[i] === "title" ? "meta" : d.role[i], v ? [...(v[0] ? [h("span", "agg", v[0]), " "] : []), v[1]] : [], !v));
  });
  return [h("tfoot", "", out)];
}

function shows(v: View): Shown {
  const { b, st } = v;
  const cols = b.columns.filter((x, i) => i === 0 || !st.hidden.has(x.id));
  const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
  const kept = b.rows.filter((r) => words.every((w) => cols.some((x) => shown(x, at(r, x.id)).toLowerCase().includes(w))));
  for (const s of st.sel) if (!kept.some((r) => r.id === s)) st.sel.delete(s);
  const rows = sorted(kept, cols.find((x) => x.id === st.sort?.by), st.sort?.dir);
  const sel = st.sel.size;
  return { cols, role: roles(cols), kept, rows, pick: !!b.select && b.rows.length > 0, sel, all: sel > 0 && sel === rows.length };
}

function state(b: Table): St {
  const id = String(b.id ?? "");
  const st: St = states.get(id) ?? { sort: b.sort ?? null, q: "", hidden: new Set(b.columns.filter((x) => x.hide).map((x) => x.id)), sel: new Set(), menu: "", seen: new Map(), changed: new Set(), fresh: new Set() };
  states.set(id, st);
  const now = new Map(b.rows.map((r) => [r.id, JSON.stringify(r)]));
  if (st.seen.size && JSON.stringify([...now]) !== JSON.stringify([...st.seen])) {
    st.changed = new Set(b.rows.filter((r) => st.seen.get(r.id) !== now.get(r.id)).map((r) => r.id));
    st.fresh = new Set([...st.changed].filter((r) => !st.seen.has(r)));
  }
  st.seen = now;
  return st;
}

export function table(b: Table, c: Ctx): HTMLElement {
  const box = el("div", "tbl");
  const st = state(b);
  const q = Object.assign(el("input", "tbq"), { type: "search", placeholder: "filter", value: st.q });
  q.setAttribute("aria-label", `Filter ${b.title ?? "rows"}`);
  const v: View = { b, c, st, q, draw: () => {} };
  v.draw = () => {
    const focused = document.activeElement === q;
    const d = shows(v);
    box.classList.toggle("bulk", d.sel > 0);
    box.replaceChildren(...bar(v, d), h("div", "tbw", h("table", "", h("caption", "", b.title ?? "Table"), head(v, d), body(v, d), ...foot(d))));
    if (focused) q.focus();
  };
  q.oninput = () => ((st.q = q.value), v.draw());
  v.draw();
  return box;
}
