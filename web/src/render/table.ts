import type { Cell, Column, SortDir, Table, TableRow, TableSort } from "../gen/types.ts";
import { btn, type Ctx, el, h } from "./index.ts";
import { value } from "../core/text.ts";
import { at, total, unit } from "../core/table.ts";
import { type CellEdit, chunks, editable, grid as rules, named, shown as text, worked } from "../core/kind/table.ts";
import { edited, gestured, held } from "../gesture.ts";

type Pos = { row: string; col: string };
type St = { sort: TableSort | null; q: string; hidden: Set<string>; sel: Set<string>; menu: string; seen: Map<string, string>; changed: Set<string>; fresh: Set<string>; cur: Pos | null; typed: (Pos & { value: Cell }) | null; no: string; sheet: string };

const FORMAT: Record<string, string> = { csv: "CSV", xlsx: "Excel" };
const states = new Map<string, St>();

const numeric = (c: Column) => c.kind === "number" || c.kind === "money" || c.kind === "bar";
const end = (c: Column) => (c.align ?? (numeric(c) ? "end" : "start")) === "end";
const thai = () => document.documentElement.lang.startsWith("th");
const shown = (c: Column, v: Cell | undefined) => (typeof v === "object" ? value(v.text) : text(c, v, thai()));
const pk = (p: Pos) => `${p.row}\n${p.col}`;
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isEdit = (v: unknown): v is CellEdit => typeof v === "object" && v !== null && !Array.isArray(v) && "value" in v;

const key = (c: Column, v: Cell) => (c.kind === "date" && typeof v === "string" ? v : shown(c, v).toLowerCase());
const cmp = (c: Column, a: Cell, b: Cell) => (numeric(c) && typeof a === "number" && typeof b === "number" ? a - b : key(c, a) < key(c, b) ? -1 : key(c, a) > key(c, b) ? 1 : 0);

function sorted(rows: TableRow[], c?: Column, dir?: SortDir): TableRow[] {
  if (!c) return rows;
  const by = (r: TableRow, s: TableRow) => {
    const a = at(r, c.id), b = at(s, c.id);
    if (a === undefined || b === undefined) return Number(a === undefined) - Number(b === undefined);
    return dir === "desc" ? cmp(c, b, a) : cmp(c, a, b);
  };
  const out: TableRow[] = [];
  let run: TableRow[] = [];
  for (const r of rows) {
    if (!r.group) run.push(r);
    else (out.push(...run.sort(by), r), (run = []));
  }
  return [...out, ...run.sort(by)];
}

const itemsOf = (rows: TableRow[], i: number) => {
  const n = rows.slice(i + 1).findIndex((r) => r.group);
  return rows.slice(i + 1, n < 0 ? undefined : i + 1 + n);
};

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

type View = { b: Table; c: Ctx; st: St; q: HTMLInputElement; box: HTMLElement; draw: () => void };
type Shown = { cols: Column[]; role: string[]; rows: TableRow[]; items: TableRow[]; pick: boolean; sel: number; all: boolean; handles: boolean; ed: boolean };

const send = (v: View, action: string, values: unknown) => void v.c.act({ action, block: v.b.id, values });
const go = <E extends HTMLElement>(v: View, e: E, f: () => void): E => press(e, () => (f(), v.draw()));
const sent = (v: View, row: string, col: string) => {
  const c = held(v.c, { block: v.b, rules, grab: { row, column: col }, item: pk({ row, col }) });
  return isEdit(c) ? c.value : undefined;
};
const waits = (v: View, r: TableRow) => v.b.columns.some((x) => sent(v, r.id, x.id) !== undefined);
const sort = (v: View) => v.b.columns.find((x) => x.id === v.st.sort?.by);
const role = (b: Table, x: Column) => (b.edit && editable(b, x) ? "ed" : b.calc?.[x.id] != null ? "fx" : x.kind === "number" || x.kind === "money" ? "app" : "");

function tick(v: View, on: boolean, label: string, set: (on: boolean) => void, mixed = false) {
  const i = Object.assign(el("input"), { type: "checkbox", checked: on, indeterminate: mixed });
  i.setAttribute("aria-label", label);
  i.onclick = (e) => (e.stopPropagation(), set(i.checked), v.draw());
  return i;
}

const every = (v: View, d: Shown) => tick(v, d.all, "Select all shown rows", (on) => (v.st.sel = new Set(on ? d.items.map((r) => r.id) : [])), d.sel > 0 && !d.all);

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
  const { b, st } = v, n = b.rows.filter((r) => !r.group).length;
  const out = el("div", "tbh");
  if (d.pick) out.append(Object.assign(every(v, d), { className: "tbk" }));
  if (d.sel) {
    out.append(h("b", "tbt", `${d.sel} selected`));
    for (const a of b.select?.actions ?? []) out.append(press(btn(a.label, a.bad ? "bad" : "", undefined, a.action), () => send(v, a.action, { rows: [...st.sel] })));
    out.append(el("span", "tbn"));
  } else out.append(...(b.title ? [h("b", "tbt", b.title)] : []), h("span", "tbn", st.q ? `${d.items.length} of ${n} rows` : `${n} row${n === 1 ? "" : "s"}`));
  if (b.reorder && !d.sel && (st.sort || st.q)) out.append(h("span", "tbn", `${st.sort ? "sorted" : "filtered"}, so rows stay put`), go(v, btn("as sent"), () => ((st.sort = null), (st.q = v.q.value = ""))));
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
  const note = d.sel ? `${d.sel} selected rows` : `${d.items.length} rows, as sorted and shown`;
  if (st.menu === "export" && formats.length > 1) menus.push(h("div", "tbm", ...formats.map((f) => exporter(v, d, f)), h("p", "note", note)));
  return [out, ...menus];
}

function head(v: View, d: Shown): HTMLElement {
  const out = h("tr", "", ...(d.handles ? [el("th", "tbg")] : []), ...(d.pick ? [h("th", "tbc", every(v, d))] : []));
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

function slide(v: View, order: string[] | null, g: string) {
  const trs = Array.from(v.box.querySelectorAll<HTMLElement>("tbody>tr"));
  const [, all] = chunks(order ?? [], (i) => v.b.rows.some((r) => r.id === i && r.group));
  const lifted = order ? (all.find((c) => c[0] === g) ?? [g]) : [];
  let y = trs[0]?.offsetTop ?? 0;
  for (const e of trs) {
    e.style.transform = "";
    e.classList.toggle("lift", lifted.includes(e.dataset.id ?? ""));
  }
  for (const e of (order ?? []).flatMap((id) => trs.find((t) => t.dataset.id === id) ?? [])) {
    e.style.transform = `translateY(${y - e.offsetTop}px)`;
    y += e.offsetHeight;
  }
}

function grip(v: View, r: TableRow): HTMLElement {
  const td = el("td", "tbg");
  const g = v.b.reorder;
  if (!g || !rules.word(v.b, r.id)) return td;
  const hd = Object.assign(el("button", "b-hd"), { type: "button", textContent: "≡" });
  hd.setAttribute("aria-label", `Move ${named(v.b, r)}`);
  hd.dataset.act = g.action;
  td.append(hd);
  const reach = (_: number, dy: number) => Math.round(dy / (td.offsetHeight || 1));
  gestured(hd, v.c, { block: v.b, gesture: g, rules, grab: r.id, item: r.id, reach, show: (o) => slide(v, isIds(o) ? o : null, r.id) });
  return td;
}

function group(v: View, d: Shown, i: number): HTMLElement {
  const r = d.rows[i] ?? { id: "", cells: {} };
  const items = itemsOf(d.rows, i);
  const tr = h("tr", "grp", ...(d.handles ? [grip(v, r)] : []), ...(d.pick ? [el("td", "tbc")] : []));
  tr.dataset.id = r.id;
  d.cols.forEach((x, j) => {
    const sub = j > 0 && x.total && x.total !== "count" ? total(x, items) : null;
    const td = cell("td", x, d.role[j] ?? "meta", j === 0 ? [shown(x, r.cells[x.id]), h("span", "tbgn", String(items.length))] : sub ? [sub[1]] : [], j > 0 && !sub);
    if (sub && role(v.b, x) === "app" && items.some((it) => waits(v, it))) td.classList.add("wait");
    tr.append(td);
  });
  return tr;
}

function item(v: View, d: Shown, r: TableRow): HTMLElement {
  const { b, st } = v;
  const max = (x: Column) => x.max ?? Math.max(1, ...b.rows.map((r) => at(r, x.id)).filter((n) => typeof n === "number"));
  const tr = h("tr", [r.tap && !d.ed ? "tap" : "", st.changed.has(r.id) ? "chg" : "", st.fresh.has(r.id) ? "b-late" : "", st.sel.has(r.id) ? "sel" : ""].filter(Boolean).join(" "));
  tr.dataset.id = r.id;
  if (r.tap && !d.ed) press(tr, () => v.c.tap(r.tap));
  if (d.handles) tr.append(grip(v, r));
  if (d.pick) tr.append(h("td", "tbc", tick(v, st.sel.has(r.id), `Select ${r.id}`, (on) => (on ? st.sel.add(r.id) : st.sel.delete(r.id)))));
  const wait = waits(v, r);
  d.cols.forEach((x, i) => {
    const c = at(r, x.id), t = shown(x, c), k = role(b, x), p = { row: r.id, col: x.id };
    const fill = el("i");
    fill.style.width = `${Math.min(1, Math.max(0, Number(c) / max(x))) * 100}%`;
    const kids = c === undefined ? [] : typeof c === "object" ? [h("span", `tag ${c.tone ?? ""}`, t)] : x.kind === "bar" ? [h("span", `tbb ${x.tone ?? ""}`, fill), t] : [t];
    const typed = k === "ed" && !r.fixed;
    const td = cell("td", x, d.role[i] ?? "meta", typed ? [h("span", "tbf", ...kids)] : kids, c === undefined);
    if (x.width && c !== undefined) td.title = t;
    if (d.ed) {
      td.dataset.c = x.id;
      td.tabIndex = st.cur && pk(st.cur) === pk(p) ? 0 : -1;
      td.setAttribute("aria-label", [x.label, named(b, r), ...(t ? [t] : [])].join(", "));
    }
    if (typed && b.edit) td.dataset.act = b.edit.action;
    if (k === "fx") td.setAttribute("aria-readonly", "true");
    if (k === "fx") td.setAttribute("aria-description", "worked out");
    if (sent(v, r.id, x.id) !== undefined) td.setAttribute("aria-busy", "true");
    if (sent(v, r.id, x.id) !== undefined) td.classList.add("sent");
    if (k === "app" && wait) td.classList.add("wait");
    if (st.no === pk(p)) td.classList.add("no");
    tr.append(td);
  });
  if (!d.ed) return tr;
  const more = go(v, Object.assign(h("button", "", "›"), { type: "button" }), () => (st.sheet = r.id));
  more.setAttribute("aria-label", `Edit ${named(b, r)}`);
  tr.append(h("td", "tbo", more));
  return tr;
}

function body(v: View, d: Shown): HTMLElement {
  const { b, st } = v;
  const out = el("tbody");
  d.rows.forEach((r, i) => out.append(r.group ? group(v, d, i) : item(v, d, r)));
  if (!d.items.length) {
    const td = h("td", "", b.rows.length ? `No rows match “${st.q}”. ` : (b.empty ?? "No rows yet."));
    td.colSpan = d.cols.length + (d.pick ? 1 : 0) + (d.handles ? 1 : 0);
    if (b.rows.length) td.append(go(v, btn("clear"), () => (st.q = v.q.value = "")));
    out.append(h("tr", "tbe", td));
  }
  return out;
}

function foot(v: View, d: Shown): HTMLElement[] {
  if (!d.items.length || !d.cols.some((x) => x.total)) return [];
  const lead = [...(d.handles ? [el("td", "tbg")] : []), ...(d.pick ? [el("td", "tbc")] : [])];
  const out = h("tr", "", ...lead, Object.assign(h("th", "p-title", "Total"), { scope: "row" }));
  const wait = d.items.some((r) => waits(v, r));
  d.cols.forEach((x, i) => {
    const t = total(x, d.items);
    if (i === 0) return;
    const td = cell("td", x, d.role[i] === "title" ? "meta" : (d.role[i] ?? "meta"), t ? [...(t[0] ? [h("span", "agg", t[0]), " "] : []), t[1]] : [], !t);
    if (t && wait && role(v.b, x) === "app") td.classList.add("wait");
    out.append(td);
  });
  return [h("tfoot", "", out)];
}

function live(v: View, r: TableRow): TableRow {
  if (r.group) return r;
  const cells = { ...r.cells };
  for (const x of v.b.columns) {
    const s = sent(v, r.id, x.id);
    if (s !== undefined) cells[x.id] = s;
  }
  const t = v.st.typed;
  if (t?.row === r.id) cells[t.col] = t.value;
  return worked(v.b, { ...r, cells });
}

function shows(v: View): Shown {
  const { b, st } = v;
  const cols = b.columns.filter((x, i) => i === 0 || !st.hidden.has(x.id));
  const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = b.rows.map((r) => held(v.c, { block: b, rules, grab: r.id, item: r.id })).find(isIds);
  const all = (out ? out.flatMap((id) => b.rows.find((r) => r.id === id) ?? []) : b.rows).map((r) => live(v, r));
  const hit = (r: TableRow) => words.every((w) => cols.some((x) => shown(x, at(r, x.id)).toLowerCase().includes(w)));
  const kept = all.filter((r, i) => (r.group ? itemsOf(all, i).some(hit) : hit(r)));
  const rows = sorted(kept, sort(v), st.sort?.dir);
  const items = rows.filter((r) => !r.group);
  for (const s of st.sel) if (!items.some((r) => r.id === s)) st.sel.delete(s);
  const sel = st.sel.size;
  const handles = !!b.reorder && !st.sort && !st.q;
  return { cols, role: roles(cols), rows, items, pick: !!b.select && b.rows.length > 0, sel, all: sel > 0 && sel === items.length, handles, ed: !!b.edit };
}

function state(b: Table): St {
  const id = String(b.id ?? "");
  const st: St = states.get(id) ?? { sort: b.sort ?? null, q: "", hidden: new Set(b.columns.filter((x) => x.hide).map((x) => x.id)), sel: new Set(), menu: "", seen: new Map(), changed: new Set(), fresh: new Set(), cur: null, typed: null, no: "", sheet: "" };
  states.set(id, st);
  const now = new Map(b.rows.map((r) => [r.id, JSON.stringify(r)]));
  if (st.seen.size && JSON.stringify([...now]) !== JSON.stringify([...st.seen])) {
    st.changed = new Set(b.rows.filter((r) => st.seen.get(r.id) !== now.get(r.id)).map((r) => r.id));
    st.fresh = new Set([...st.changed].filter((r) => !st.seen.has(r)));
    st.no = "";
  }
  st.seen = now;
  return st;
}

function sync(a: Element, b: Element) {
  for (const n of a.getAttributeNames()) if (!b.hasAttribute(n)) a.removeAttribute(n);
  for (const n of b.getAttributeNames()) a.setAttribute(n, b.getAttribute(n) ?? "");
  a.replaceChildren(...b.childNodes);
}

function refresh(v: View) {
  const t = v.box.querySelector("table");
  const d = shows(v);
  const now = Array.from(h("table", "", body(v, d), ...foot(v, d)).querySelectorAll("tbody>tr, tfoot>tr"));
  const old = Array.from(t?.querySelectorAll("tbody>tr, tfoot>tr") ?? []);
  if (!t || old.length !== now.length || old.some((r, i) => r.getAttribute("data-id") !== now[i]?.getAttribute("data-id"))) return v.draw();
  old.forEach((r, i) => Array.from(r.children).forEach((c, j) => !c.querySelector(".tbi") && now[i]?.children[j] && sync(c, now[i].children[j])));
  const fields = Array.from(sheet(v, d)[0]?.querySelectorAll(".shf") ?? []);
  v.box.querySelectorAll(".tbsh .shf").forEach((f, i) => !f.querySelector(".tbi") && fields[i] && sync(f, fields[i]));
}

const cellAt = (v: View, p: Pos) => Array.from(v.box.querySelectorAll<HTMLElement>("tbody td[data-c]")).find((td) => td.dataset.c === p.col && td.parentElement?.dataset.id === p.row);

function cursor(v: View, p: Pos, focus = true) {
  v.st.cur = p;
  v.box.querySelectorAll<HTMLElement>("tbody td[data-c]").forEach((td) => (td.tabIndex = -1));
  const td = cellAt(v, p);
  if (!td) return;
  td.tabIndex = 0;
  if (focus) td.focus();
}

type Open = { typed?: string | null; into?: HTMLElement; field?: boolean };

function open(v: View, p: Pos, o: Open = {}) {
  const { b, c, st } = v;
  const x = b.columns.find((x) => x.id === p.col);
  const r = b.rows.find((r) => r.id === p.row);
  const into = o.into ?? cellAt(v, p);
  const off = !into || into.getAttribute("aria-disabled") === "true" || into.querySelector(".tbi") || sent(v, p.row, p.col) !== undefined;
  if (!b.edit || !x || !r || !into || off || !rules.word(b, { row: p.row, column: p.col })) return;
  const was = r.cells[x.id];
  const input = Object.assign(el("input", "tbi"), { value: o.typed ?? (typeof was === "number" ? String(was) : typeof was === "string" ? was : "") });
  input.setAttribute("aria-label", `${x.label}, ${named(b, r)}`);
  into.classList.add("ing");
  into.append(input);
  if (!o.field && input.offsetParent === null) return (input.remove(), into.classList.remove("ing"));
  const bad = (on: boolean) => {
    into.classList.toggle("bad", on);
    input.setAttribute("aria-invalid", String(on));
    into.querySelector(".tbx")?.remove();
    if (on) into.append(h("span", "tbx", x.kind === "date" ? "not a date (2026-01-31)" : "not a number"));
  };
  const left = (how: string) => {
    input.remove();
    into.classList.remove("ing", "bad");
    into.querySelector(".tbx")?.remove();
    if (o.field) return how === "blur" ? (refresh(v), open(v, p, o)) : v.draw();
    refresh(v);
    const d = shows(v), ids = d.items.map((i) => i.id), cols = d.cols.map((i) => i.id);
    const [dr, dc] = { down: [1, 0], right: [0, 1], left: [0, -1] }[how] ?? [0, 0];
    const to = { row: ids[Math.min(ids.length - 1, ids.indexOf(p.row) + dr)] ?? p.row, col: cols[Math.max(0, Math.min(cols.length - 1, cols.indexOf(p.col) + dc))] ?? p.col };
    if (how !== "blur") cursor(v, to);
  };
  const show = (at: string, ch: unknown) => {
    if (at === "previewing" && isEdit(ch)) st.typed = { ...p, value: ch.value };
    if (at === "refused") st.no = pk(p);
    if (at !== "previewing" && at !== "dragging") st.typed = null;
    if (input.isConnected) bad(at === "dragging");
    if (at !== "pressed") refresh(v);
  };
  edited(input, c, { block: b, gesture: b.edit, rules, grab: { row: p.row, column: p.col }, item: pk(p), show, left });
  if (!o.field) (st.no = ""), input.focus();
}

function keys(v: View, tb: HTMLElement) {
  const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  tb.addEventListener("keydown", (e) => {
    const td = e.target instanceof HTMLElement && e.target.matches("td[data-c]") ? e.target : null;
    const row = td?.parentElement?.dataset.id;
    if (!td || !row || !td.dataset.c) return;
    const p = { row, col: td.dataset.c };
    const m = moves[e.key];
    const d = shows(v), ids = d.items.map((i) => i.id), cols = d.cols.map((i) => i.id);
    if (m) cursor(v, { row: ids[Math.max(0, Math.min(ids.length - 1, ids.indexOf(row) + m[0]))] ?? row, col: cols[Math.max(0, Math.min(cols.length - 1, cols.indexOf(p.col) + m[1]))] ?? p.col });
    else if (e.key === "Enter") open(v, p);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== " ") open(v, p, { typed: e.key });
    else return;
    e.preventDefault();
  });
  tb.addEventListener("click", (e) => {
    const td = e.target instanceof Element ? e.target.closest<HTMLElement>("td[data-c]") : null;
    const row = td?.parentElement?.dataset.id;
    if (!td || !row || !td.dataset.c || td.querySelector(".tbi")) return;
    cursor(v, { row, col: td.dataset.c }, false);
    open(v, { row, col: td.dataset.c });
  });
}

function sheet(v: View, d: Shown): HTMLElement[] {
  const { b, st } = v;
  const r = d.items.find((i) => i.id === st.sheet);
  if (!r) return [];
  const g = [...d.rows].reverse().find((x, i, all) => x.group && all.indexOf(r) < i);
  const mine = g ? itemsOf(d.rows, d.rows.indexOf(g)) : [];
  const where = g ? [h("span", "shp", `${named(b, g)} · ${mine.indexOf(r) + 1} of ${mine.length}`)] : [];
  const card = h("div", "b-sheet__card", h("div", "b-sheet__head", h("b", "b-sheet__title", named(b, r), ...where), ...(r.tap ? [press(btn("open"), () => v.c.tap(r.tap))] : []), go(v, btn("done"), () => (st.sheet = ""))));
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", `Edit ${named(b, r)}`);
  for (const x of b.columns) {
    const k = role(b, x), u = unit(x);
    const f = h("label", `fd shf ${end(x) ? "end" : "start"}`, h("span", "fk", x.label, ...(u ? [h("span", "tbu", u)] : [])));
    const typed = k === "ed" && !r.fixed;
    const box = h("span", "shv", ...(typed ? [] : [shown(x, at(r, x.id))]));
    f.append(box);
    if (typed) open(v, { row: r.id, col: x.id }, { into: box, field: true });
    if (sent(v, r.id, x.id) !== undefined) f.classList.add("sent");
    if (k === "app" && waits(v, r)) f.classList.add("wait");
    card.append(f);
  }
  return [h("div", "tbsh", card)];
}

export function table(b: Table, c: Ctx): HTMLElement {
  const box = el("div", "tbl");
  const st = state(b);
  const q = Object.assign(el("input", "tbq"), { type: "search", placeholder: "filter", value: st.q });
  q.setAttribute("aria-label", `Filter ${b.title ?? "rows"}`);
  const v: View = { b, c, st, q, box, draw: () => {} };
  v.draw = () => {
    const focused = document.activeElement === q;
    const inside = document.activeElement?.tagName === "TD" && box.contains(document.activeElement);
    const d = shows(v);
    box.classList.toggle("bulk", d.sel > 0);
    box.classList.toggle("ed", !!b.edit || !!b.reorder);
    const tb = body(v, d);
    const t = h("table", "", h("caption", "", b.title ?? "Table"), head(v, d), tb, ...foot(v, d));
    if (d.ed) {
      t.setAttribute("role", "grid");
      keys(v, tb);
      const first = tb.querySelector<HTMLElement>("td[data-c]");
      if (!tb.querySelector("td[tabindex='0']") && first) first.tabIndex = 0;
    }
    box.replaceChildren(...bar(v, d), h("div", "tbw", t), ...sheet(v, d));
    if (focused) q.focus();
    if (inside && st.cur) cursor(v, st.cur);
  };
  q.oninput = () => ((st.q = q.value), v.draw());
  v.draw();
  return box;
}
