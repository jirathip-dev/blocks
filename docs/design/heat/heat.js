/* Preview-only port of the proposed `heat` renderer, used to draw these images. Not product code. */
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function hfmt(v, f) {
  if (v == null) return "—";
  const n = (x, d) => x.toLocaleString("en-US", { maximumFractionDigits: d });
  if (f === "thb") return "฿" + n(v, 0);
  if (f === "thb_m") return Math.abs(v) >= 1e6 ? "฿" + n(v / 1e6, 1) + "M" : Math.abs(v) >= 1e3 ? "฿" + n(v / 1e3, 0) + "K" : "฿" + n(v, 0);
  if (f === "percent") return n(v, 1) + "%";
  return n(v, 0);
}
function niceStep(raw) {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
}
function range(b) {
  const vs = b.rows.flatMap(r => r.cells.map(c => c && c.value)).filter(v => v != null);
  const sc = b.scale || {};
  if (!vs.length) return { min: sc.min ?? 0, max: sc.max ?? 1, vs };
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const min = sc.min ?? (lo >= 0 ? 0 : lo);
  const raw = (hi - min) / 5 || 1, u = Math.pow(10, Math.floor(Math.log10(raw))), max = sc.max ?? min + 5 * Math.ceil(raw / u) * u;
  return { min, max, vs, under: sc.min != null && lo < sc.min, over: sc.max != null && hi > sc.max };
}
function step(v, r) {
  if (r.max === r.min) return 3;
  return Math.max(1, Math.min(5, Math.floor(((v - r.min) / (r.max - r.min)) * 5) + 1));
}
function said(b, row, col, c) {
  const u = b.scale && b.scale.unit ? " " + b.scale.unit : "";
  const val = c && c.value != null ? hfmt(c.value, b.format) + u : (b.lang === "th" ? "ไม่มีข้อมูล" : "no data");
  return `${row}, ${col}: ${val}` + (c && c.label ? `, ${c.label}` : "");
}
function readout(o, b, ri, ci, how) {
  o.replaceChildren();
  const r = b.rows[ri], c = r && r.cells[ci];
  if (!r) return;
  if (how) o.append(el("span", null, how));
  o.append(el("span", "at", `${r.name} · ${b.columns[ci]}`));
  const u = b.scale && b.scale.unit ? " " + b.scale.unit : "";
  o.append(el("b", null, c && c.value != null ? hfmt(c.value, b.format) + u : "—"));
  if (c && c.label) o.append(el("span", null, c.label));
}

function heat(b) {
  const root = el("div", "card heat" + (b.tone ? " hk-" + b.tone : ""));
  root.setAttribute("role", "figure");
  root.setAttribute("aria-label", b.title);
  root.append(el("div", "hmt", b.title));
  const r = range(b), o = el("div", "hmo");
  o.setAttribute("aria-live", "polite");
  root.append(o);
  if (!r.vs.length && b.rows.every(x => x.cells.every(c => !c || !c.label))) {
    root.append(el("div", "hme", b.empty || "No data yet"));
    return root;
  }
  let peak = null;
  b.rows.forEach((row, ri) => row.cells.forEach((c, ci) => { if (c && c.value != null && (!peak || c.value > peak.v)) peak = { ri, ci, v: c.value }; }));
  const sel = b.selected ? { ri: b.rows.findIndex(x => x.name === b.selected.row), ci: b.columns.indexOf(b.selected.column) } : null;
  const rest = () => sel ? readout(o, b, sel.ri, sel.ci) : peak && readout(o, b, peak.ri, peak.ci, b.lang === "th" ? "สูงสุด" : "Peak");
  rest();

  const w = el("div", "hmw"), t = el("table"), cg = el("colgroup");
  cg.append(el("col", "rh"));
  b.columns.forEach(() => cg.append(el("col", "c")));
  t.append(cg);
  t.style.minWidth = `calc(var(--hm-rh,88px) + ${b.columns.length} * (var(--ctl) + var(--seam)))`;
  const hr = el("tr");
  hr.append(el("td"));
  hr.firstChild.style.background = "none";
  hr.firstChild.style.height = "auto";
  b.columns.forEach(c => { const th = el("th", null, c); th.scope = "col"; hr.append(th); });
  const th = el("thead"); th.append(hr); t.append(th);
  const tb = el("tbody");
  let first = true;
  b.rows.forEach((row, ri) => {
    const tr = el("tr"), rh = el("th", null, row.name);
    rh.scope = "row";
    tr.append(rh);
    b.columns.forEach((col, ci) => {
      const c = row.cells[ci], has = c && c.value != null;
      const td = el("td", has ? "s" + step(c.value, r) : "e");
      if (sel && sel.ri === ri && sel.ci === ci) td.classList.add("sel");
      const lb = el("span", "lb", c && c.label ? c.label : (has ? "" : "–"));
      lb.setAttribute("aria-hidden", "true");
      if (b.tap) {
        const bt = el("button");
        bt.type = "button";
        bt.setAttribute("aria-label", said(b, row.name, col, c));
        bt.tabIndex = (sel ? sel.ri === ri && sel.ci === ci : first) ? 0 : -1;
        first = false;
        bt.append(lb);
        bt.addEventListener("mouseenter", () => readout(o, b, ri, ci));
        bt.addEventListener("mouseleave", rest);
        td.append(bt);
      } else {
        const v = el("span", "v");
        v.append(lb, el("span", "sr", said(b, row.name, col, c)));
        td.append(v);
      }
      tr.append(td);
    });
    tb.append(tr);
  });
  t.append(tb); w.append(t); root.append(w);

  const lg = el("div", "hml"), ramp = el("div", "ramp"), ed = el("div", "rx");
  lg.setAttribute("aria-label", `Scale ${hfmt(r.min, b.format)} to ${hfmt(r.max, b.format)}${b.scale && b.scale.unit ? " " + b.scale.unit : ""}`);
  if (b.scale && b.scale.unit) lg.append(el("span", "u", b.scale.unit));
  for (let i = 1; i <= 5; i++) ramp.append(el("i", "s" + i));
  for (let i = 0; i <= 5; i++) {
    const e = el("span", null, (i === 0 && r.under ? "≤" : i === 5 && r.over ? "≥" : "") + hfmt(r.min + ((r.max - r.min) * i) / 5, b.format));
    e.style.left = (i * 20) + "%";
    if (b.edges === "ends" && i > 0 && i < 5) continue;
    ed.append(e);
  }
  ramp.append(ed); lg.append(ramp);
  if (b.rows.some(x => x.cells.some(c => !c || c.value == null))) {
    const nd = el("span", "nd"); nd.append(el("i"), b.lang === "th" ? "ไม่มีข้อมูล" : "No data"); lg.append(nd);
  }
  root.append(lg);
  return root;
}
