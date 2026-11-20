// Preview-only port of the planned marks on web/src/render/media.ts, used to draw these images; not product code.
// Preview fields (not wire): sel (selected mark id), focus (a mark id, "id:at" / "id:to" for a grip, or "tool:<kind>"),
// tool (the picked tool), phase {id, at, c:{at,to}} (one item's gesture), ghost (draw candidate), typing {at, text},
// zoom, pan [x,y], into (the group a new mark goes in), plain (the static page: no toolbar, no focus stops).
const NS = "http://www.w3.org/2000/svg";
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const s = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const TONE = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", ink: "--l" };
const WORD = { arrow: "Arrow", box: "Box", ellipse: "Ellipse", line: "Line", text: "Text", pin: "Pin", highlight: "Highlight" };
const ENDS = { arrow: true, line: true, box: true, ellipse: true, highlight: true };
const ninth = ([x, y]) => {
  const r = y < 1 / 3 ? "upper" : y < 2 / 3 ? "middle" : "lower", c = x < 1 / 3 ? "left" : x < 2 / 3 ? "centre" : "right";
  return r === "middle" ? (c === "centre" ? "centre" : `middle ${c}`) : `${r} ${c}`;
};
function named(m, all) {
  const n = all.filter((o) => o.kind === m.kind).indexOf(m) + 1;
  const g = m.group ? `${m.group}, ` : "";
  if (m.kind === "text") return `${g}Text “${m.text ?? ""}”, ${ninth(m.at)}`;
  return `${g}${WORD[m.kind]} ${m.kind === "pin" && m.text ? m.text : n}, ${ninth(m.at)}`;
}
const ink = (m) => `var(${TONE[m.tone] ?? "--r"})`;

function shape(m, W, H, cls) {
  const g = s("g", { class: `mkd ${cls ?? ""}` });
  g.style.setProperty("--mk", ink(m));
  const P = (p) => [p[0] * W, p[1] * H];
  const [x1, y1] = P(m.at), [x2, y2] = P(m.to ?? m.at);
  const both = (el) => { const halo = el.cloneNode(); halo.setAttribute("class", "mkh"); g.append(halo, el); };
  if (m.path) {
    const pts = m.path.map((p) => P(p).join(",")).join(" ");
    both(s("polyline", { points: pts, class: "mki" }));
  } else if (m.kind === "line" || m.kind === "arrow") {
    both(s("line", { x1, y1, x2, y2, class: "mki" }));
    if (m.kind === "arrow") {
      const a = Math.atan2(y2 - y1, x2 - x1), L = 16, w = 8;
      const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a);
      const pts = `${x2},${y2} ${bx + w * Math.sin(a)},${by - w * Math.cos(a)} ${bx - w * Math.sin(a)},${by + w * Math.cos(a)}`;
      both(s("polygon", { points: pts, class: "mki mkf" }));
    }
  } else if (m.kind === "box" || m.kind === "highlight") {
    const r = { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
    if (m.kind === "highlight") g.append(s("rect", { ...r, class: "mkl" }));
    else both(s("rect", { ...r, class: "mki" }));
  } else if (m.kind === "ellipse") {
    both(s("ellipse", { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, rx: Math.abs(x2 - x1) / 2, ry: Math.abs(y2 - y1) / 2, class: "mki" }));
  } else if (m.kind === "pin") {
    g.append(s("circle", { cx: x1, cy: y1, r: 6, class: "mkp" }));
  }
  return g;
}

function bounds(m, W, H) {
  const pts = m.path ?? [m.at, m.to ?? m.at];
  const xs = pts.map((p) => p[0] * W), ys = pts.map((p) => p[1] * H);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function place(e, x, y, w, ht) { Object.assign(e.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${ht}px` }); }

function label(m, x, y, c) {
  if (m.kind === "text") { const t = h("span", `mkt ${c}`, m.text ?? ""); t.style.setProperty("--mk", ink(m)); t.style.left = `${x}px`; t.style.top = `${y}px`; return t; }
  if (m.kind === "pin") { const t = h("span", `mkn ${c}`, m.text ?? "…"); t.style.setProperty("--mk", ink(m)); t.style.left = `${x + 7}px`; t.style.top = `${y - 23}px`; return t; }
  return null;
}

function paint(fig) {
  const b = JSON.parse(fig.dataset.m), z = fig.querySelector(".mkz"), W = z.clientWidth, H = z.clientHeight;
  const svg = s("svg", { class: "mkv", width: W, height: H, viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
  const top = h("div", "mko");
  const marks = b.marks ?? [];
  const ph = b.phase ?? {};
  const out = new Set(marks.filter((m) => m.id === ph.id && ph.at === "sent").map((m) => m.group).filter(Boolean));
  for (const m of marks) {
    const live = m.id === ph.id ? ph : null;
    const drawn = live && live.c && live.at !== "refused" ? { ...m, ...live.c } : m;
    if (live && live.c && (live.at === "previewing" || live.at === "dragging")) {
      svg.append(shape(m, W, H, "ghost"));
    }
    const cls = [live ? `p-${live.at}` : "", m.fixed ? "fixed" : "", m.fixed && out.has(m.group) ? "dim" : "", m.id === b.sel ? "sel" : ""].join(" ");
    svg.append(shape(drawn, W, H, cls));
    const [x1, y1] = [drawn.at[0] * W, drawn.at[1] * H];
    const l = label(drawn, x1, y1, cls); if (l) top.append(l);
    if (b.plain) continue;
    const [l0, t0, r0, b0] = bounds(drawn, W, H);
    const stop = h("span", `mk ${cls}${b.focus === m.id ? " fv" : ""}`);
    const pad = m.kind === "pin" ? 12 : 6;
    const wide = m.kind === "text" && l ? Math.min(24 * 7.5, (m.text ?? "").length * 7 + 12) : 0;
    place(stop, l0 - pad, t0 - pad - (m.kind === "pin" ? 12 : 0), Math.max(r0 - l0, wide) + 2 * pad + (m.kind === "pin" ? 22 : 0), Math.max(b0 - t0, m.kind === "text" ? 20 : 0) + 2 * pad + (m.kind === "pin" ? 12 : 0));
    if (m.fixed) stop.setAttribute("role", "img"); else { stop.setAttribute("role", "button"); stop.tabIndex = 0; stop.setAttribute("aria-roledescription", "mark"); }
    stop.setAttribute("aria-label", named(m, marks));
    if (live) stop.dataset.phase = live.at;
    top.append(stop);
    if (live && live.at === "sent") { const busy = h("span", "mkb", "↻"); busy.style.left = `${r0 + 4}px`; busy.style.top = `${t0 - 18}px`; busy.setAttribute("aria-hidden", "true"); top.append(busy); }
    if (m.id === b.sel && ENDS[m.kind] && !m.fixed) {
      for (const end of ["at", "to"]) {
        const p = drawn[end]; if (!p) continue;
        const grip = h("span", `mkg${b.focus === `${m.id}:${end}` ? " fv" : ""}`);
        grip.style.left = `${p[0] * W}px`; grip.style.top = `${p[1] * H}px`;
        grip.setAttribute("role", "button"); grip.setAttribute("aria-label", `${end === "at" ? "Start" : "End"} of ${named(m, marks)}`);
        top.append(grip);
      }
    }
  }
  if (b.ghost) svg.append(shape(b.ghost, W, H, b.ghost.small ? "p-dragging" : "p-previewing"));
  if (b.typing) {
    const t = h("span", "mkin"); t.style.left = `${b.typing.at[0] * W}px`; t.style.top = `${b.typing.at[1] * H}px`;
    const i = h("input"); i.value = b.typing.text ?? ""; i.setAttribute("aria-label", "Text of the new mark"); i.size = 18;
    const add = h("button"); add.type = "button"; add.append(h("span", "", "add"));
    t.append(i, add); top.append(t);
  }
  z.append(svg, top);
  if (b.plain) {
    const list = marks.map((m) => named(m, marks)).join("; ");
    z.setAttribute("role", "img"); z.setAttribute("aria-label", `${b.alt}. ${marks.length} marks: ${list}`);
  }
}

function toolbar(b) {
  const bar = h("div", "mkbar");
  const tools = h("div", "mktl"); tools.setAttribute("role", "toolbar"); tools.setAttribute("aria-label", "Marks");
  for (const k of b.tools ?? []) {
    const t = h("button", (b.tool === k ? "on" : "") + (b.focus === `tool:${k}` ? " fv" : "")); t.type = "button";
    t.append(h("span", "", k)); t.setAttribute("aria-pressed", String(b.tool === k)); t.setAttribute("aria-label", `${WORD[k]} tool`);
    tools.append(t);
  }
  bar.append(tools);
  if (b.groups) {
    const g = h("label", "mkgp"); g.append(h("span", "m", "into"));
    const sel = h("select"); for (const x of b.groups) { const o = h("option", "", x); o.selected = x === b.into; sel.append(o); }
    g.append(sel); bar.append(g);
  }
  const right = h("div", "mkr");
  if (b.remove) { const d = h("button", "bad"); d.type = "button"; d.append(h("span", "", "delete")); d.disabled = !b.sel; right.append(d); }
  if (b.zoomable) {
    const z = Math.round((b.zoom ?? 1) * 100);
    for (const [t, n] of [["−", "Zoom out"], [`${z}%`, "Fit"], ["+", "Zoom in"]]) { const x = h("button", t.endsWith("%") ? "mkzm" : ""); x.type = "button"; x.append(h("span", "", t)); x.setAttribute("aria-label", n); right.append(x); }
  }
  bar.append(right);
  return bar;
}

function media(b) {
  const f = h("figure", `media mkm${b.plain ? " plain" : ""}`);
  f.dataset.m = JSON.stringify(b);
  if (!b.plain && b.tools) f.append(toolbar(b));
  const frame = h("div", `mkw${b.tool ? " drawing" : ""}`);
  frame.style.aspectRatio = `${b.width} / ${b.height}`;
  const z = h("div", "mkz");
  const k = b.zoom ?? 1, [px, py] = b.pan ?? [0, 0];
  Object.assign(z.style, { width: `${k * 100}%`, left: `${-px * k * 100}%`, top: `${-py * k * 100}%` });
  const img = h("img"); img.src = b.src; img.alt = b.plain ? "" : b.alt; img.width = b.width; img.height = b.height;
  z.append(img); frame.append(z); f.append(frame);
  if (!b.plain && !(b.marks ?? []).length && b.tools) f.append(h("p", "mkhint", "pick a tool, then drag on the photo"));
  if (b.caption) f.append(h("figcaption", "", b.caption));
  return f;
}

function draw() {
  document.querySelectorAll("[data-b]").forEach((n) => n.replaceWith(media(JSON.parse(n.dataset.b))));
  document.querySelectorAll(".mkm").forEach(paint);
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
