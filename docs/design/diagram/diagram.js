// Preview only: the Swift BlockDiagram's chart and layout, ported so these pages draw what the algorithm gives.
// Impl writes its own `web/src/render/diagram.ts`; nothing here is product code.
const WIDE = { widths: { "-1": 156, 0: 176, 1: 140 }, gap: 40, gutter: 18, height: 54, rowGap: 22 };
const PHONE = { widths: { "-1": 108, 0: 100, 1: 78 }, gap: 22, gutter: 12, height: 46, rowGap: 20 };
const TOP = 34;
const NS = "http://www.w3.org/2000/svg";

function chart(source) {
  const order = [], names = {}, parsed = [], spine = [], row = {}, side = {}, optional = new Set(), edges = [];
  const add = (id) => id !== "[*]" && !order.includes(id) && order.push(id);
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    let m;
    if ((m = line.match(/^state\s+"([^"]+)"\s+as\s+(\w+)$/))) { names[m[2]] = m[1]; add(m[2]); }
    else if ((m = line.match(/^state\s+(\w+)$/))) add(m[1]);
    else if ((m = line.match(/^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)/))) { add(m[1]); add(m[2]); parsed.push({ from: m[1], into: m[2] }); }
  }
  const at = (id) => order.indexOf(id);
  const forward = parsed.filter((e) => at(e.from) >= 0 && at(e.into) >= 0 && at(e.from) < at(e.into));
  const length = {}, next = {};
  for (const id of [...order].reverse())
    for (const e of forward)
      if (e.from === id && (length[e.into] ?? 1) + 1 > (length[id] ?? 1)) { length[id] = (length[e.into] ?? 1) + 1; next[id] = e.into; }
  let id = parsed.find((e) => e.from === "[*]")?.into ?? order[0];
  while (id && !spine.includes(id)) { row[id] = spine.length; side[id] = 0; spine.push(id); id = next[id]; }
  for (const e of forward) {
    const a = spine.indexOf(e.from), b = spine.indexOf(e.into);
    if (a >= 0 && b > a + 1) spine.slice(a + 1, b).forEach((s) => optional.add(s));
  }
  for (const id of order) {
    if (side[id] !== undefined) continue;
    const touching = parsed.map((e) => (e.from === id ? e.into : e.into === id ? e.from : null)).filter((n) => side[n] === 0).map((n) => row[n]);
    const before = parsed.filter((e) => e.into === id && row[e.from] !== undefined).map((e) => e.from);
    let column = 1, place = 0;
    if (touching.length) { place = Math.min(...touching); column = parsed.some((e) => e.from === id && side[e.into] === 0) ? 1 : -1; }
    else if (before.length) { place = Math.max(...before.map((b) => row[b])) + 1; column = before.map((b) => side[b]).find((s) => s !== 0) ?? 1; }
    while (Object.keys(side).some((k) => side[k] === column && row[k] === place)) place += 1;
    row[id] = place; side[id] = column;
  }
  for (const e of parsed) {
    if (row[e.from] === undefined || row[e.into] === undefined) continue;
    if (side[e.from] === 0 && side[e.into] === 0 && Math.abs(row[e.from] - row[e.into]) > 1) continue;
    const twin = edges.find((t) => t.from === e.into && t.into === e.from);
    if (twin) twin.both = true; else edges.push({ ...e, both: false });
  }
  return { order, names, spine, row, side, optional, edges, rows: Math.max(-1, ...Object.values(row)) + 1 };
}

function map(c, b, m, was) {
  const used = new Set(Object.values(c.side));
  let left = m.gutter;
  const centre = {};
  for (const s of [-1, 0, 1].filter((s) => used.has(s))) { centre[s] = left + m.widths[s] / 2; left += m.widths[s] + m.gap; }
  const box = (id) => {
    const s = c.side[id], w = m.widths[s], top = TOP + c.row[id] * (m.height + m.rowGap);
    return { x: centre[s] - w / 2, y: top, w, h: m.height, mx: centre[s], my: top + m.height / 2 };
  };
  const width = left - m.gap + m.gutter, height = TOP + c.rows * (m.height + m.rowGap) - m.rowGap + 12;
  const out = document.createElement("div");
  out.className = `dgm ${m === WIDE ? "wide" : "phone"}`;
  out.style.cssText = `width:${width}px;height:${height}px`;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", width); svg.setAttribute("height", height); svg.setAttribute("aria-hidden", "true");
  const put = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); };
  const nodes = b.nodes ?? {};
  const first = c.spine[0] && box(c.spine[0]);
  if (first) { put("circle", { cx: first.mx, cy: 10, r: 6, class: "dgs" }); put("path", { d: `M${first.mx} 16V${first.y}`, class: "dge" }); }
  const head = (tip, back) => {
    const a = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
    const p = [-0.45, 0, 0.45].map((t) => (t === 0 ? tip : [tip[0] - 8 * Math.cos(a + t), tip[1] - 8 * Math.sin(a + t)]));
    put("path", { d: `M${p.map((q) => q.join(" ")).join("L")}Z`, class: "dgh" });
  };
  for (const e of c.edges) {
    const f = box(e.from), t = box(e.into), s = c.side[e.from];
    const timer = nodes[e.from]?.limit != null || nodes[e.into]?.limit != null;
    let pts;
    if (f.my === t.my) { const r = f.mx < t.mx; pts = [[r ? f.x + f.w : f.x, f.my], [r ? t.x : t.x + t.w, t.my]]; }
    else if (f.mx === t.mx) {
      const down = t.my > f.my;
      if (Math.abs(f.my - t.my) <= m.height + m.rowGap + 1) pts = [[f.mx, down ? f.y + f.h : f.y], [t.mx, down ? t.y : t.y + t.h]];
      else { const ex = s < 0 ? f.x : f.x + f.w, g = ex + (s < 0 ? -1 : 1) * (m.gutter - 3); pts = [[ex, f.my], [g, f.my], [g, t.my], [ex, t.my]]; }
    } else {
      const down = t.my > f.my;
      if (s === 0) pts = [[t.mx > f.mx ? f.x + f.w : f.x, f.my], [t.mx, f.my], [t.mx, down ? t.y : t.y + t.h]];
      else pts = [[f.mx, down ? f.y + f.h : f.y], [f.mx, t.my], [t.mx > f.mx ? t.x : t.x + t.w, t.my]];
    }
    put("path", { d: `M${pts.map((p) => p.join(" ")).join("L")}`, class: `dge${timer ? " timer" : ""}` });
    head(pts[pts.length - 1], pts[pts.length - 2]);
    if (e.both) head(pts[0], pts[1]);
  }
  out.append(svg);
  for (const id of c.order) {
    const n = nodes[id] ?? {}, at = box(id), name = c.names[id] ?? id;
    const el = document.createElement("div");
    el.style.cssText = `left:${at.x}px;top:${at.y}px;width:${at.w}px;height:${at.h}px`;
    if (n.limit != null) {
      el.className = "dgn timer";
      el.innerHTML = `<span aria-hidden=true>⧗</span><span><span class=dgl>${n.label ?? name}</span><span class=dgv>${n.value ?? ""}</span></span>`;
      el.setAttribute("aria-label", `${n.label ?? name} ${n.value ?? ""}, opens its setting`);
    } else {
      const count = b.counts?.[id] ?? 0, before = was?.[id], moved = before !== undefined && before !== count;
      el.className = `dgn ${n.state ?? "idle"}${count === 0 ? " zero" : ""}${moved ? " moved" : ""}${b.selected === id ? " picked" : ""}`;
      const extra = moved ? `<small>was ${before}</small>` : c.optional.has(id) ? `<small class=opt>optional</small>` : "";
      el.innerHTML = `<span class=dgl>${name}</span><span class=dgc>${count}${extra}</span>`;
      el.setAttribute("aria-label", `${name}, ${count} issue${count === 1 ? "" : "s"}${c.optional.has(id) ? ", optional" : ""}`);
    }
    el.title = n.label ?? name;
    if (n.tap) { el.classList.add("tap"); el.tabIndex = 0; el.setAttribute("role", "button"); }
    out.append(el);
  }
  return out;
}

/// Draws a diagram block, as the web renderer would; `was` stands in for the counts of its previous draw.
function diagram(b, was) {
  const c = chart(b.source ?? "");
  if (!c.order.length) {
    const f = document.createElement("div");
    f.dataset.fallback = "";
    f.innerHTML = `<div class=row><span class=rm><span class=rt>${b.fallback?.title ?? ""}</span><span class=rs>${b.fallback?.subtitle ?? ""}</span></span></div>`;
    return f;
  }
  const box = document.createElement("div");
  box.className = "dg";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", b.title ?? "Workflow");
  box.append(map(c, b, WIDE, was), map(c, b, PHONE, was));
  return box;
}
