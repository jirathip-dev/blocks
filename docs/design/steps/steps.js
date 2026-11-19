// Preview-only port used to draw these images; not product code.
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function fallback(b) { const f = el("div", "sp"); f.setAttribute("role", "group"); f.setAttribute("aria-label", b.title || "Steps"); f.append(el("p", "m", b.fallback || "Nothing to show yet.")); return f; }
function stepper(b) {
  const list = b.steps || [];
  if (!list.length) return fallback(b);
  const at = b.current == null ? list.length : list.findIndex(s => s.id === b.current);
  const box = el("div", "sp"); box.setAttribute("role", "group"); box.setAttribute("aria-label", b.title || "Steps");
  if (b.title) box.append(el("div", "sh", b.title));
  const ol = el("ol", "spl");
  list.forEach((s, i) => {
    const st = i < at ? "done" : i === at ? "now" : "todo";
    const li = el("li", "spi " + st);
    const c = el("div", "spc");
    const word = st === "done" ? "done" : st === "now" ? "current" : "to do";
    c.setAttribute("aria-label", `${s.label}, step ${i + 1} of ${list.length}, ${word}`);
    if (st === "now") li.setAttribute("aria-current", "step");
    if (st === "done" && s.tap) { c.classList.add("tap"); c.setAttribute("role", "button"); c.tabIndex = 0; }
    if (b.focus === s.id) c.classList.add("fv");
    const r = el("span", "spr"); r.setAttribute("aria-hidden", "true");
    r.append(el("i", "spm", st === "done" ? "✓" : String(i + 1)), el("span", "spk"));
    c.append(r, el("span", "spn", s.label));
    const sub = st === "now" ? (s.sub || `step ${i + 1} of ${list.length}`) : s.sub;
    if (sub) c.append(el("span", "sps", sub));
    c.title = s.label;
    li.append(c); ol.append(li);
  });
  box.append(ol);
  const x = el("div", "spx"); x.setAttribute("aria-hidden", "true");
  const cur = list[at];
  x.append(el("b", "", cur ? cur.label : "All done"), el("span", "m", cur ? `step ${at + 1} of ${list.length}` + (cur.sub ? " · " + cur.sub : "") : `${list.length} of ${list.length}`));
  box.append(x);
  return box;
}
function bar(r) {
  const v = Math.max(0, Math.min(100, Math.round(Number(r.value) || 0)));
  const row = el("div", "pgr" + (r.tone ? " " + r.tone : "") + (v === 0 ? " zero" : ""));
  row.setAttribute("role", "progressbar"); row.setAttribute("aria-valuemin", "0"); row.setAttribute("aria-valuemax", "100");
  row.setAttribute("aria-valuenow", String(v)); row.setAttribute("aria-label", r.label); if (r.sub) row.setAttribute("aria-valuetext", `${v}%, ${r.sub}`);
  const t = el("span", "pgt"); t.style.setProperty("--v", v); t.append(el("b"));
  row.append(el("span", "pgn", r.label), el("span", "pgv", v + "%"), t);
  if (r.sub) row.append(el("span", "pgs", r.sub));
  return row;
}
function progress(b) {
  const rows = b.bars || (b.value != null ? [{ label: b.label || b.title, value: b.value, tone: b.tone, sub: b.sub }] : []);
  if (!rows.length) return fallback(b);
  const box = el("div", "pg"); box.setAttribute("role", "group"); box.setAttribute("aria-label", b.title || b.label || "Progress");
  if (b.title && b.bars) box.append(el("div", "sh", b.title));
  const l = el("div", "pgl" + (b.bars ? " rows" : "")); rows.forEach(r => l.append(bar(r))); box.append(l);
  return box;
}
function steps(b) { return b.steps ? stepper(b) : b.value != null || b.bars ? progress(b) : fallback(b); }
function draw() {
  document.querySelectorAll("[data-b]").forEach(n => n.replaceWith(steps(JSON.parse(n.dataset.b))));
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
