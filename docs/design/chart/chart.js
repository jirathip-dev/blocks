/* Preview-only port of the proposed `chart` renderer, used to draw these images. Not product code. */
const TONE = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", mute: "--mute" };
const ORDER = ["--l", "--c", "--a", "--p", "--g"];
const TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NS = "http://www.w3.org/2000/svg";

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function sv(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }

function fmt(v, f) {
  if (v == null) return "—";
  const n = (x, d) => x.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  if (f === "thb") return "฿" + n(v, 0);
  if (f === "thb_m") return Math.abs(v) >= 1e6 ? "฿" + n(v / 1e6, 1) + "M" : Math.abs(v) >= 1e3 ? "฿" + n(v / 1e3, 0) + "K" : "฿" + n(v, 0);
  if (f === "percent") return n(v, 1) + "%";
  return n(v, 0);
}
function xlabel(x, b, long) {
  const m = /^(\d{4})-(\d{2})$/.exec(x);
  if (!m) return x;
  const y = +m[1] + (b.era === "be" ? 543 : 0), names = b.lang === "th" ? TH : EN;
  return names[+m[2] - 1] + " " + (long ? y : String(y).slice(2));
}
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), r = v / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
}
function color(s, i) { return `var(${TONE[s.tone] || ORDER[i % ORDER.length]})`; }

function legend(b, at) {
  const l = el("div", "chl");
  if (at != null) l.append(el("span", "chx", xlabel(b.x[at], b, true)));
  b.series.forEach((s, i) => {
    const it = el("span"), k = el("i", "chk" + (kindOf(b, s) === "line" ? " chkl" : "") + (s.dash ? " chkd" : ""));
    k.style.setProperty("--k", color(s, i));
    it.append(k, s.name);
    if (at != null) it.append(el("b", null, fmt(s.values[at], b.format)));
    l.append(it);
  });
  return l;
}
function kindOf(b, s) { return b.chart === "line" ? "line" : b.chart === "combo" ? (s.as || "bar") : "bar"; }

function table(b, rows, cols, cell) {
  const d = el("details"); if (b.tableOpen) d.open = true;
  d.append(el("summary", null, b.lang === "th" ? "ตาราง" : "Table"));
  const w = el("div", "tw"), t = el("table"), h = el("tr");
  cols.forEach(c => h.append(el("th", null, c)));
  t.append(h);
  rows.forEach((r, i) => { const tr = el("tr"); cell(r, i).forEach(c => tr.append(el("td", null, c))); t.append(tr); });
  w.append(t); d.append(w);
  return d;
}

function chart(b) {
  const root = el("div", "card chart");
  root.setAttribute("role", "figure");
  root.setAttribute("aria-label", b.title);
  root.append(el("div", "cht", b.title));
  if (b.chart === "donut") return donut(b, root);
  const n = b.x.length, at = b.selected != null ? b.x.indexOf(b.selected) : n - 1;
  const empty = b.series.every(s => s.values.every(v => v == null));
  root.append(legend(b, empty ? null : at));
  const stacked = b.chart === "stacked";
  let max = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    b.series.forEach(s => { const v = s.values[i] || 0; if (stacked && kindOf(b, s) === "bar") sum += v; else max = Math.max(max, v); });
    max = Math.max(max, sum);
  }
  const top = niceMax(max * 1.04), H = 180, W = n * 10;
  const yOf = v => H - (v / top) * H;
  const g = el("div", "chg"), ya = el("div", "chy"), p = el("div", "chp"), xa = el("div", "chx2");
  const s = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  [0.25, 0.5, 0.75, 1].forEach(f => {
    s.append(sv("line", { class: "grid", x1: 0, x2: W, y1: yOf(top * f), y2: yOf(top * f) }));
  });
  [0, 0.5, 1].forEach(f => { const t = el("span", null, empty ? "" : fmt(top * f, b.format)); t.style.top = (100 - f * 100) + "%"; ya.append(t); });
  if (!empty && at >= 0 && b.selected != null) { const band = el("i", "chb"); band.style.left = (at / n * 100) + "%"; band.style.width = (100 / n) + "%"; p.append(band); }
  const bars = b.series.map((x, i) => [x, i]).filter(([x]) => kindOf(b, x) === "bar");
  const lines = b.series.map((x, i) => [x, i]).filter(([x]) => kindOf(b, x) === "line");
  const gap = n > 16 ? 1.5 : 2.5;
  for (let i = 0; i < n; i++) {
    if (stacked) {
      let base = 0;
      bars.forEach(([x, si]) => {
        const v = x.values[i]; if (!v) return;
        const y0 = yOf(base), y1 = yOf(base + v), r = sv("rect", { class: "s", x: i * 10 + gap, width: 10 - 2 * gap, y: y1, height: Math.max(0, y0 - y1 - (base > 0 ? 0 : 0)) });
        r.style.setProperty("--k", color(x, si));
        if (base > 0) r.setAttribute("height", Math.max(0, y0 - y1 - 2));
        s.append(r); base += v;
      });
    } else {
      const w = (10 - 2 * gap) / Math.max(1, bars.length);
      bars.forEach(([x, si], k) => {
        const v = x.values[i]; if (v == null) return;
        const r = sv("rect", { class: "s", x: i * 10 + gap + k * w, width: Math.max(0.2, w - (bars.length > 1 ? 0.4 : 0)), y: yOf(v), height: H - yOf(v) });
        r.style.setProperty("--k", color(x, si)); s.append(r);
      });
    }
  }
  s.append(sv("line", { class: "base", x1: 0, x2: W, y1: H, y2: H }));
  lines.forEach(([x, si]) => {
    let d = "";
    x.values.forEach((v, i) => { if (v == null) return; d += (d ? "L" : "M") + (i * 10 + 5) + " " + yOf(v); });
    const path = sv("path", { class: "s" + (x.dash ? " dash" : ""), d });
    path.style.setProperty("--k", color(x, si)); s.append(path);
  });
  p.append(s);
  if (!empty && at >= 0) lines.forEach(([x, si]) => {
    const v = x.values[at]; if (v == null) return;
    const dot = el("i", "chd"); dot.style.left = ((at + 0.5) / n * 100) + "%"; dot.style.top = (yOf(v) / H * 100) + "%";
    dot.style.setProperty("--k", color(x, si)); p.append(dot);
  });
  if (empty) p.append(el("div", "che", b.empty || "No data yet"));
  else for (let i = 0; i < n; i++) {
    const c = el("button", "chc" + (b.hover === i ? " hov" : ""));
    c.type = "button";
    c.style.left = (i / n * 100) + "%"; c.style.width = (100 / n) + "%";
    c.setAttribute("aria-label", xlabel(b.x[i], b, true) + ": " + b.series.map(x => x.name + " " + fmt(x.values[i], b.format)).join(", "));
    if (i === at && b.selected != null) c.setAttribute("aria-pressed", "true");
    p.append(c);
  }
  const sw = Math.ceil(n / 12), sp = Math.ceil(n / 6);
  b.x.forEach((x, i) => {
    const t = el("span", (i % sw === 0 ? "w " : "") + (i % sp === 0 ? "p " : "") + (i === at && b.selected != null ? "sel" : ""), xlabel(x, b));
    t.style.left = ((i + 0.5) / n * 100) + "%"; xa.append(t);
  });
  g.append(ya, p, xa);
  root.append(g);
  root.append(table(b, b.x, [b.lang === "th" ? "เดือน" : "", ...b.series.map(x => x.name)], (x, i) => [xlabel(x, b, true), ...b.series.map(y => fmt(y.values[i], b.format))]));
  return root;
}

function donut(b, root) {
  let parts = b.x.map((x, i) => ({ name: x, v: b.series[0].values[i], tone: (b.tones || [])[i] }));
  parts.sort((a, c) => c.v - a.v);
  if (parts.length > 5) { const rest = parts.slice(4); parts = parts.slice(0, 4); parts.push({ name: b.lang === "th" ? "อื่นๆ" : "Other", v: rest.reduce((a, c) => a + c.v, 0), tone: "mute", n: rest.length }); }
  const total = parts.reduce((a, c) => a + c.v, 0);
  const w = el("div", "chn"), ring = el("div", "ring"), rows = el("div", "rows");
  const s = sv("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
  let off = 0;
  parts.forEach((p, i) => {
    const len = p.v / total * 100, k = `var(${TONE[p.tone] || ORDER[i]})`;
    const c = sv("circle", { cx: 50, cy: 50, r: 40, pathLength: 100, "stroke-dasharray": `${Math.max(0, len - 0.8)} ${100 - len + 0.8}`, "stroke-dashoffset": -off, class: b.selected === p.name ? "sel" : "" });
    c.style.setProperty("--k", k); s.append(c); off += len;
    const r = el("button", "chr" + (b.selected === p.name ? " sel" : "")); r.type = "button";
    const mk = el("i", "chk"); mk.style.setProperty("--k", k);
    r.append(mk, el("span", "nm", p.name + (p.n ? ` (${p.n})` : "")), el("b", null, fmt(p.v, b.format)), el("i", "pc", Math.round(p.v / total * 100) + "%"));
    r.setAttribute("aria-label", `${p.name}: ${fmt(p.v, b.format)}, ${Math.round(p.v / total * 100)}%`);
    rows.append(r);
  });
  const mid = el("div", "mid"), sel = parts.find(p => p.name === b.selected);
  mid.append(el("b", null, fmt(sel ? sel.v : total, b.format)), el("span", null, sel ? sel.name : (b.lang === "th" ? "รวม" : "Total")));
  ring.append(s, mid); w.append(ring, rows); root.append(w);
  root.append(table(b, parts, ["", b.series[0].name, "%"], p => [p.name, fmt(p.v, b.format), Math.round(p.v / total * 100) + "%"]));
  return root;
}
