/* Preview-only port of the proposed `table` kind, used to draw these mockups. Not product code. */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CUR = { THB: "฿", USD: "$", EUR: "€" };
const FMT = { csv: "CSV", xlsx: "Excel" };
const blank = (v) => v === null || v === undefined || v === "";
const numeric = (c) => c.kind === "number" || c.kind === "money" || c.kind === "bar";
const align = (c) => c.align ?? (numeric(c) ? "end" : "start");
const num = (v, d = 2, min = 0) => Number(v).toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: d });
const unit = (c) => (c.kind === "money" ? CUR[c.currency] ?? c.currency : c.unit);
function shown(c, v) {
  if (blank(v)) return "";
  if (c.kind === "money") return num(v, 2, 2);
  if (numeric(c)) return num(v, c.digits ?? 2);
  if (c.kind === "date") {
    const [y, m, d] = String(v).split("-");
    return `${Number(d)} ${MON[Number(m) - 1]} ${c.era === "be" ? Number(y) + 543 : y}`;
  }
  if (c.kind === "tone") return typeof v === "string" ? v : v.text;
  return String(v);
}
function roles(cols) {
  const r = {};
  const has = (p) => cols.some((c) => r[c.id] === p);
  for (const c of cols) if (c.phone) r[c.id] = c.phone;
  for (const c of cols) if (!r[c.id] && c.kind === "text" && !has("title")) r[c.id] = "title";
  for (const c of cols) if (!r[c.id] && c.kind === "tone" && !has("tag")) r[c.id] = "tag";
  const nums = cols.filter((c) => !r[c.id] && (c.kind === "number" || c.kind === "money"));
  const v = nums.filter((c) => c.total).pop() ?? nums.pop();
  if (v && !has("value")) r[v.id] = "value";
  for (const c of cols) r[c.id] ??= "meta";
  return r;
}
function sorted(cols, rows, s) {
  if (!s) return rows;
  const c = cols.find((x) => x.id === s.by);
  const k = numeric(c) ? Number : c.kind === "date" ? String : (v) => shown(c, v).toLowerCase();
  return rows.map((r, i) => [r, i]).sort(([a, i], [b, j]) => {
    const x = a.cells[c.id], y = b.cells[c.id];
    if (blank(x) || blank(y)) return blank(x) - blank(y) || i - j;
    const o = k(x) < k(y) ? -1 : k(x) > k(y) ? 1 : 0;
    return (s.dir === "desc" ? -o : o) || i - j;
  }).map(([r]) => r);
}
function matches(cols, row, q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const text = cols.map((c) => shown(c, row.cells[c.id]).toLowerCase());
  return words.every((w) => text.some((t) => t.includes(w)));
}
function total(c, rows) {
  const vs = rows.map((r) => r.cells[c.id]).filter((v) => !blank(v));
  if (c.total === "count") return ["count", String(vs.length)];
  if (!vs.length) return ["", "—"];
  const sum = vs.reduce((a, v) => a + Number(v), 0);
  if (c.total === "avg") return ["avg", num(sum / vs.length, 1)];
  return ["", c.kind === "money" ? num(sum, 2, 2) : num(sum)];
}
function h(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...kids.filter((k) => k !== null && k !== undefined));
  return e;
}
const btn = (label, cls = "") => { const b = h("button", cls, h("span", "", label)); b.type = "button"; return b; };
const box = (on, mixed = false, label = "") => {
  const i = h("input");
  i.type = "checkbox";
  i.checked = on;
  i.indeterminate = mixed;
  if (label) i.setAttribute("aria-label", label);
  return i;
};
const arrow = (dir) => (dir === "asc" ? "↑" : dir === "desc" ? "↓" : "");
const sized = (el, c) => { if (c.width) { el.classList.add("w"); el.style.setProperty("--w", `${c.width}ch`); } };

function cell(c, v, max) {
  if (blank(v)) return [];
  if (c.kind === "tone") return [h("span", `tag ${typeof v === "string" ? "" : v.tone ?? ""}`.trim(), shown(c, v))];
  if (c.kind === "bar") {
    const fill = h("i");
    fill.style.width = `${Math.max(0, Math.min(1, Number(v) / max)) * 100}%`;
    return [h("span", `tbb ${c.tone ?? ""}`.trim(), fill), shown(c, v)];
  }
  return [shown(c, v)];
}

function table(b, st = {}) {
  const js = st.js !== false;
  const hidden = st.hidden ?? b.columns.filter((c) => c.hide).map((c) => c.id);
  const cols = b.columns.filter((c, i) => i === 0 || !js || !hidden.includes(c.id));
  const role = roles(cols);
  const sort = st.sort === undefined ? b.sort ?? null : st.sort;
  const q = js ? st.q ?? "" : "";
  const kept = b.rows.filter((r) => matches(cols, r, q));
  const rows = sorted(cols, kept, sort);
  const sel = js && b.select ? (st.sel ?? []).filter((id) => kept.some((r) => r.id === id)) : [];
  const pick = js && b.select && b.rows.length;
  const n = b.rows.length;
  const max = Object.fromEntries(b.columns.filter((c) => c.kind === "bar").map((c) => [c.id, c.max ?? Math.max(1, ...b.rows.map((r) => Number(r.cells[c.id]) || 0))]));
  const count = q ? `${kept.length} of ${n} rows` : `${n} ${n === 1 ? "row" : "rows"}`;

  const root = h("div", `tbl b b-table${sel.length ? " bulk" : ""}`);
  root.dataset.block = "table";
  root.dataset.id = b.id;
  const all = pick && rows.length && sel.length === rows.length;
  const head = h("div", "tbh");
  if (pick) { const k = box(all, sel.length > 0 && !all, "Select all shown rows"); k.className = "tbk"; head.append(k); }
  if (sel.length) {
    head.append(h("b", "tbt", `${sel.length} selected`));
    for (const a of b.select.actions) head.append(btn(a.label, a.bad ? "bad" : ""));
    head.append(h("span", "tbn"));
  } else head.append(b.title ? h("b", "tbt", b.title) : null, h("span", "tbn", count));
  if (js && n && !sel.length) {
    if (b.filter !== false) {
      const input = h("input", "tbq");
      input.type = "search";
      input.placeholder = "filter";
      input.value = q;
      input.setAttribute("aria-label", `Filter ${b.title ?? "rows"}`);
      head.append(input);
    }
    const s = h("select", "tbs");
    s.setAttribute("aria-label", "Sort");
    const opt = (v, t) => { const o = h("option", "", t); o.value = v; o.selected = v === (sort ? `${sort.by}:${sort.dir}` : ""); s.append(o); };
    opt("", "sort: as sent");
    for (const c of cols) if (c.sort !== false) { opt(`${c.id}:asc`, `sort: ${c.label.toLowerCase()} ↑`); opt(`${c.id}:desc`, `sort: ${c.label.toLowerCase()} ↓`); }
    head.append(s);
    if (b.columns.length > 2) {
      const m = btn(hidden.length ? `columns · ${hidden.length} hidden` : "columns");
      m.setAttribute("aria-expanded", String(st.menu === "columns"));
      head.append(m);
    }
  }
  if (js && n && b.export?.length) {
    const e = btn(b.export.length === 1 ? `export ${FMT[b.export[0]].toLowerCase()}` : "export");
    if (b.export.length > 1) e.setAttribute("aria-expanded", String(st.menu === "export"));
    head.append(e);
  }
  if (sel.length) head.append(btn("clear"));
  root.append(head);

  if (st.menu === "columns") {
    const m = h("div", "tbm");
    m.setAttribute("role", "group");
    m.setAttribute("aria-label", "Columns");
    b.columns.forEach((c, i) => {
      const k = box(i === 0 || !hidden.includes(c.id));
      k.disabled = i === 0;
      m.append(h("label", "", k, c.label));
    });
    root.append(m);
  }
  if (st.menu === "export") {
    const m = h("div", "tbm");
    m.setAttribute("role", "menu");
    for (const f of b.export) m.append(btn(FMT[f], "pick"));
    m.append(h("p", "note", sel.length ? `${sel.length} selected rows` : `${kept.length} rows, as sorted and shown`));
    root.append(m);
  }

  const t = h("table");
  t.append(h("caption", "", b.title ?? "Table"));
  const hr = h("tr");
  if (pick) { const th = h("th", "tbc"); th.append(box(all, sel.length > 0 && !all, "Select all shown rows")); hr.append(th); }
  for (const c of cols) {
    const th = h("th", `${align(c)} k-${c.kind}`);
    th.scope = "col";
    sized(th, c);
    const on = sort && sort.by === c.id;
    if (on) th.setAttribute("aria-sort", sort.dir === "asc" ? "ascending" : "descending");
    const u = unit(c);
    const label = [h("span", "", c.label), u ? h("span", "tbu", u) : null, h("i", "", on ? arrow(sort.dir) : "")];
    if (js && c.sort !== false) { const x = h("button", "tsh", ...label); x.type = "button"; th.append(x); }
    else th.append(...label.filter(Boolean));
    hr.append(th);
  }
  t.append(h("thead", "", hr));

  const body = h("tbody");
  for (const r of rows) {
    const prev = st.prev?.[r.id];
    const changed = st.added?.includes(r.id) || (prev && cols.some((c) => JSON.stringify(prev[c.id]) !== JSON.stringify(r.cells[c.id])));
    const on = sel.includes(r.id);
    const tr = h("tr", [r.tap ? "tap" : "", changed ? "chg" : "", on ? "sel" : ""].join(" ").trim());
    tr.dataset.id = r.id;
    if (r.tap) tr.tabIndex = 0;
    if (pick) { const td = h("td", "tbc"); td.append(box(on, false, `Select ${r.id}`)); tr.append(td); }
    for (const c of cols) {
      const v = r.cells[c.id];
      const td = h("td", `${align(c)} k-${c.kind} p-${role[c.id]}`);
      td.dataset.l = c.label;
      sized(td, c);
      if (c.width && !blank(v)) td.title = shown(c, v);
      td.append(...cell(c, v, max[c.id]));
      if (blank(v)) td.classList.add("nil");
      tr.append(td);
    }
    body.append(tr);
  }
  if (!rows.length) {
    const td = h("td", "");
    td.colSpan = cols.length + (pick ? 1 : 0);
    if (n) td.append(`No rows match “${q}”. `, btn("clear"));
    else td.append(b.empty ?? "No rows yet.");
    body.append(h("tr", "tbe", td));
  }
  t.append(body);

  if (rows.length && cols.some((c) => c.total)) {
    const fr = h("tr");
    if (pick) fr.append(h("td", "tbc"));
    cols.forEach((c, i) => {
      if (i === 0) { const th = h("th", "p-title", "Total"); th.scope = "row"; fr.append(th); return; }
      const td = h("td", `${align(c)} k-${c.kind} p-${role[c.id] === "title" ? "meta" : role[c.id]}`);
      td.dataset.l = c.label;
      if (c.total) { const [w, v] = total(c, rows); if (w) td.append(h("span", "agg", w), " "); td.append(v); }
      else td.classList.add("nil");
      fr.append(td);
    });
    t.append(h("tfoot", "", fr));
  }
  root.append(h("div", "tbw", t));
  return root;
}

function fallback(b) {
  const tc = b.columns.find((c) => c.total && c.total !== "count");
  const sub = tc ? `Total ${tc.label.toLowerCase()} ${unit(tc) ?? ""}${total(tc, b.rows)[1]}` : null;
  const n = b.rows.length;
  const row = h("div", "row b b-row", h("span", "rm", h("span", "rt", b.title ?? "Table"), sub ? h("span", "rs", sub) : null), h("span", "rv", `${n} rows`));
  row.dataset.block = "row";
  return row;
}
