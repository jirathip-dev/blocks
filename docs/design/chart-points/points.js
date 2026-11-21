/* Preview-only: draggable points over #132's chart preview (../chart/chart.js). Not product code.
   Wire fields drawn: move {action, name, enabled}, a series' step and fixed.
   Preview fields (not wire): grab {series, at, to, phase, by}, hits (outline the handles), focus (series index). */
const nice0 = niceMax;
let held = null;
niceMax = (v) => (held != null ? held : nice0(v));

const MOVES = ["line", "bar", "combo"];
const dec = (x) => (String(x).split(".")[1] || "").length;
function stepOf(b, s) {
  if (s.step) return s.step;
  return { thb_m: 1e5, percent: 0.1 }[b.format] || 1;
}
function fstep(v, b, s) {
  const st = stepOf(b, s);
  if (b.format === "thb_m" && Math.abs(v) >= 1e6) {
    const d = Math.max(1, dec(st / 1e6));
    return "฿" + (v / 1e6).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + "M";
  }
  if (b.format === "percent") return v.toLocaleString("en-US", { minimumFractionDigits: dec(st), maximumFractionDigits: dec(st) }) + "%";
  return fmt(v, b.format);
}
function delta(d, b) {
  if (!d) return "";
  const t = b.format === "percent" ? Math.abs(d).toFixed(1) + " pt" : fmt(Math.abs(d), b.format);
  return (d > 0 ? "+" : "−") + t;
}
function axisTop(b) {
  let max = 0;
  b.series.forEach((s) => s.values.forEach((v) => { if (v != null) max = Math.max(max, v); }));
  return nice0(max * 1.04);
}
function editable(b, s) {
  return !!b.move && b.move.enabled !== false && MOVES.includes(b.chart) && !s.fixed;
}
const words = (b, s, i, v) => `${s.name}, ${xlabel(b.x[i], b, true)}: ${fstep(v, b, s)}`;

function points(b0, o = {}) {
  const top = axisTop(b0), g = o.grab;
  const b = JSON.parse(JSON.stringify(b0));
  const start = g ? b0.series[g.series].values[g.at] : null;
  const live = g && g.to != null && ["previewing", "sent"].includes(g.phase);
  if (live) b.series[g.series].values[g.at] = g.to;
  if (g) b.selected = b.x[g.at];
  held = top;
  const c = chart(b);
  held = null;
  if (g) {
    c.querySelectorAll(".chb,.chd").forEach((e) => e.remove());
    c.querySelectorAll(".chx2 .sel").forEach((e) => e.classList.remove("sel"));
    c.querySelectorAll("[aria-pressed]").forEach((e) => e.removeAttribute("aria-pressed"));
  }
  const p = c.querySelector(".chp"), n = b.x.length, pct = (v) => (1 - v / top) * 100 + "%";
  b.series.forEach((s, si) => {
    if (!editable(b, s)) return;
    s.values.forEach((v, i) => {
      if (v == null) return;
      const q = el("button", "chq" + (o.hits ? " hitbox" : ""));
      q.type = "button";
      q.style.left = (i / n) * 100 + "%";
      q.style.width = 100 / n + "%";
      q.style.top = pct(v);
      q.style.setProperty("--k", color(s, si));
      q.setAttribute("aria-label", words(b, s, i, v));
      q.setAttribute("aria-roledescription", "editable point");
      q.tabIndex = -1;
      if (o.focus === si && (!g || g.series !== si) && i === (o.focusAt ?? 0)) { q.tabIndex = 0; q.classList.add("kf"); }
      if (g && g.series === si && g.at === i) {
        q.dataset.phase = g.phase;
        q.tabIndex = 0;
        if (g.by === "keys") q.classList.add("kf");
        if (g.phase === "sent") q.setAttribute("aria-busy", "true");
      }
      p.append(q);
    });
  });
  if (g && live && g.to !== start) {
    const s = b0.series[g.series], x = ((g.at + 0.5) / n) * 100 + "%";
    const gh = el("i", "chq-g");
    gh.style.left = x; gh.style.top = pct(start);
    const vl = el("i", "chq-v"), lo = Math.min(start, g.to), hi = Math.max(start, g.to);
    vl.style.left = x; vl.style.top = pct(hi); vl.style.bottom = (lo / top) * 100 + "%";
    p.prepend(vl, gh);
    if (g.phase === "previewing") {
      const t = el("span", "chq-t", fstep(g.to, b, s));
      t.style.top = pct(g.to);
      c.querySelector(".chy").append(t);
    }
  }
  if (g) {
    const s = b0.series[g.series], it = c.querySelectorAll(".chl>span:not(.chx)")[g.series];
    const now = live ? g.to : start;
    it.querySelector("b").textContent = fstep(now, b, s);
    if (live && now !== start) it.append(el("em", "chq-d", delta(now - start, b) + " from " + fstep(start, b, s)));
    if (g.phase === "sent") it.classList.add("chq-busy");
  }
  if (g && g.by === "keys" && ["pressed", "previewing"].includes(g.phase)) {
    const s = b0.series[g.series], k = el("div", "chq-k"), st = fstep(stepOf(b, s), { ...b, format: b.format === "thb_m" ? "thb" : b.format }, s);
    const keys = [["↑ ↓", " one step (" + st + ")"], ["Shift", " ten steps"], ["Enter", " drop"], ["Esc", " cancel"]];
    keys.forEach(([a, t]) => { const sp = el("span"); sp.append(el("kbd", null, a), t); k.append(sp); });
    c.querySelector(".chg").after(k);
  }
  if (o.toast) {
    const t = el("div", "tst bad inl");
    t.setAttribute("role", "alert");
    t.append(el("i", "tsg", "!"), el("span", "tsx", o.toast));
    c.querySelector(".chg").after(t);
  }
  return c;
}

function note(c, html, cls = "note") { const e = el("p", cls); e.innerHTML = html; c.append(e); return c; }
function place(id, c) { const t = document.getElementById(id); c.className += " " + t.className; t.replaceWith(c); return c; }
