// Preview-only port of #132's chart with #139's draggable points, used to draw these images; not product code.
// Preview fields (not wire): `pv` {s, i, ph, y, part} for the grabbed point, `hz` (draw hit areas), `toast`, `static`, `tableOpen`.
const TONE = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", mute: "--mute" };
const ORDER = ["--l", "--c", "--a", "--p", "--g"];
const TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NS = "http://www.w3.org/2000/svg";
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function sv(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function places(step, unit) { const s = String(step / unit); return s.includes(".") ? s.split(".")[1].length : 0; }
function fmt(v, f, step) {
  if (v == null) return "—";
  const n = (x, d) => x.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  if (f === "thb") return "฿" + n(v, 0);
  if (f === "thb_m") return Math.abs(v) >= 1e6 ? "฿" + n(v / 1e6, Math.max(1, step ? places(step, 1e6) : 1)) + "M" : Math.abs(v) >= 1e3 ? "฿" + n(v / 1e3, step ? places(step, 1e3) : 0) + "K" : "฿" + n(v, 0);
  if (f === "percent") return n(v, Math.max(1, step ? places(step, 1) : 1)) + "%";
  return n(v, 0);
}
function xlabel(x, b, long) {
  const m = /^(\d{4})-(\d{2})$/.exec(x); if (!m) return x;
  const y = +m[1] + (b.era === "be" ? 543 : 0), names = b.lang === "th" ? TH : EN;
  return names[+m[2] - 1] + " " + (long ? y : String(y).slice(2));
}
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), r = v / p; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p; }
function color(s, i) { return `var(${TONE[s.tone] || ORDER[i % ORDER.length]})`; }
function kindOf(b, s) { return b.chart === "line" ? "line" : b.chart === "combo" ? (s.as || "bar") : "bar"; }
function movable(b, s) {
  if (b.static || !b.move || b.move.off || s.fixed) return false;
  if (b.chart === "stacked" || b.chart === "donut") return false;
  return !(b.chart === "combo" && kindOf(b, s) === "bar" && b.series.filter(x => kindOf(b, x) === "bar").length > 1);
}
function says(b, s, i, v, from) {
  const d = v - from, step = s.step;
  const how = v === from ? "" : d > 0 ? ", up " + fmt(d, b.format, step) : ", down " + fmt(-d, b.format, step);
  return fmt(v, b.format, step) + how;
}
function legend(b, at, pv) {
  const l = el("div", "chl");
  if (at != null) l.append(el("span", "chx", xlabel(b.x[at], b, true)));
  b.series.forEach((s, i) => {
    const it = el("span"), k = el("i", "chk" + (kindOf(b, s) === "line" ? " chkl" : "") + (s.dash ? " chkd" : ""));
    k.style.setProperty("--k", color(s, i)); it.append(k, s.name);
    if (at != null) {
      const live = pv && pv.s === i && pv.i === at && pv.y != null && pv.y !== s.values[at] && pv.ph !== "back";
      it.append(el("b", null, fmt(live ? pv.y : s.values[at], b.format, s.step)));
      if (live) it.append(el("span", "was", "was " + fmt(s.values[at], b.format, s.step)));
    }
    l.append(it);
  });
  return l;
}
function chart(b) {
  const root = el("div", "card chart" + (b.move && !b.static ? " live" : ""));
  root.setAttribute("role", "figure"); root.setAttribute("aria-label", b.title);
  root.append(el("div", "cht", b.title));
  const pv = b.pv, n = b.x.length;
  const at = pv ? pv.i : b.selected != null ? b.x.indexOf(b.selected) : n - 1;
  root.append(legend(b, at, pv));
  let max = 0; b.series.forEach(s => s.values.forEach(v => { max = Math.max(max, v || 0); }));
  const top = niceMax(max * 1.04), H = 180, W = n * 10, yOf = v => H - (v / top) * H, pc = v => (yOf(v) / H * 100);
  const val = (si, i) => pv && pv.s === si && pv.i === i && pv.y != null && ["pressed", "preview", "sent"].includes(pv.ph) ? pv.y : b.series[si].values[i];
  const g = el("div", "chg"), ya = el("div", "chy"), p = el("div", "chp"), xa = el("div", "chx2");
  const s = sv("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  [0.25, 0.5, 0.75, 1].forEach(f => s.append(sv("line", { class: "grid", x1: 0, x2: W, y1: yOf(top * f), y2: yOf(top * f) })));
  [0, 0.5, 1].forEach(f => { const t = el("span", null, fmt(top * f, b.format)); t.style.top = (100 - f * 100) + "%"; ya.append(t); });
  if (b.selected != null && !pv) { const band = el("i", "chb"); band.style.left = (at / n * 100) + "%"; band.style.width = (100 / n) + "%"; p.append(band); }
  const all = b.series.map((x, i) => [x, i]), bars = all.filter(([x]) => kindOf(b, x) === "bar"), lines = all.filter(([x]) => kindOf(b, x) === "line");
  const gap = n > 16 ? 1.5 : 2.5, stackedCombo = b.chart === "combo" && bars.length > 1;
  const bw = (10 - 2 * gap) / (stackedCombo ? 1 : Math.max(1, bars.length));
  const barX = (k, i) => i * 10 + gap + (stackedCombo ? 0 : k * bw);
  const geom = {};
  for (let i = 0; i < n; i++) {
    let base = 0;
    bars.forEach(([x, si], k) => {
      const v = val(si, i); if (v == null) return;
      const y0 = yOf(base), y1 = yOf(base + v), r = sv("rect", { class: "s", x: barX(k, i), width: Math.max(0.2, bw - (bars.length > 1 && !stackedCombo ? 0.4 : 0)), y: y1, height: Math.max(0, y0 - y1 - (base > 0 ? 2 : 0)) });
      r.style.setProperty("--k", color(x, si));
      const held = pv && pv.s === si && pv.i === i;
      if (held && pv.ph === "sent") r.classList.add("sent");
      if (held && ["preview", "sent"].includes(pv.ph) && pv.y !== x.values[i]) {
        const o = x.values[i];
        s.append(sv("rect", { class: "ghost", x: barX(k, i), width: r.getAttribute("width"), y: yOf(o), height: H - yOf(o) }));
      }
      s.append(r);
      geom[si + ":" + i] = { l: barX(k, i) / W * 100, w: bw / W * 100, y: base + v };
      if (stackedCombo) base += v;
    });
  }
  s.append(sv("line", { class: "base", x1: 0, x2: W, y1: H, y2: H }));
  lines.forEach(([x, si]) => {
    const held = pv && pv.i != null && pv.s === si && ["preview", "sent"].includes(pv.ph) && pv.y !== x.values[pv.i];
    if (held) {
      let d = ""; [pv.i - 1, pv.i, pv.i + 1].forEach(i => { const v = x.values[i]; if (v == null) return; d += (d ? "L" : "M") + (i * 10 + 5) + " " + yOf(v); });
      s.append(sv("path", { class: "ghost", d }));
    }
    let d = ""; x.values.forEach((_, i) => { const v = val(si, i); if (v == null) { d += " "; return; } d += (/\d$/.test(d) ? "L" : "M") + (i * 10 + 5) + " " + yOf(v); });
    const path = sv("path", { class: "s" + (x.dash ? " dash" : "") + (pv && pv.s === si && pv.ph === "sent" ? " sent" : ""), d });
    path.style.setProperty("--k", color(x, si)); s.append(path);
  });
  p.append(s);
  for (let i = 0; i < n; i++) {
    const c = el("button", "chc"); c.type = "button";
    c.style.left = (i / n * 100) + "%"; c.style.width = (100 / n) + "%";
    c.setAttribute("aria-label", xlabel(b.x[i], b, true) + ": " + b.series.map(x => x.name + " " + fmt(x.values[i], b.format)).join(", "));
    if (all.some(([x]) => movable(b, x))) { c.tabIndex = -1; c.setAttribute("aria-hidden", "true"); }
    if (b.hz && i === b.hz.body) c.classList.add("hzb");
    p.append(c);
  }
  lines.forEach(([x, si]) => {
    const mv = movable(b, x);
    x.values.forEach((_, i) => {
      const v = val(si, i); if (v == null) return;
      const held = pv && pv.s === si && pv.i === i;
      if (!mv && !(i === at && b.selected != null && !pv)) return;
      if (!mv) { const dot = el("i", "chd"); dot.style.left = ((i + 0.5) / n * 100) + "%"; dot.style.top = pc(v) + "%"; dot.style.setProperty("--k", color(x, si)); p.append(dot); return; }
      if (held && ["preview", "sent"].includes(pv.ph) && pv.y !== x.values[i]) {
        const gh = el("i", "chq0"); gh.style.left = ((i + 0.5) / n * 100) + "%"; gh.style.top = pc(x.values[i]) + "%"; p.append(gh);
      }
      p.append(handle(b, x, si, i, v, { l: i / n * 100, w: 100 / n, t: pc(v) }, "pt", held, pc));
    });
  });
  bars.forEach(([x, si]) => {
    if (!movable(b, x)) return;
    x.values.forEach((_, i) => {
      const gm = geom[si + ":" + i]; if (!gm) return;
      const held = pv && pv.s === si && pv.i === i;
      p.append(handle(b, x, si, i, gm.y, { l: gm.l, w: gm.w, t: pc(gm.y), col: { l: i / n * 100, w: 100 / n } }, "br", held, pc));
    });
  });
  const sw = Math.ceil(n / 12), sp = Math.ceil(n / 6);
  b.x.forEach((x, i) => {
    const t = el("span", (i % sw === 0 ? "w " : "") + (i % sp === 0 ? "p " : "") + (i === at && (pv || b.selected != null) ? "sel" : ""), xlabel(x, b));
    t.style.left = ((i + 0.5) / n * 100) + "%"; xa.append(t);
  });
  g.append(ya, p, xa); root.append(g);
  if (b.toast) { const t = el("div", "tst bad"); t.setAttribute("role", "alert"); const ic = el("i", "tsg", "×"); ic.setAttribute("aria-hidden", "true"); const x = el("button"); x.type = "button"; x.append(el("span", "", "×")); x.setAttribute("aria-label", "dismiss"); t.append(ic, el("span", "tsx", b.toast), el("span"), el("span"), x); root.append(t); }
  const d = el("details"); if (b.tableOpen) d.open = true; d.append(el("summary", null, b.lang === "th" ? "ตาราง" : "Table"));
  const tw = el("div", "tw"), tb = el("table"), h = el("tr"); ["", ...b.series.map(x => x.name)].forEach(c => h.append(el("th", null, c))); tb.append(h);
  b.x.forEach((x, i) => { const tr = el("tr"); [xlabel(x, b, true), ...b.series.map(y => fmt(y.values[i], b.format, y.step))].forEach(c => tr.append(el("td", null, c))); tb.append(tr); });
  tw.append(tb); d.append(tw); root.append(d);
  return root;
}
function handle(b, x, si, i, v, at, kind, held, pc) {
  const h = el("button", "chq " + kind); h.type = "button";
  h.style.setProperty("--k", color(x, kindOf(b, x) === "bar" ? si : si));
  h.style.left = (at.col ? at.col.l : at.l) + "%"; h.style.width = (at.col ? at.col.w : at.w) + "%"; h.style.top = at.t + "%";
  if (kind === "br") { h.style.setProperty("--bl", ((at.l - at.col.l) / at.col.w * 100) + "%"); h.style.setProperty("--bw", (at.w / at.col.w * 100) + "%"); if (v / 1 === 0 || at.t > 96) h.classList.add("low"); }
  h.setAttribute("aria-roledescription", "point");
  h.setAttribute("aria-label", x.name + ", " + xlabel(b.x[i], b, true) + ", " + fmt(x.values[i], b.format, x.step));
  const mark = el("i"); h.append(mark);
  const pv = b.pv;
  if (b.hz && b.hz.s === si && b.hz.i === i) h.classList.add("hz");
  if (held) {
    const ph = pv.ph; h.classList.add(ph === "focus" || ph === "back" ? "fv" : ph === "pressed" ? "lift" : ph);
    if (["pressed", "preview", "sent"].includes(ph)) h.classList.add("fv");
    const words = ph === "pressed" ? fmt(x.values[i], b.format, x.step) : ph === "sent" ? "sending" : pv.tag || says(b, x, i, pv.y, x.values[i]);
    if (["pressed", "preview", "sent"].includes(ph)) { const t = el("span", "chtag" + (ph === "sent" ? " m" : "") + (i >= b.x.length - 1 ? " r" : i === 0 ? " lft" : "") + (pc(ph === "pressed" ? x.values[i] : pv.y) < 15 ? " dn" : ""), words); h.append(t); }
  }
  return h;
}
function draw() {
  document.querySelectorAll("[data-b]").forEach(t => { const c = chart(JSON.parse(t.dataset.b)); c.className += " " + t.className; t.replaceWith(c); });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
