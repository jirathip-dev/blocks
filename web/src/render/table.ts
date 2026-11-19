import type { Cell, Column, SortDir, Table, TableRow, TableSort } from "../gen/types.ts";
import { btn, type Ctx, el, h } from "./index.ts";

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

const press = (e: HTMLElement, go: () => void) => {
  e.onclick = go;
  return e;
};

export function table(b: Table, c: Ctx): HTMLElement {
  const box = el("div", "tbl");
  const id = String(b.id ?? "");
  const st: St = states.get(id) ?? { sort: b.sort ?? null, q: "", hidden: new Set(b.columns.filter((x) => x.hide).map((x) => x.id)), sel: new Set(), menu: "", seen: new Map(), changed: new Set(), fresh: new Set() };
  states.set(id, st);
  const now = new Map(b.rows.map((r) => [r.id, JSON.stringify(r)]));
  if (st.seen.size && JSON.stringify([...now]) !== JSON.stringify([...st.seen])) {
    st.changed = new Set(b.rows.filter((r) => st.seen.get(r.id) !== now.get(r.id)).map((r) => r.id));
    st.fresh = new Set([...st.changed].filter((r) => !st.seen.has(r)));
  }
  st.seen = now;
  const { changed, fresh } = st;
  const n = b.rows.length;
  const max = (x: Column) => x.max ?? Math.max(1, ...b.rows.map((r) => at(r, x.id)).filter((v) => typeof v === "number"));
  const send = (action: string, values: unknown) => void c.act({ action, block: b.id, values });
  const q = Object.assign(el("input", "tbq"), { type: "search", placeholder: "filter", value: st.q });
  q.setAttribute("aria-label", `Filter ${b.title ?? "rows"}`);
  q.oninput = () => ((st.q = q.value), draw());
  const go = (e: HTMLElement, f: () => void) => press(e, () => (f(), draw()));
  const draw = () => {
    const focused = document.activeElement === q;
    const cols = b.columns.filter((x, i) => i === 0 || !st.hidden.has(x.id));
    const role = roles(cols);
    const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    const kept = b.rows.filter((r) => words.every((w) => cols.some((x) => shown(x, at(r, x.id)).toLowerCase().includes(w))));
    for (const s of st.sel) if (!kept.some((r) => r.id === s)) st.sel.delete(s);
    const rows = sorted(kept, cols.find((x) => x.id === st.sort?.by), st.sort?.dir);
    const pick = !!b.select && n > 0;
    const sel = st.sel.size, all = sel > 0 && sel === rows.length;
    const tick = (on: boolean, label: string, set: (on: boolean) => void, mixed = false) => {
      const i = Object.assign(el("input"), { type: "checkbox", checked: on, indeterminate: mixed });
      i.setAttribute("aria-label", label);
      i.onclick = (e) => (e.stopPropagation(), set(i.checked), draw());
      return i;
    };
    const every = () => tick(all, "Select all shown rows", (on) => (st.sel = new Set(on ? rows.map((r) => r.id) : [])), sel > 0 && !all);
    const exp = (f: string) => press(btn(b.export?.length === 1 ? `export ${(FORMAT[f] ?? f).toLowerCase()}` : (FORMAT[f] ?? f), "", undefined, "export"), () => send("export", { format: f, columns: cols.map((x) => x.id), sort: st.sort, q: st.q, rows: [...st.sel] }));
    const menu = (name: string, label: string) => {
      const m = go(btn(label), () => (st.menu = st.menu === name ? "" : name));
      m.setAttribute("aria-expanded", String(st.menu === name));
      return m;
    };
    const bar = el("div", "tbh");
    if (pick) bar.append(Object.assign(every(), { className: "tbk" }));
    if (sel) {
      bar.append(h("b", "tbt", `${sel} selected`));
      for (const a of b.select?.actions ?? []) bar.append(press(btn(a.label, a.bad ? "bad" : "", undefined, a.action), () => send(a.action, { rows: [...st.sel] })));
      bar.append(el("span", "tbn"));
    } else bar.append(...(b.title ? [h("b", "tbt", b.title)] : []), h("span", "tbn", st.q ? `${kept.length} of ${n} rows` : `${n} row${n === 1 ? "" : "s"}`));
    if (n && !sel) {
      if (b.filter !== false) bar.append(q);
      const s = el("select", "tbs");
      s.setAttribute("aria-label", "Sort");
      const opt = (v: string, t: string) => s.append(Object.assign(el("option", "", ""), { value: v, textContent: t, selected: v === (st.sort ? `${st.sort.by}:${st.sort.dir}` : "") }));
      opt("", "sort: as sent");
      for (const x of cols) if (x.sort !== false) for (const d of ["asc", "desc"]) opt(`${x.id}:${d}`, `sort: ${x.label.toLowerCase()} ${d === "asc" ? "↑" : "↓"}`);
      s.onchange = () => {
        const [by, dir] = s.value.split(":");
        st.sort = by && (dir === "asc" || dir === "desc") ? { by, dir } : null;
        draw();
      };
      bar.append(s);
      if (b.columns.length > 2) bar.append(menu("columns", st.hidden.size ? `columns · ${st.hidden.size} hidden` : "columns"));
    }
    const formats = n ? (b.export ?? []) : [];
    if (formats.length === 1) bar.append(exp(formats[0]));
    else if (formats.length) bar.append(menu("export", "export"));
    if (sel) bar.append(go(btn("clear"), () => st.sel.clear()));
    const menus: HTMLElement[] = [];
    if (st.menu === "columns" && !sel) {
      const m = el("div", "tbm");
      m.setAttribute("role", "group");
      m.setAttribute("aria-label", "Columns");
      b.columns.forEach((x, i) => {
        const k = tick(i === 0 || !st.hidden.has(x.id), `Show ${x.label}`, (on) => (on ? st.hidden.delete(x.id) : st.hidden.add(x.id)));
        k.disabled = i === 0;
        m.append(h("label", "", k, x.label));
      });
      menus.push(m);
    }
    if (st.menu === "export" && formats.length > 1) menus.push(h("div", "tbm", ...formats.map(exp), h("p", "note", sel ? `${sel} selected rows` : `${kept.length} rows, as sorted and shown`)));
    const head = h("tr", "");
    if (pick) head.append(h("th", "tbc", every()));
    for (const x of cols) {
      const on = st.sort?.by === x.id ? st.sort.dir : null;
      const u = unit(x);
      const label = [h("span", "", x.label), ...(u ? [h("span", "tbu", u)] : []), h("i", "", on === "asc" ? "↑" : on === "desc" ? "↓" : "")];
      const cycle = () => (st.sort = on === "desc" ? null : { by: x.id, dir: on === "asc" ? "desc" : "asc" });
      const th = cell("th", x, "meta", x.sort === false ? label : [go(Object.assign(h("button", "tsh", ...label), { type: "button" }), cycle)], false);
      th.scope = "col";
      if (on) th.setAttribute("aria-sort", on === "asc" ? "ascending" : "descending");
      head.append(th);
    }
    const body = el("tbody");
    for (const r of rows) {
      const tr = h("tr", [r.tap ? "tap" : "", changed.has(r.id) ? "chg" : "", fresh.has(r.id) ? "b-late" : "", st.sel.has(r.id) ? "sel" : ""].filter(Boolean).join(" "));
      tr.dataset.id = r.id;
      if (r.tap) press(tr, () => c.tap(r.tap));
      if (pick) tr.append(h("td", "tbc", tick(st.sel.has(r.id), `Select ${r.id}`, (on) => (on ? st.sel.add(r.id) : st.sel.delete(r.id)))));
      cols.forEach((x, i) => {
        const v = at(r, x.id), text = shown(x, v);
        const fill = el("i");
        fill.style.width = `${Math.min(1, Math.max(0, Number(v) / max(x))) * 100}%`;
        const kids = v === undefined ? [] : typeof v === "object" ? [h("span", `tag ${v.tone ?? ""}`, text)] : x.kind === "bar" ? [h("span", `tbb ${x.tone ?? ""}`, fill), text] : [text];
        const td = cell("td", x, role[i], kids, v === undefined);
        if (x.width && v !== undefined) td.title = text;
        tr.append(td);
      });
      body.append(tr);
    }
    if (!rows.length) {
      const td = h("td", "", n ? `No rows match “${st.q}”. ` : (b.empty ?? "No rows yet."));
      td.colSpan = cols.length + (pick ? 1 : 0);
      if (n) td.append(go(btn("clear"), () => ((st.q = q.value = ""), undefined)));
      body.append(h("tr", "tbe", td));
    }
    const t = h("table", "", h("caption", "", b.title ?? "Table"), h("thead", "", head), body);
    if (rows.length && cols.some((x) => x.total)) {
      const foot = h("tr", "", ...(pick ? [el("td", "tbc")] : []), Object.assign(h("th", "p-title", "Total"), { scope: "row" }));
      cols.forEach((x, i) => {
        const v = total(x, rows);
        if (i > 0) foot.append(cell("td", x, role[i] === "title" ? "meta" : role[i], v ? [...(v[0] ? [h("span", "agg", v[0]), " "] : []), v[1]] : [], !v));
      });
      t.append(h("tfoot", "", foot));
    }
    box.classList.toggle("bulk", sel > 0);
    box.replaceChildren(bar, ...menus, h("div", "tbw", t));
    if (focused) q.focus();
  };
  draw();
  return box;
}
