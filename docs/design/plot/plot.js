/* Preview-only port of the proposed `plot` renderer and its `drawn` rules, used to draw these images. Not product code. */
const TONE = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", mute: "--mute" };
const ORDER = ["--l", "--c", "--a", "--p", "--g"];
const NS = "http://www.w3.org/2000/svg";
const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function sv(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function color(s, i) { return `var(${TONE[s.tone] || ORDER[i % ORDER.length]})`; }

function niceStep(span, most) {
  const raw = span / most, p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
}
function timeStep(span, most) { return TIME_STEPS.find(s => span / s <= most) || 3600 * Math.ceil(span / most / 3600); }
function decimals(step) { return step >= 1 ? 0 : Math.min(2, Math.ceil(-Math.log10(step))); }
function clock(v, hours) {
  const t = Math.round(v), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60, ss = String(s).padStart(2, "0");
  return hours ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
function num(v, d) { return (v + 0 || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

function drawn(b) {
  const xa = b.x || {}, ya = b.y || {}, pts = b.series.filter(s => s.x.length);
  const firsts = pts.map(s => s.x[0]), lasts = pts.map(s => s.x[s.x.length - 1]);
  let x;
  if (xa.min != null && xa.max != null) x = [xa.min, xa.max];
  else if (!pts.length) x = [0, b.window || 1];
  else {
    const first = Math.min(...firsts), newest = Math.max(...lasts);
    x = b.window ? (newest - b.window < first ? [first, first + b.window] : [newest - b.window, newest]) : [first, newest];
  }
  const lines = b.series.map(s => {
    const idx = [];
    s.x.forEach((v, i) => { if (v >= x[0] && v <= x[1]) idx.push(i); });
    if (idx.length && idx[0] > 0) idx.unshift(idx[0] - 1);
    if (idx.length && idx[idx.length - 1] < s.x.length - 1) idx.push(idx[idx.length - 1] + 1);
    return idx;
  });
  const xTime = xa.scale === "time", xs = xTime ? timeStep(x[1] - x[0], 6) : niceStep(x[1] - x[0], 6);
  let y;
  if (ya.min != null && ya.max != null) y = [ya.min, ya.max];
  else {
    const vals = [];
    b.series.forEach((s, i) => lines[i].forEach(j => vals.push(s.y[j])));
    if (b.target) vals.push(b.target.min, b.target.max);
    if (b.peak) vals.push(b.peak.y);
    if (!vals.length) y = [0, 1];
    else { const lo = Math.min(...vals), hi = Math.max(...vals), st = niceStep(hi - lo || 1, 4); y = [Math.floor(lo / st) * st, Math.ceil(hi / st) * st]; if (y[0] === y[1]) y[1] += st; }
  }
  const ys = niceStep(y[1] - y[0], 4);
  if (ya.min == null) y = [Math.floor(y[0] / ys) * ys, Math.ceil(y[1] / ys) * ys];
  const ticks = (r, st, time) => {
    const out = [];
    for (let k = Math.ceil(r[0] / st - 1e-9); k * st <= r[1] + 1e-9; k++) out.push({ at: k * st, k, text: time ? clock(k * st, r[1] >= 3600) : num(k * st, decimals(st)) });
    return out;
  };
  return { x, y, xTicks: ticks(x, xs, xTime), yTicks: ticks(y, ys, ya.scale === "time"), lines, yDec: decimals(ys) };
}

function plot(b) {
  const d = drawn(b), root = el("div", "plot b b-plot" + (b.cls ? " " + b.cls : ""));
  root.setAttribute("role", "figure");
  root.setAttribute("aria-label", b.title);
  root.dataset.block = "plot";
  if (b.id) root.dataset.id = b.id;
  root.append(el("div", "plt", b.title));
  const empty = b.series.every(s => !s.x.length), yu = b.y && b.y.unit ? " " + b.y.unit : "";
  const leg = el("div", "pll");
  b.series.forEach((s, i) => {
    const it = el("span"), k = el("i", "plk");
    k.style.setProperty("--k", color(s, i));
    it.append(k, s.name);
    if (s.y.length) it.append(el("b", null, num(s.y[s.y.length - 1], Math.min(2, d.yDec + 1)).replace(/\.0+$/, "") + yu));
    leg.append(it);
  });
  if (b.target) { const it = el("span"); it.append(el("i", "plk band"), "Target", el("b", null, `${num(b.target.min, d.yDec)}–${num(b.target.max, d.yDec)}${yu}`)); leg.append(it); }
  if (b.peak) { const it = el("span"); it.append(el("i", "plk peak"), el("b", null, b.peak.label)); leg.append(it); }
  root.append(leg);
  const xOf = v => (v - d.x[0]) / (d.x[1] - d.x[0]), yOf = v => 1 - (v - d.y[0]) / (d.y[1] - d.y[0]);
  const g = el("div", "plg"), ya = el("div", "ply"), p = el("div", "plp"), xa = el("div", "plx");
  const lab = a => a ? [a.label, a.unit && `(${a.unit})`].filter(Boolean).join(" ") : "";
  const u = el("div", "plu"); u.append(el("span", null, lab(b.y))); g.append(u);
  const s = sv("svg", { viewBox: "0 0 1000 1000", preserveAspectRatio: "none", "aria-hidden": "true" });
  d.yTicks.forEach(t => {
    const yy = yOf(t.at) * 1000;
    s.append(sv("line", { class: t.at === d.y[0] ? "base" : "grid", x1: 0, x2: 1000, y1: yy, y2: yy }));
    const sp = el("span", null, t.text); sp.style.top = yOf(t.at) * 100 + "%"; ya.append(sp);
  });
  d.xTicks.forEach(t => {
    const f = xOf(t.at);
    if (f > 0.001 && f < 0.999) s.append(sv("line", { class: "grid", x1: f * 1000, x2: f * 1000, y1: 0, y2: 1000 }));
    const sp = el("span", (f < 0.001 ? "lo" : f > 0.999 ? "hi" : f < 0.04 || f > 0.96 ? "near" : "") + (t.k % 2 ? " odd" : ""), t.text);
    sp.style.left = f * 100 + "%"; xa.append(sp);
  });
  p.append(s);
  if (b.target) {
    const band = el("div", "plb"); band.style.top = yOf(b.target.max) * 100 + "%"; band.style.bottom = (1 - yOf(b.target.min)) * 100 + "%";
    p.append(band);
  }
  if (b.peak) s.append(sv("line", { class: "peak", x1: 0, x2: 1000, y1: yOf(b.peak.y) * 1000, y2: yOf(b.peak.y) * 1000 }));
  b.series.forEach((sr, i) => {
    const idx = d.lines[i]; if (!idx.length) return;
    const path = idx.map((j, n) => (n ? "L" : "M") + (xOf(sr.x[j]) * 1000).toFixed(2) + " " + (yOf(sr.y[j]) * 1000).toFixed(2)).join("");
    const e = sv("path", { class: "s", d: path }); e.style.setProperty("--k", color(sr, i)); s.append(e);
  });
  b.series.forEach((sr, i) => {
    const n = sr.x.length - 1; if (n < 0) return;
    const fx = xOf(sr.x[n]); if (fx < 0 || fx > 1.0001) return;
    const dot = el("i", "pld"); dot.style.setProperty("--k", color(sr, i));
    dot.style.left = fx * 100 + "%"; dot.style.top = yOf(sr.y[n]) * 100 + "%"; p.append(dot);
  });
  if (empty) { const e = el("div", "ple"); e.append(el("span", null, b.empty || "No data yet")); p.append(e); };
  g.append(ya, p, xa);
  if (b.x && b.x.label) { const ux = el("div", "plu x"); ux.append(el("span", null, lab(b.x))); g.append(ux); }
  root.append(g);
  return root;
}

function series(from, to, hz, f) {
  const x = [], y = [];
  for (let t = from; t <= to + 1e-9; t += 1 / hz) { x.push(+t.toFixed(4)); y.push(+f(t).toFixed(2)); }
  return { x, y };
}
function hash(t) { const s = Math.sin(t * 12.9898) * 43758.5453; return s - Math.floor(s); }
function repeaters(level, drift) {
  return t => {
    const c = t % 10, set = Math.floor(t / 10), top = level + drift * set + Math.sin(t * 2.1) * 0.8 + (hash(t) - 0.5) * 0.9;
    if (c < 0.4) return Math.max(0, top * c / 0.4);
    if (c < 7) return top;
    if (c < 7.4) return Math.max(0, top * (7.4 - c) / 0.4);
    return Math.max(0, (hash(t + 7) - 0.5) * 0.4);
  };
}
function mount() {
  for (const id in window.blocks) { const t = document.getElementById(id); if (t) t.replaceWith(plot(window.blocks[id])); }
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
