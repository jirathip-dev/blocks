/* Preview-only port of the proposed `table` kind, used to draw these mockups. Not product code. */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const blank = (v) => v === null || v === undefined || v === "";
const align = (c) => c.align ?? (c.kind === "number" ? "end" : "start");
const num = (v, d = 2) => Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
function shown(c, v) {
  if (blank(v)) return "";
  if (c.kind === "number") return num(v, c.digits ?? 2);
  if (c.kind === "date") { const [y, m, d] = String(v).split("-"); return `${Number(d)} ${MON[Number(m) - 1]} ${y}`; }
  if (c.kind === "tone") return typeof v === "string" ? v : v.text;
  return String(v);
}
function roles(cols) {
  const r = {};
  const has = (p) => cols.some((c) => r[c.id] === p);
  for (const c of cols) if (c.phone) r[c.id] = c.phone;
  for (const c of cols) if (!r[c.id] && c.kind === "text" && !has("title")) r[c.id] = "title";
  for (const c of cols) if (!r[c.id] && c.kind === "tone" && !has("tag")) r[c.id] = "tag";
  const nums = cols.filter((c) => !r[c.id] && c.kind === "number");
  const v = nums.filter((c) => c.total).pop() ?? nums.pop();
  if (v && !has("value")) r[v.id] = "value";
  for (const c of cols) r[c.id] ??= "meta";
  return r;
}
function sortKey(c, v) { return c.kind === "number" ? Number(v) : shown(c, v).toLowerCase(); }
function sorted(cols, rows, s) {
  if (!s) return rows;
  const c = cols.find((x) => x.id === s.by);
  const k = c.kind === "date" ? (v) => String(v) : (v) => sortKey(c, v);
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
  return c.total === "avg" ? ["avg", num(sum / vs.length, 1)] : ["", num(sum)];
}
function h(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...kids.filter((k) => k !== null && k !== undefined));
  return e;
}
const arrow = (dir) => (dir === "asc" ? "↑" : dir === "desc" ? "↓" : "");

function table(b, st = {}) {
  const js = st.js !== false;
  const cols = b.columns;
  const role = roles(cols);
  const sort = st.sort === undefined ? b.sort ?? null : st.sort;
  const q = js ? st.q ?? "" : "";
  const kept = b.rows.filter((r) => matches(cols, r, q));
  const rows = sorted(cols, kept, sort);
  const n = b.rows.length;
  const count = q ? `${kept.length} of ${n} rows` : `${n} ${n === 1 ? "row" : "rows"}`;

  const root = h("div", "tbl b b-table");
  root.dataset.block = "table";
  root.dataset.id = b.id;
  const head = h("div", "tbh", b.title ? h("b", "tbt", b.title) : null, h("span", "tbn", count));
  if (js && b.filter !== false && n) {
    const input = h("input", "tbq");
    input.type = "search";
    input.placeholder = "filter";
    input.value = q;
    input.setAttribute("aria-label", `Filter ${b.title ?? "rows"}`);
    head.append(input);
  }
  if (js && n) {
    const sel = h("select", "tbs");
    sel.setAttribute("aria-label", "Sort");
    const opt = (v, t) => { const o = h("option", "", t); o.value = v; o.selected = v === (sort ? `${sort.by}:${sort.dir}` : ""); sel.append(o); };
    opt("", "sort: as sent");
    for (const c of cols) if (c.sort !== false) { opt(`${c.id}:asc`, `sort: ${c.label.toLowerCase()} ↑`); opt(`${c.id}:desc`, `sort: ${c.label.toLowerCase()} ↓`); }
    head.append(sel);
  }
  root.append(head);

  const t = h("table");
  const cap = h("caption", "", b.title ?? "Table");
  t.append(cap);
  const hr = h("tr");
  for (const c of cols) {
    const th = h("th", `${align(c)} k-${c.kind}`);
    th.scope = "col";
    const on = sort && sort.by === c.id;
    if (on) th.setAttribute("aria-sort", sort.dir === "asc" ? "ascending" : "descending");
    const label = [h("span", "", c.label), c.unit ? h("span", "tbu", c.unit) : null, h("i", "", on ? arrow(sort.dir) : "")];
    if (js && c.sort !== false) { const btn = h("button", "tsh", ...label); btn.type = "button"; th.append(btn); }
    else th.append(...label.filter(Boolean));
    hr.append(th);
  }
  t.append(h("thead", "", hr));

  const body = h("tbody");
  for (const r of rows) {
    const prev = st.prev?.[r.id];
    const changed = st.added?.includes(r.id) || (prev && cols.some((c) => JSON.stringify(prev[c.id]) !== JSON.stringify(r.cells[c.id])));
    const tr = h("tr", [r.tap ? "tap" : "", changed ? "chg" : ""].join(" ").trim());
    tr.dataset.id = r.id;
    if (r.tap) tr.tabIndex = 0;
    for (const c of cols) {
      const v = r.cells[c.id];
      const td = h("td", `${align(c)} k-${c.kind} p-${role[c.id]}`);
      td.dataset.l = c.label;
      if (c.kind === "tone" && !blank(v)) td.append(h("span", `tag ${typeof v === "string" ? "" : v.tone ?? ""}`.trim(), shown(c, v)));
      else td.append(shown(c, v));
      if (blank(v)) td.classList.add("nil");
      tr.append(td);
    }
    body.append(tr);
  }
  if (!rows.length) {
    const td = h("td", "");
    td.colSpan = cols.length;
    if (n) {
      const clear = h("button", "", h("span", "", "clear"));
      clear.type = "button";
      td.append(`No rows match “${q}”. `, clear);
    } else td.append(b.empty ?? "No rows yet.");
    body.append(h("tr", "tbe", td));
  }
  t.append(body);

  if (rows.length && cols.some((c) => c.total)) {
    const fr = h("tr");
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
  const sub = tc ? `Total ${tc.label.toLowerCase()} ${total(tc, b.rows)[1]}` : null;
  const n = b.rows.length;
  const row = h("div", "row b b-row", h("span", "rm", h("span", "rt", b.title ?? "Table"), sub ? h("span", "rs", sub) : null), h("span", "rv", `${n} rows`));
  row.dataset.block = "row";
  return row;
}
