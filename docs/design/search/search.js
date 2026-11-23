// Preview-only port used to draw these images; not product code.
const WORDS = {
  en: { clear: "clear", of: "{n} of {m}", none: "no match", busy: "searching", nomatch: "No rows match “{q}”. ", rows: "{n} of {m} rows", all: "{m} rows" },
  th: { clear: "ล้าง", of: "{n} จาก {m}", none: "ไม่พบ", busy: "กำลังค้นหา", nomatch: "ไม่มีแถวที่ตรงกับ “{q}” ", rows: "{n} จาก {m} แถว", all: "{m} แถว" },
};
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function say(w, key, v) { return w[key].replace(/\{(\w+)\}/g, (_, k) => v[k]); }
function btn(label, cls, name) { const b = el("button", cls || ""); b.type = "button"; b.append(el("span", "", label)); if (name) b.setAttribute("aria-label", name); return b; }
const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const hits = (text, q) => words(q).every((x) => text.toLowerCase().includes(x));
function search(x, w, count) {
  count = count || x.count;
  const box = el("span", "sb");
  const i = el("input"); i.type = "search"; i.value = x.value || ""; i.placeholder = x.placeholder || ""; i.setAttribute("aria-label", x.label);
  if (x.off) i.disabled = true;
  const n = el("span", "sbn"); n.setAttribute("aria-live", "polite");
  if (x.busy) { box.setAttribute("aria-busy", "true"); n.textContent = w.busy; }
  else if (count && x.value) n.textContent = count.n ? say(w, "of", count) : w.none;
  box.append(i, n);
  if (x.value && !x.off) box.append(btn(w.clear, "sbx", w.clear));
  return box;
}
function field(x, w, solo, count) {
  const cls = "fd" + (x.type === "search" ? " sr" + (solo ? " solo" : "") + (x.off ? " off" : "") : x.type === "toggle" ? " tg" : "") + (x.error ? " err" : "");
  const l = el("label", cls);
  const fl = el("span", "fl"); fl.append(el("span", "fk", x.label), el("span", "fn", x.doc || ""));
  l.append(fl);
  if (x.type === "search") l.append(search(x, w, count));
  else if (x.type === "picker") { const s = el("select"); (x.options || []).forEach((o) => s.append(el("option", "", o))); s.value = x.value; l.append(s); }
  else if (x.type === "toggle") { const i = el("input"); i.type = "checkbox"; i.checked = !!x.value; i.setAttribute("role", "switch"); l.append(i); }
  else { const i = el("input"); i.value = x.value || ""; i.placeholder = x.placeholder || ""; l.append(i); }
  if (x.error) l.append(el("span", "fe", x.error));
  return l;
}
function row(r) {
  const d = el("div", "row" + (r.tap ? " tap" : "")); d.dataset.id = r.id || "";
  const m = el("span", "rm"); m.append(el("span", "rt", r.title));
  if (r.subtitle) m.append(el("span", "rs", r.subtitle));
  d.append(m);
  if (r.value) d.append(el("span", "rv", r.value));
  if (r.tap) d.append(el("span", "rc", "›"));
  return d;
}
function list(b) { const l = el("div", "list"); l.dataset.id = b.id; l.setAttribute("role", "list"); b.rows.forEach((r) => l.append(row(r))); return l; }
function table(b) {
  const t = el("div", "tbl"); t.dataset.id = b.id;
  t.append(el("div", "tbh"));
  const tb = el("table"), hd = el("thead"), tr = el("tr");
  b.columns.forEach((c) => tr.append(el("th", c.end ? "end" : "", c.label)));
  hd.append(tr);
  const body = el("tbody");
  b.rows.forEach((r) => { const x = el("tr"); b.columns.forEach((c) => x.append(el("td", c.end ? "end" : "", r[c.id] ?? ""))); body.append(x); });
  tb.append(hd, body);
  const wrap = el("div", "tbw"); wrap.append(tb); t.append(wrap);
  return t;
}
function section(b, w) { const s = el("section", "sec"); s.append(el("h3", "sh", b.header)); (b.blocks || []).forEach((x) => s.append(block(x, w))); return s; }
function text(b) { return el("p", "txt m", b.text); }
function block(b, w) { return b.kind === "list" ? list(b) : b.kind === "table" ? table(b) : b.kind === "section" ? section(b, w) : b.kind === "text" ? text(b) : form(b, w); }
function filter(target, q, w) {
  const isT = target.classList.contains("tbl");
  const rows = isT ? [...target.querySelectorAll("tbody tr")] : [...target.children];
  let n = 0;
  rows.forEach((r) => { const ok = !q || hits(r.textContent, q); r.hidden = !ok; if (ok) n++; });
  if (isT) {
    target.querySelector(".tbh").append(el("span", "tbn", q ? say(w, "rows", { n, m: rows.length }) : say(w, "all", { m: rows.length })));
    if (!n) { const tr = el("tr", "tbe"), td = el("td", "", say(w, "nomatch", { q })); td.colSpan = 9; td.append(btn(w.clear)); tr.append(td); target.querySelector("tbody").append(tr); }
  } else if (!n) { const m = el("div", "lsm sm", say(w, "nomatch", { q })); m.append(btn(w.clear)); target.append(m); }
  return { n, m: rows.length };
}
function form(b, w) {
  const f = el("div", "form"); f.dataset.id = b.id || "";
  const solo = b.fields.length === 1 && !b.submit;
  b.fields.forEach((x) => {
    let count = null;
    if (x.filters) { const t = document.querySelector(`[data-scope="${b.scope}"] [data-id="${x.filters}"]`); if (t) count = filter(t, x.value || "", w); }
    f.append(field(x, w, solo, count));
  });
  if (b.submit) { const r = el("div", "acts"); r.append(btn(b.submit)); f.append(r); }
  return f;
}
function draw() {
  document.querySelectorAll("[data-scope]").forEach((scope) => {
    const w = WORDS[scope.dataset.lang || "en"];
    const parts = [...scope.querySelectorAll(":scope > [data-b]")];
    const built = parts.map((n) => { const b = JSON.parse(n.dataset.b); b.scope = scope.dataset.scope; return [n, b]; });
    built.filter(([, b]) => b.kind !== "form").forEach(([n, b]) => n.replaceWith(block(b, w)));
    built.filter(([, b]) => b.kind === "form").forEach(([n, b]) => n.replaceWith(form(b, w)));
  });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
