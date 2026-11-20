import { type ChangeEvent, type MouseEvent, type KeyboardEvent, type ReactNode, type RefObject, useContext, useLayoutEffect, useReducer, useRef } from "react";
import type { Cell, Column, Tap, Table, TableRow, TableSort } from "../../../src/core/index.ts";
import { atEnd, type CellEdit, cellRole as role, cellText, chunks, grid as rules, itemsOf, named, roles, sorted, worked } from "../../../src/core/kind/table.ts";
import { at, total, unit } from "../../../src/core/table.ts";
import { type Driven, edited, gestured, type Held, held } from "../../../src/gesture.ts";
import { Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { type Attrs, h } from "../h.ts";

type Pos = { row: string; col: string };
type St = {
  b: Table | null;
  gen: number;
  sort: TableSort | null;
  q: string;
  hidden: Set<string>;
  sel: Set<string>;
  menu: string;
  seen: Map<string, string>;
  changed: Set<string>;
  fresh: Set<string>;
  cur: Pos | null;
  focus: boolean;
  typed: (Pos & { value: Cell }) | null;
  no: string;
  sheet: string;
  open: (Pos & { typed: string | null }) | null;
  bad: Set<string>;
  fields: Map<string, number>;
};
type View = { b: Table; c: Driven; tap: (t: Tap) => void; st: St; box: RefObject<HTMLDivElement | null>; wired: WeakSet<Element>; draw: () => void };
type Shown = { cols: Column[]; role: string[]; rows: TableRow[]; items: TableRow[]; pick: boolean; sel: number; all: boolean; handles: boolean; ed: boolean; tab: string };

const FORMAT: Record<string, string> = { csv: "CSV", xlsx: "Excel" };

const thai = () => document.documentElement.lang.startsWith("th");
const shown = (c: Column, v: Cell | undefined) => cellText(c, v, thai());
const pk = (p: Pos) => `${p.row}\n${p.col}`;
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isEdit = (v: unknown): v is CellEdit => typeof v === "object" && v !== null && !Array.isArray(v) && "value" in v;

function cell(tag: "td" | "th", c: Column, part: string, kids: ReactNode[], blank: boolean, attrs: Attrs = {}) {
  const cls = `${atEnd(c) ? "end" : "start"} k-${c.kind} p-${part}${c.width ? " w" : ""}${blank ? " nil" : ""}`;
  return h(tag, cls, { "data-l": c.label, ...attrs, style: c.width ? { "--w": `${c.width}ch` } : undefined }, ...kids);
}

const send = (v: View, action: string, values: Record<string, unknown>) => void v.c.act({ action, block: v.b.id, values });
const go = (v: View, f: () => void) => ({ onClick: () => (f(), v.draw()) });
const sent = (v: View, row: string, col: string) => {
  const c = held(v.c, { block: v.b, rules, grab: { row, column: col }, item: pk({ row, col }) });
  return isEdit(c) ? c.value : undefined;
};
const waits = (v: View, r: TableRow) => v.b.columns.some((x) => sent(v, r.id, x.id) !== undefined);
const sort = (v: View) => v.b.columns.find((x) => x.id === v.st.sort?.by);
const cellAt = (v: View, p: Pos) => Array.from(v.box.current?.querySelectorAll<HTMLElement>("tbody td[data-c]") ?? []).find((td) => td.dataset["c"] === p.col && td.parentElement?.dataset["id"] === p.row);
const fit = (ids: string[], i: string, by: number) => ids[Math.max(0, Math.min(ids.length - 1, ids.indexOf(i) + by))] ?? i;

function tick(v: View, on: boolean, label: string, set: (on: boolean) => void, mixed = false, cls = "", off = false) {
  const ref = (e: HTMLInputElement | null) => {
    if (e) e.indeterminate = mixed;
  };
  const change = (e: ChangeEvent<HTMLInputElement>) => (set(e.target.checked), v.draw());
  return h("input", cls, { type: "checkbox", checked: on, disabled: off || undefined, "aria-label": label, ref, onClick: (e: MouseEvent) => e.stopPropagation(), onChange: change });
}

const every = (v: View, d: Shown, cls = "") => tick(v, d.all, "Select all shown rows", (on) => (v.st.sel = new Set(on ? d.items.map((r) => r.id) : [])), d.sel > 0 && !d.all, cls);
const menu = (v: View, name: string, label: string) => btn(label, "", undefined, undefined, { "aria-expanded": String(v.st.menu === name), ...go(v, () => (v.st.menu = v.st.menu === name ? "" : name)) });

function exporter(v: View, d: Shown, f: string) {
  const label = v.b.export?.length === 1 ? `export ${(FORMAT[f] ?? f).toLowerCase()}` : (FORMAT[f] ?? f);
  const values = () => ({ format: f, columns: d.cols.map((x) => x.id), sort: v.st.sort, q: v.st.q, rows: [...v.st.sel] });
  return btn(label, "", undefined, "export", { onClick: () => send(v, "export", values()) });
}

function sorter(v: View, d: Shown) {
  const opts = [h("option", "", { value: "" }, "sort: as sent")];
  for (const x of d.cols) if (x.sort !== false) for (const dir of ["asc", "desc"]) opts.push(h("option", "", { value: `${x.id}:${dir}` }, `sort: ${x.label.toLowerCase()} ${dir === "asc" ? "↑" : "↓"}`));
  const change = (e: ChangeEvent<HTMLSelectElement>) => {
    const [by, dir] = e.target.value.split(":");
    v.st.sort = by && (dir === "asc" || dir === "desc") ? { by, dir } : null;
    v.draw();
  };
  return h("select", "tbs", { "aria-label": "Sort", value: v.st.sort ? `${v.st.sort.by}:${v.st.sort.dir}` : "", onChange: change }, ...opts);
}

function bar(v: View, d: Shown): ReactNode[] {
  const { b, st } = v,
    n = b.rows.filter((r) => !r.group).length;
  const q = h("input", "tbq", { key: "q", type: "search", placeholder: "filter", value: st.q, "aria-label": `Filter ${b.title ?? "rows"}`, onChange: (e: ChangeEvent<HTMLInputElement>) => ((st.q = e.target.value), v.draw()) });
  const out: ReactNode[] = [];
  if (d.pick) out.push(every(v, d, "tbk"));
  if (d.sel) {
    out.push(h("b", "tbt", null, `${d.sel} selected`));
    for (const a of b.select?.actions ?? []) out.push(btn(a.label, a.bad ? "bad" : "", undefined, a.action, { onClick: () => send(v, a.action, { rows: [...st.sel] }) }));
    out.push(h("span", "tbn", null));
  } else out.push(b.title ? h("b", "tbt", null, b.title) : null, h("span", "tbn", null, st.q ? `${d.items.length} of ${n} rows` : `${n} row${n === 1 ? "" : "s"}`));
  if (b.reorder && !d.sel && (st.sort || st.q)) out.push(h("span", "tbn", null, `${st.sort ? "sorted" : "filtered"}, so rows stay put`), btn("as sent", "", undefined, undefined, go(v, () => ((st.sort = null), (st.q = "")))));
  if (n && !d.sel) {
    if (b.filter !== false) out.push(q);
    out.push(sorter(v, d));
    if (b.columns.length > 2) out.push(menu(v, "columns", st.hidden.size ? `columns · ${st.hidden.size} hidden` : "columns"));
  }
  const formats = n ? (b.export ?? []) : [];
  if (formats.length === 1 && formats[0]) out.push(exporter(v, d, formats[0]));
  else if (formats.length) out.push(menu(v, "export", "export"));
  if (d.sel) out.push(btn("clear", "", undefined, undefined, go(v, () => st.sel.clear())));
  const menus: ReactNode[] = [];
  if (st.menu === "columns" && !d.sel && n) {
    const ticks = b.columns.map((x, i) => {
      const k = tick(v, i === 0 || !st.hidden.has(x.id), `Show ${x.label}`, (on) => (on ? st.hidden.delete(x.id) : st.hidden.add(x.id)), false, "", i === 0);
      return h("label", "", null, k, x.label);
    });
    menus.push(h("div", "tbm", { role: "group", "aria-label": "Columns" }, ...ticks));
  }
  const note = d.sel ? `${d.sel} selected rows` : `${d.items.length} rows, as sorted and shown`;
  if (st.menu === "export" && formats.length > 1) menus.push(h("div", "tbm", null, ...formats.map((f) => exporter(v, d, f)), h("p", "note", null, note)));
  return [h("div", "tbh", null, ...out), ...menus];
}

function head(v: View, d: Shown): ReactNode {
  const ths = d.cols.map((x) => {
    const on = v.st.sort?.by === x.id ? v.st.sort.dir : null;
    const u = unit(x);
    const label = [h("span", "", null, x.label), u ? h("span", "tbu", null, u) : null, h("i", "", null, on === "asc" ? "↑" : on === "desc" ? "↓" : "")];
    const cycle = () => (v.st.sort = on === "desc" ? null : { by: x.id, dir: on === "asc" ? "desc" : "asc" });
    const kids = x.sort === false ? label : [h("button", "tsh", { type: "button", ...go(v, cycle) }, ...label)];
    return cell("th", x, "meta", kids, false, { scope: "col", "aria-sort": on === "asc" ? "ascending" : on === "desc" ? "descending" : undefined });
  });
  return h("thead", "", null, h("tr", "", null, d.handles ? h("th", "tbg", null) : null, d.pick ? h("th", "tbc", null, every(v, d)) : null, ...ths));
}

function slide(v: View, order: string[] | null, g: string) {
  const trs = Array.from(v.box.current?.querySelectorAll<HTMLElement>("tbody>tr") ?? []);
  const [, all] = chunks(order ?? [], (i) => v.b.rows.some((r) => r.id === i && r.group));
  const lifted = order ? (all.find((c) => c[0] === g) ?? [g]) : [];
  let y = trs[0]?.offsetTop ?? 0;
  for (const e of trs) {
    e.style.transform = "";
    e.classList.toggle("lift", lifted.includes(e.dataset["id"] ?? ""));
  }
  for (const e of (order ?? []).flatMap((id) => trs.find((t) => t.dataset["id"] === id) ?? [])) {
    e.style.transform = `translateY(${y - e.offsetTop}px)`;
    y += e.offsetHeight;
  }
}

function grip(v: View, r: TableRow): ReactNode {
  const g = v.b.reorder;
  if (!g || !rules.word(v.b, r.id)) return h("td", "tbg", null);
  const wire = (hd: HTMLButtonElement | null) => {
    const td = hd?.parentElement;
    if (!hd || !td || v.wired.has(hd)) return;
    v.wired.add(hd);
    const reach = (_: number, dy: number) => Math.round(dy / (td.offsetHeight || 1));
    gestured(hd, v.c, { block: v.b, gesture: g, rules, grab: r.id, item: r.id, reach, show: (o) => slide(v, isIds(o) ? o : null, r.id) });
  };
  return h("td", "tbg", null, h("button", "b-hd", { type: "button", "aria-label": `Move ${named(v.b, r)}`, "data-act": g.action, ref: wire }, "≡"));
}

function input(v: View, r: TableRow, x: Column, field: boolean): ReactNode[] {
  const { b, st } = v;
  const p = { row: r.id, col: x.id };
  const ik = `${field ? "f" : "c"}\n${pk(p)}`;
  const was = r.cells[x.id];
  const typed = field ? null : (st.open?.typed ?? null);
  const gesture = b.edit;
  const wire = (e: HTMLInputElement | null) => {
    if (!e || !gesture || v.wired.has(e)) return;
    v.wired.add(e);
    if (!field && e.offsetParent === null) return ((st.open = null), v.draw());
    const show = (now: string, ch: unknown) => {
      if (now === "previewing" && isEdit(ch)) st.typed = { ...p, value: ch.value };
      if (now === "refused") st.no = pk(p);
      if (now !== "previewing" && now !== "dragging") st.typed = null;
      if (now === "dragging") st.bad.add(ik);
      else st.bad.delete(ik);
      if (now !== "pressed") v.draw();
    };
    const left = (how: string) => {
      st.bad.delete(ik);
      if (field) return (st.fields.set(x.id, (st.fields.get(x.id) ?? 0) + 1), v.draw());
      st.open = null;
      const d = shows(v),
        ids = d.items.map((i) => i.id),
        cols = d.cols.map((i) => i.id);
      const [dr, dc] = ({ down: [1, 0], right: [0, 1], left: [0, -1] } satisfies Record<string, [number, number]>)[how] ?? [0, 0];
      if (how !== "blur") (st.cur = { row: fit(ids, p.row, dr), col: fit(cols, p.col, dc) }), (st.focus = true);
      v.draw();
    };
    edited(e, v.c, { block: b, gesture, rules, grab: { row: p.row, column: p.col }, item: pk(p), show, left });
    if (!field) (st.no = ""), e.focus();
  };
  const value = typed ?? (typeof was === "number" ? String(was) : typeof was === "string" ? was : "");
  const box = h("input", "tbi", { key: `${ik}\n${st.fields.get(x.id) ?? 0}`, defaultValue: value, "aria-label": `${x.label}, ${named(b, r)}`, "aria-invalid": st.bad.has(ik) ? "true" : undefined, ref: wire });
  return [box, st.bad.has(ik) ? h("span", "tbx", null, x.kind === "date" ? "not a date (2026-01-31)" : "not a number") : null];
}

function group(v: View, d: Shown, i: number): ReactNode {
  const r = d.rows[i] ?? { id: "", cells: {} };
  const items = itemsOf(d.rows, i);
  const tds = d.cols.map((x, j) => {
    const sub = j > 0 && x.total && x.total !== "count" ? total(x, items) : null;
    const wait = sub && role(v.b, x) === "app" && items.some((it) => waits(v, it));
    return cell("td", x, d.role[j] ?? "meta", j === 0 ? [shown(x, r.cells[x.id]), h("span", "tbgn", null, String(items.length))] : sub ? [sub[1]] : [], j > 0 && !sub, { className: wait ? "wait" : undefined });
  });
  return h("tr", "grp", { key: r.id, "data-id": r.id }, d.handles ? grip(v, r) : null, d.pick ? h("td", "tbc", null) : null, ...tds);
}

function item(v: View, d: Shown, r: TableRow): ReactNode {
  const { b, st } = v;
  const max = (x: Column) => x.max ?? Math.max(1, ...b.rows.map((r) => at(r, x.id)).filter((n) => typeof n === "number"));
  const cls = [r.tap && !d.ed ? "tap" : "", st.changed.has(r.id) ? "chg" : "", st.fresh.has(r.id) ? "b-late" : "", st.sel.has(r.id) ? "sel" : ""].filter(Boolean).join(" ");
  const tap = r.tap;
  const wait = waits(v, r);
  const tds = d.cols.map((x, i) => {
    const c = at(r, x.id),
      t = shown(x, c),
      k = role(b, x),
      p = { row: r.id, col: x.id };
    const fill = h("i", "", { style: { width: `${Math.min(1, Math.max(0, Number(c) / max(x))) * 100}%` } });
    const kids = c === undefined ? [] : typeof c === "object" ? [h("span", `tag ${c.tone ?? ""}`, null, t)] : x.kind === "bar" ? [h("span", `tbb ${x.tone ?? ""}`, null, fill), t] : [t];
    const typed = k === "ed" && !r.fixed;
    const out = sent(v, r.id, x.id) !== undefined;
    const ing = st.open !== null && pk(st.open) === pk(p);
    const more = [out ? "sent" : "", k === "app" && wait ? "wait" : "", st.no === pk(p) ? "no" : "", ing ? "ing" : "", ing && st.bad.has(`c\n${pk(p)}`) ? "bad" : ""].filter(Boolean).join(" ");
    const attrs = {
      className: more || undefined,
      title: x.width && c !== undefined ? t : undefined,
      "data-c": d.ed ? x.id : undefined,
      tabIndex: d.ed ? (d.tab === pk(p) ? 0 : -1) : undefined,
      "aria-label": d.ed ? [x.label, named(b, r), ...(t ? [t] : [])].join(", ") : undefined,
      "data-act": typed && b.edit ? b.edit.action : undefined,
      "aria-readonly": k === "fx" ? "true" : undefined,
      "aria-description": k === "fx" ? "worked out" : undefined,
      "aria-busy": out ? "true" : undefined,
    };
    return cell("td", x, d.role[i] ?? "meta", [...(typed ? [h("span", "tbf", null, ...kids)] : kids), ...(ing ? input(v, r, x, false) : [])], c === undefined, attrs);
  });
  const edit = d.ed ? h("td", "tbo", null, h("button", "", { type: "button", "aria-label": `Edit ${named(b, r)}`, ...go(v, () => (st.sheet = r.id)) }, "›")) : null;
  const pick = d.pick ? h("td", "tbc", null, tick(v, st.sel.has(r.id), `Select ${r.id}`, (on) => (on ? st.sel.add(r.id) : st.sel.delete(r.id)))) : null;
  return h("tr", cls, { key: r.id, "data-id": r.id, onClick: tap && !d.ed ? () => v.tap(tap) : undefined }, d.handles ? grip(v, r) : null, pick, ...tds, edit);
}

function body(v: View, d: Shown): ReactNode {
  const { b, st } = v;
  const rows = d.rows.map((r, i) => (r.group ? group(v, d, i) : item(v, d, r)));
  if (!d.items.length) {
    const clear = b.rows.length ? btn("clear", "", undefined, undefined, go(v, () => (st.q = ""))) : null;
    const td = h("td", "", { colSpan: d.cols.length + (d.pick ? 1 : 0) + (d.handles ? 1 : 0) }, b.rows.length ? `No rows match “${st.q}”. ` : (b.empty ?? "No rows yet."), clear);
    rows.push(h("tr", "tbe", { key: "~" }, td));
  }
  return h("tbody", "", d.ed ? keys(v) : null, ...rows);
}

function foot(v: View, d: Shown): ReactNode {
  if (!d.items.length || !d.cols.some((x) => x.total)) return null;
  const wait = d.items.some((r) => waits(v, r));
  const tds = d.cols.slice(1).map((x, j) => {
    const i = j + 1;
    const t = total(x, d.items);
    const part = d.role[i] === "title" ? "meta" : (d.role[i] ?? "meta");
    return cell("td", x, part, t ? [...(t[0] ? [h("span", "agg", null, t[0]), " "] : []), t[1]] : [], !t, { className: t && wait && role(v.b, x) === "app" ? "wait" : undefined });
  });
  return h("tfoot", "", null, h("tr", "", null, d.handles ? h("td", "tbg", null) : null, d.pick ? h("td", "tbc", null) : null, h("th", "p-title", { scope: "row" }, "Total"), ...tds));
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
  const cur = st.cur && items.some((r) => r.id === st.cur?.row) && cols.some((x) => x.id === st.cur?.col) ? pk(st.cur) : null;
  const first = items[0] && cols[0] ? pk({ row: items[0].id, col: cols[0].id }) : "";
  return { cols, role: roles(cols), rows, items, pick: !!b.select && b.rows.length > 0, sel, all: sel > 0 && sel === items.length, handles, ed: !!b.edit, tab: cur ?? first };
}

function open(v: View, p: Pos, typed: string | null = null) {
  const td = cellAt(v, p);
  const now = v.st.open !== null && pk(v.st.open) === pk(p);
  if (!v.b.edit || !td || now || td.getAttribute("aria-disabled") === "true" || sent(v, p.row, p.col) !== undefined || !rules.word(v.b, { row: p.row, column: p.col })) return;
  v.st.open = { ...p, typed };
}

function keys(v: View): Attrs {
  const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  const onKeyDown = (e: KeyboardEvent) => {
    const td = e.target instanceof HTMLElement && e.target.matches("td[data-c]") ? e.target : null;
    const row = td?.parentElement?.dataset["id"];
    if (!td || !row || !td.dataset["c"]) return;
    const p = { row, col: td.dataset["c"] };
    const m = moves[e.key];
    const d = shows(v),
      ids = d.items.map((i) => i.id),
      cols = d.cols.map((i) => i.id);
    if (m) (v.st.cur = { row: fit(ids, row, m[0]), col: fit(cols, p.col, m[1]) }), (v.st.focus = true);
    else if (e.key === "Enter") open(v, p);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== " ") open(v, p, e.key);
    else return;
    e.preventDefault();
    v.draw();
  };
  const onClick = (e: MouseEvent) => {
    const td = e.target instanceof Element ? e.target.closest<HTMLElement>("td[data-c]") : null;
    const row = td?.parentElement?.dataset["id"];
    if (!td || !row || !td.dataset["c"] || td.querySelector(".tbi")) return;
    v.st.cur = { row, col: td.dataset["c"] };
    open(v, v.st.cur);
    v.draw();
  };
  return { onKeyDown, onClick };
}

function sheet(v: View, d: Shown): ReactNode {
  const { b, st } = v;
  const r = d.items.find((i) => i.id === st.sheet);
  if (!r) return null;
  const g = [...d.rows].reverse().find((x, i, all) => x.group && all.indexOf(r) < i);
  const mine = g ? itemsOf(d.rows, d.rows.indexOf(g)) : [];
  const where = g ? h("span", "shp", null, `${named(b, g)} · ${mine.indexOf(r) + 1} of ${mine.length}`) : null;
  const tap = r.tap;
  const top = h("div", "b-sheet__head", null, h("b", "b-sheet__title", null, named(b, r), where), tap ? btn("open", "", undefined, undefined, { onClick: () => v.tap(tap) }) : null, btn("done", "", undefined, undefined, go(v, () => (st.sheet = ""))));
  const fields = b.columns.map((x) => {
    const k = role(b, x),
      u = unit(x);
    const typed = k === "ed" && !r.fixed;
    const out = sent(v, r.id, x.id) !== undefined;
    const ing = typed && !out && rules.word(b, { row: r.id, column: x.id }) !== null;
    const bad = ing && st.bad.has(`f\n${pk({ row: r.id, col: x.id })}`);
    const box = h("span", ["shv", ing ? "ing" : "", bad ? "bad" : ""].filter(Boolean).join(" "), null, ...(typed ? (ing ? input(v, r, x, true) : []) : [shown(x, at(r, x.id))]));
    const cls = [out ? "sent" : "", k === "app" && waits(v, r) ? "wait" : ""].filter(Boolean).join(" ");
    return h("label", `fd shf ${atEnd(x) ? "end" : "start"}`, { className: cls || undefined }, h("span", "fk", null, x.label, u ? h("span", "tbu", null, u) : null), box);
  });
  return h("div", "tbsh", { key: `sheet${st.gen}` }, h("div", "b-sheet__card", { role: "dialog", "aria-label": `Edit ${named(b, r)}` }, top, ...fields));
}

function state(b: Table, st: St): St {
  if (st.b === b) return st;
  const now = new Map(b.rows.map((r) => [r.id, JSON.stringify(r)]));
  if (st.seen.size && JSON.stringify([...now]) !== JSON.stringify([...st.seen])) {
    st.changed = new Set(b.rows.filter((r) => st.seen.get(r.id) !== now.get(r.id)).map((r) => r.id));
    st.fresh = new Set([...st.changed].filter((r) => !st.seen.has(r)));
    st.no = "";
  }
  return Object.assign(st, { b, seen: now, gen: st.gen + 1, open: null });
}

const init = (b: Table): St => ({
  b: null,
  gen: 0,
  sort: b.sort ?? null,
  q: "",
  hidden: new Set(b.columns.filter((x) => x.hide).map((x) => x.id)),
  sel: new Set(),
  menu: "",
  seen: new Map(),
  changed: new Set(),
  fresh: new Set(),
  cur: null,
  focus: false,
  typed: null,
  no: "",
  sheet: "",
  open: null,
  bad: new Set(),
  fields: new Map(),
});

/// A table as the HTML renderer draws one; its reorder and cell edit run on the same gesture driver, wired from refs.
export function table({ b, hooks }: V<Table>) {
  const cx = useContext(Cx);
  const live = useRef(cx);
  live.current = cx;
  const keep = useRef(new Map<string, Held>());
  const wired = useRef(new WeakSet<Element>());
  const box = useRef<HTMLDivElement>(null);
  const kept = useRef<St | null>(null);
  const [, draw] = useReducer((n: number) => n + 1, 0);
  const st = state(b, (kept.current ??= init(b)));
  const v: View = { b, c: { act: (a) => live.current.act(a), held: keep.current }, tap: (t) => live.current.tap(t), st, box, wired: wired.current, draw };
  useLayoutEffect(() => {
    if (!st.focus || !st.cur) return;
    st.focus = false;
    cellAt(v, st.cur)?.focus();
  });
  const d = shows(v);
  const t = h("table", "", d.ed ? { role: "grid" } : null, h("caption", "", null, b.title ?? "Table"), head(v, d), body(v, d), foot(v, d));
  const cls = ["tbl", d.sel > 0 ? "bulk" : "", b.edit || b.reorder ? "ed" : ""].filter(Boolean).join(" ");
  return h("div", cls, { ...hooks, ref: box }, ...bar(v, d), h("div", "tbw", { key: `w${st.gen}` }, t), sheet(v, d));
}
