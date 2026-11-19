// Preview-only port used to draw these images; not product code.
// Preview fields (not wire): view.day ("fit" or px), `pv` on a bar {ph, part, at, tag}, `pv` on a row {focus, draw}.
const DAY = 864e5, MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD = "SMTWTFS";
const dn = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY;
const dt = n => new Date(n * DAY);
const short = n => dt(n).getUTCDate() + " " + MON[dt(n).getUTCMonth()];
function words(s, e) { const a = dn(s), b = dn(e), k = b - a + 1; return (a === b ? short(a) : short(a) + " to " + short(b)) + ", " + k + (k === 1 ? " day" : " days"); }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, name, off) { const b = el("button"); b.type = "button"; b.append(el("span", "", label)); if (name) b.setAttribute("aria-label", name); if (off) b.disabled = true; return b; }
function lanes(bars) {
  const ends = [], out = new Map();
  [...bars].sort((p, q) => dn(p.start) - dn(q.start)).forEach(x => {
    let i = ends.findIndex(e => e < dn(x.start)); if (i < 0) { i = ends.length; ends.push(0); }
    ends[i] = dn(x.end); out.set(x.id, i);
  });
  return { of: out, n: Math.max(1, ends.length) };
}
function timeline(b) {
  const f = dn(b.from), t = dn(b.to), n = t - f + 1, off = new Set((b.off || []).map(dn));
  const px = b.view && typeof b.view.day === "number" ? b.view.day : null;
  const z = px == null || px >= 24 ? 1 : px >= 12 ? 2 : 3;
  const live = !b.static && (b.move || b.stretch || b.draw);
  const root = el("div", "tl z" + z + (live ? " live" : ""));
  root.setAttribute("role", "group"); root.setAttribute("aria-label", b.title || "Timeline");
  const head = el("div", "tlh");
  head.append(el("span", "tlt", b.title || "Timeline"));
  const meta = el("span", "tlq", b.meta || ""); if (live && z > 1) meta.textContent = (b.meta ? b.meta + " · " : "") + "zoom in to drag";
  head.append(meta);
  if (!b.static) head.append(btn("−", "zoom out", z === 3), btn("fit", "fit to width", px == null), btn("+", "zoom in", px === 48));
  root.append(head);
  if (!b.rows || !b.rows.length) { root.append(el("div", "tle", b.empty || "Nothing scheduled")); return root; }
  const w = el("div", "tlw"); w.style.setProperty("--n", n); if (px) w.style.setProperty("--day", px + "px");
  if (b.tall) w.style.maxHeight = b.tall + "px";
  const g = el("div", "tlg"), hd = el("div", "tlhd"), ax = el("div", "tlx"), mo = el("div", "tlm"), dy = el("div", "tld");
  hd.append(el("div", "tlc", b.corner || ""), ax); ax.append(mo, dy);
  for (let d = f; d <= t;) {
    const m = dt(d).getUTCMonth(); let k = 0; while (d + k <= t && dt(d + k).getUTCMonth() === m) k++;
    const c = el("span"); c.style.setProperty("--k", k); c.append(el("b", "", (z === 3 && k * px < 90 ? MON[m] : MONTH[m]) + " " + dt(d).getUTCFullYear())); mo.append(c); d += k;
  }
  for (let d = f; d <= t; d++) {
    const c = el("span", off.has(d) ? "off" : ""), wd = dt(d).getUTCDay();
    if (z === 1) c.append(el("b", "", dt(d).getUTCDate()), el("i", "", WD[wd]));
    else if (z === 2 && (wd === 1 || d === f)) c.append(el("b", "", dt(d).getUTCDate()));
    dy.append(c);
  }
  g.append(hd);
  b.rows.forEach(r => g.append(row(b, r, f, t, z, off)));
  w.append(g); root.append(w);
  if (b.toast) { const s = el("div", "tst bad"); s.setAttribute("role", "alert"); const i = el("i", "tsg", "×"); i.setAttribute("aria-hidden", "true"); s.append(i, el("span", "tsx", b.toast), el("span"), el("span"), btn("×", "dismiss")); root.append(s); }
  return root;
}
function span(s, e, f, t) { const a = Math.max(dn(s), f), z = Math.min(dn(e), t); return { o: a - f, d: z - a + 1, cs: dn(s) < f, ce: dn(e) > t }; }
function place(e, p) { e.style.setProperty("--o", p.o); e.style.setProperty("--d", p.d); }
function row(b, r, f, t, z, off) {
  const tr = el("div", "tlr"), lab = el("div", "tll" + (r.pv && r.pv.focus ? " fv" : "")), ln = el("div", "tln");
  lab.append(el("b", "", r.title)); if (r.subtitle) lab.append(el("span", "", r.subtitle));
  lab.setAttribute("aria-label", r.title + (b.draw && !b.static ? ", Add a bar" : ""));
  const L = lanes(r.bars); ln.style.setProperty("--rows", L.n); ln.setAttribute("role", "list"); ln.setAttribute("aria-label", r.title);
  for (let d = f; d <= t; d++) {
    if (off.has(d)) { const o = el("div", "tlo"); o.style.setProperty("--o", d - f); ln.append(o); }
    else if (z > 1 && dt(d).getUTCDay() === 1) { const k = el("div", "tlk"); k.style.setProperty("--o", d - f); ln.append(k); }
  }
  r.bars.forEach(x => {
    if (dn(x.end) < f || dn(x.start) > t) return;
    const y = L.of.get(x.id), next = r.bars.filter(q => L.of.get(q.id) === y && dn(q.start) > dn(x.end)).map(q => dn(q.start));
    const gap = (next.length ? Math.min(...next) : t + 1) - Math.min(dn(x.end), t) - 1;
    bar(b, x, y, gap, f, t, z).forEach(e => ln.append(e));
  });
  if (r.pv && r.pv.draw) {
    const d = r.pv.draw, e = el("div", "tlb nw" + (d.ph === "sent" ? " sent" : ""), d.ph === "hover" ? "+" : "");
    place(e, span(d.start, d.end, f, t)); if (d.ph !== "hover") e.append(el("span", "tltag", d.ph === "sent" ? "sending…" : words(d.start, d.end))); ln.append(e);
  }
  tr.append(lab, ln); return tr;
}
function bar(b, x, y, gap, f, t, z) {
  const pv = x.pv || {}, home = span(x.start, x.end, f, t), out = [];
  const grips = b.stretch && !b.static && !x.fixed && z === 1;
  const make = (p, cls) => {
    const e = el("div", "tlb" + (x.tone ? " " + x.tone : "") + (x.fixed ? " fix" : "") + (p.cs ? " cs" : "") + (p.ce ? " ce" : "") + (cls ? " " + cls : ""));
    e.style.setProperty("--y", y); place(e, p); return e;
  };
  const stretch = pv.part === "start" || pv.part === "end";
  const moved = pv.at && pv.ph !== "back" && (!stretch || pv.ph === "sent");
  const at = pv.at && (pv.at.start ? span(pv.at.start, pv.at.end, f, t) : pv.at);
  if (moved) out.push(make(home, "gh"));
  const cls = { focus: "fv", pressed: "fv lift", preview: "fv lift", drag: "drag", sent: "sent", back: "fv" }[pv.ph] || "";
  const e = make(moved ? at : home, stretch && pv.ph !== "focus" && pv.ph !== "sent" ? "src" : stretch && pv.ph === "focus" ? "" : cls);
  const small = home.d <= 1 && gap >= 2 && x.label;
  if (small) { e.classList.add("out"); e.style.setProperty("--gap", gap); }
  if (x.progress != null) { const p = el("i", "tlp"); p.style.setProperty("--p", x.progress / 100); e.append(p); }
  e.append(el("span", "tlbx", x.label || ""));
  const name = (x.label || "Bar") + ", " + words(x.start, x.end) + (x.progress != null ? ", " + x.progress + " % done" : "") + (x.fixed ? ", fixed" : "");
  e.setAttribute("aria-label", name);
  if (b.static || !(b.move || b.stretch) || x.fixed) e.setAttribute("role", "listitem");
  else { e.setAttribute("role", "button"); e.setAttribute("aria-roledescription", "bar"); e.tabIndex = -1; }
  if (x.hz) ["hzs", "hzb", "hze"].forEach(c => { const h = el("span", "hz " + c); h.setAttribute("aria-hidden", "true"); e.append(h); });
  if (grips) {
    if (!home.cs) { const s = el("span", "tlgs" + (pv.part === "start" && pv.ph === "focus" ? " fv" : "")); s.setAttribute("role", "button"); s.setAttribute("aria-label", "Start of " + (x.label || "bar")); e.append(s); }
    if (!home.ce) { const s = el("span", "tlge" + (pv.part === "end" && pv.ph === "focus" ? " fv" : "")); s.setAttribute("role", "button"); s.setAttribute("aria-label", "End of " + (x.label || "bar")); e.append(s); }
  }
  const tag = pv.tag || (pv.ph === "preview" && pv.at && pv.at.start ? words(pv.at.start, pv.at.end) : pv.ph === "sent" ? "sending…" : pv.ph === "drag" ? "no drop here" : null);
  if (stretch && pv.at && pv.ph !== "focus" && pv.ph !== "sent") {
    const s = make(at, "sg"); s.append(el("span", "tltag", tag || words(pv.at.start, pv.at.end))); out.push(e, s); return out;
  }
  if (tag) e.append(el("span", "tltag" + (pv.ph === "drag" || pv.ph === "sent" ? " m" : ""), tag));
  out.push(e); return out;
}
function draw() {
  document.querySelectorAll("[data-b]").forEach(n => n.replaceWith(timeline(JSON.parse(n.dataset.b))));
  document.querySelectorAll("[data-src]").forEach(n => { const b = window[n.dataset.src]; n.replaceWith(timeline(Object.assign({}, b, JSON.parse(n.dataset.with || "{}")))); });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
