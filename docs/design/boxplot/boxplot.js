/* Preview-only port of the proposed `boxplot` renderer, used to draw these images. Not product code. */
const TONE = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", mute: "--mute" };
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function places(b) {
  let d = 0;
  b.boxes.forEach(x => [x.min, x.q1, x.median, x.q3, x.max, ...(x.outliers || [])].forEach(v => {
    const s = String(v), i = s.indexOf("."); if (i >= 0) d = Math.max(d, s.length - i - 1);
  }));
  return Math.min(d, 2);
}
function num(v, d) { return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function nice(span) {
  const raw = span / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
}
function axis(b) {
  const all = b.boxes.flatMap(x => [x.min, x.max, ...(x.outliers || [])]);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (b.zero) lo = Math.min(lo, 0);
  const step = nice(hi - lo || 1);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  if (hi === Math.max(...all)) hi += step;
  if (!b.zero && lo === Math.min(...all) && lo > 0) lo -= step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}
function tone(x) { return `var(${TONE[x.tone] || "--l"})`; }
function words(x, b, d) {
  const u = b.unit ? " " + b.unit : "", o = x.outliers || [];
  return `median ${num(x.median, d)}${u}, quartiles ${num(x.q1, d)} to ${num(x.q3, d)}, range ${num(x.min, d)} to ${num(x.max, d)}` +
    (o.length ? `, ${o.length} outlier${o.length > 1 ? "s" : ""}: ${o.map(v => num(v, d)).join(", ")}` : "");
}
function readout(b, at, d) {
  const l = el("div", "chl bxl");
  if (at < 0) {
    const key = (cls, t) => { const s = el("span"); s.append(el("i", "bxk " + cls), t); l.append(s); };
    key("kr", "min to max"); key("kb", "Q1 to Q3"); key("km", "median"); key("ko", "outlier");
    return l;
  }
  const x = b.boxes[at], u = b.unit ? " " + b.unit : "", it = (k, v) => { const s = el("span", null, k); s.append(el("b", null, v)); l.append(s); };
  const n = el("span", "chx"); const k = el("i", "chk"); k.style.setProperty("--k", tone(x)); n.append(k, x.name); l.append(n);
  it("median", num(x.median, d) + u); it("Q1–Q3", num(x.q1, d) + " – " + num(x.q3, d)); it("min–max", num(x.min, d) + " – " + num(x.max, d));
  if ((x.outliers || []).length) it("outliers", x.outliers.map(v => num(v, d)).join(", "));
  return l;
}
function boxplot(b) {
  const root = el("div", "card chart bxp");
  root.setAttribute("role", "figure"); root.setAttribute("aria-label", b.title);
  root.append(el("div", "cht", b.title));
  const n = b.boxes.length, empty = n === 0, d = empty ? 0 : places(b);
  const at = b.selected != null ? b.boxes.findIndex(x => x.name === b.selected) : -1;
  root.append(readout(b, empty ? -1 : at, d));
  const g = el("div", "chg"), ya = el("div", "chy"), p = el("div", "chp"), xa = el("div", "chx2 bxx");
  const ax = el("div", "bxa", b.axis + (b.unit ? " (" + b.unit + ")" : "")); g.append(ax);
  g.style.setProperty("--n", Math.max(n, 1)); g.style.setProperty("--sw", Math.ceil(n / 12)); g.style.setProperty("--sp", Math.ceil(n / 8));
  if (empty) {
    p.append(el("div", "che", b.empty || "No data yet"));
  } else {
    const { lo, hi, ticks } = axis(b), pct = v => (hi - v) / (hi - lo) * 100;
    ticks.forEach(v => {
      const t = el("span", null, num(v, Number.isInteger(v) ? 0 : 1)); t.style.top = pct(v) + "%"; ya.append(t);
      const gl = el("i", v === lo ? "bxg base" : "bxg"); gl.style.top = pct(v) + "%"; p.append(gl);
    });
    if (at >= 0) { const band = el("i", "chb bxb"); band.style.left = ((at + 0.5) / n * 100) + "%"; p.append(band); }
    b.boxes.forEach((x, i) => {
      const c = el("div", "bx"); c.style.left = ((i + 0.5) / n * 100) + "%"; c.style.setProperty("--k", tone(x));
      c.setAttribute("aria-hidden", "true");
      const part = (cls, top, bottom) => { const e = el("i", cls); e.style.top = pct(top) + "%"; e.style.bottom = (100 - pct(bottom)) + "%"; c.append(e); };
      part("w", x.max, x.min); part("q", x.q3, x.q1);
      const m = el("i", "m"); m.style.top = pct(x.median) + "%"; c.append(m);
      const cap = (v) => { const e = el("i", "cap"); e.style.top = pct(v) + "%"; c.append(e); }; cap(x.max); cap(x.min);
      (x.outliers || []).forEach(v => { const o = el("i", "o"); o.style.top = pct(v) + "%"; c.append(o); });
      p.append(c);
    });
    b.boxes.forEach((x, i) => {
      const c = el("button", "chc"); c.type = "button";
      c.style.left = (i / n * 100) + "%"; c.style.width = (100 / n) + "%";
      c.setAttribute("aria-label", x.name + ": " + words(x, b, d));
      if (i === at) c.setAttribute("aria-pressed", "true");
      p.append(c);
    });
    const sw = Math.ceil(n / 12), sp = Math.ceil(n / 8);
    b.boxes.forEach((x, i) => {
      const t = el("span", (i % sw === 0 ? "w " : "") + (i % sp === 0 ? "p " : "") + (i === at ? "sel" : ""), x.name);
      t.style.left = ((i + 0.5) / n * 100) + "%"; xa.append(t);
    });
  }
  g.append(ya, p, xa); root.append(g);
  const det = el("details"); if (b.tableOpen) det.open = true;
  det.append(el("summary", null, "Table"));
  const w = el("div", "tw"), t = el("table"), h = el("tr");
  ["", "Min", "Q1", "Median", "Q3", "Max", "Outliers"].forEach(c => h.append(el("th", null, c))); t.append(h);
  b.boxes.forEach(x => { const tr = el("tr"); [x.name, ...[x.min, x.q1, x.median, x.q3, x.max].map(v => num(v, d)), (x.outliers || []).map(v => num(v, d)).join(", ") || "—"].forEach(c => tr.append(el("td", null, c))); t.append(tr); });
  w.append(t); det.append(w); root.append(det);
  return root;
}
