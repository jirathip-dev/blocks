import type { Blk } from "../../core/tree.ts";
import { fallback } from "../block.ts";
import { type Ctx, obj } from "../ctx.ts";
import { el, h } from "../dom.ts";

type Edge = { from: string; into: string; both: boolean };
type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number; mx: number; my: number };
type Metrics = { cls: string; widths: [number, number, number]; gap: number; gutter: number; height: number; rowGap: number };
type Counts = Record<string, number>;

const WIDE: Metrics = { cls: "wide", widths: [156, 176, 140], gap: 40, gutter: 18, height: 54, rowGap: 22 };
const PHONE: Metrics = { cls: "phone", widths: [108, 100, 78], gap: 22, gutter: 12, height: 46, rowGap: 20 };
const TOP = 34;
const seen = new Map<string, { counts: Counts; was: Counts }>();
const same = (a: Counts, b: Counts) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

function chart(source: string) {
  const order: string[] = [], spine: string[] = [], parsed: Edge[] = [], edges: Edge[] = [];
  const names = new Map<string, string>(), row = new Map<string, number>(), side = new Map<string, number>(), optional = new Set<string>();
  const add = (id: string) => void (id !== "[*]" && !order.includes(id) && order.push(id));
  for (const line of source.split("\n").map((l) => l.trim())) {
    const [, label, id] = /^state\s+"([^"]+)"\s+as\s+(\w+)$/.exec(line) ?? [];
    const [, alone] = /^state\s+(\w+)$/.exec(line) ?? [];
    const [, from, into] = /^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)/.exec(line) ?? [];
    if (label && id) {
      names.set(id, label);
      add(id);
    } else if (alone) add(alone);
    else if (from && into) {
      add(from);
      add(into);
      parsed.push({ from, into, both: false });
    }
  }
  const at = (id: string) => order.indexOf(id);
  const forward = parsed.filter((e) => at(e.from) >= 0 && at(e.from) < at(e.into));
  const length = new Map<string, number>(), next = new Map<string, string>();
  const len = (id: string) => length.get(id) ?? 1;
  for (const id of [...order].reverse())
    for (const e of forward)
      if (e.from === id && len(e.into) + 1 > len(id)) {
        length.set(id, len(e.into) + 1);
        next.set(id, e.into);
      }
  let id: string | undefined = parsed.find((e) => e.from === "[*]")?.into ?? order[0];
  while (id !== undefined && !spine.includes(id)) {
    row.set(id, spine.length);
    side.set(id, 0);
    spine.push(id);
    id = next.get(id);
  }
  for (const e of forward) {
    const a = spine.indexOf(e.from), z = spine.indexOf(e.into);
    if (a >= 0 && z > a + 1) spine.slice(a + 1, z).forEach((s) => optional.add(s));
  }
  for (const id of order.filter((o) => !side.has(o))) {
    const touching = parsed.flatMap((e) => (e.from === id ? [e.into] : e.into === id ? [e.from] : [])).filter((n) => side.get(n) === 0);
    const before = parsed.filter((e) => e.into === id && row.has(e.from)).map((e) => e.from);
    let column = 1, place = 0;
    if (touching.length) {
      place = Math.min(...touching.map((n) => row.get(n) ?? 0));
      column = parsed.some((e) => e.from === id && side.get(e.into) === 0) ? 1 : -1;
    } else if (before.length) {
      place = Math.max(...before.map((b) => row.get(b) ?? 0)) + 1;
      column = before.map((b) => side.get(b)).find((s) => s !== 0) ?? 1;
    }
    while ([...side].some(([k, s]) => s === column && row.get(k) === place)) place += 1;
    row.set(id, place);
    side.set(id, column);
  }
  for (const e of parsed) {
    const a = row.get(e.from), z = row.get(e.into);
    if (a === undefined || z === undefined || (side.get(e.from) === 0 && side.get(e.into) === 0 && Math.abs(a - z) > 1)) continue;
    const twin = edges.find((t) => t.from === e.into && t.into === e.from);
    if (twin) twin.both = true;
    else edges.push({ ...e });
  }
  return { order, names, spine, row, side, optional, edges, rows: Math.max(-1, ...row.values()) + 1 };
}

const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(["http:", "", "www.w3.org", "2000", "svg"].join("/"), tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

function map(g: ReturnType<typeof chart>, b: Blk, c: Ctx, m: Metrics, counts: Counts, was: Counts): HTMLElement {
  const centre = new Map<number, number>(), used = new Set(g.side.values());
  let left = m.gutter;
  for (const s of [-1, 0, 1].filter((s) => used.has(s))) {
    const w = m.widths[s + 1] ?? 0;
    centre.set(s, left + w / 2);
    left += w + m.gap;
  }
  const box = (id: string): Box => {
    const s = g.side.get(id) ?? 0, w = m.widths[s + 1] ?? 0, y = TOP + (g.row.get(id) ?? 0) * (m.height + m.rowGap), mx = centre.get(s) ?? 0;
    return { x: mx - w / 2, y, w, h: m.height, mx, my: y + m.height / 2 };
  };
  const width = left - m.gap + m.gutter, height = TOP + g.rows * (m.height + m.rowGap) - m.rowGap + 12;
  const out = el("div", `dgm ${m.cls}`);
  out.style.cssText = `width:${width}px;height:${height}px`;
  const svg = svgEl("svg", { width, height, "aria-hidden": "true" });
  const d = (pts: Pt[]) => `M${pts.map((p) => p.join(" ")).join("L")}`;
  const head = (tip: Pt, back: Pt) => {
    const a = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
    svg.append(svgEl("path", { d: d([-0.45, 0, 0.45].map((t): Pt => (t ? [tip[0] - 8 * Math.cos(a + t), tip[1] - 8 * Math.sin(a + t)] : tip))), class: "dgh" }));
  };
  const route = (f: Box, t: Box, s: number): Pt[] => {
    const down = t.my > f.my;
    if (f.my === t.my) return f.mx < t.mx ? [[f.x + f.w, f.my], [t.x, t.my]] : [[f.x, f.my], [t.x + t.w, t.my]];
    if (f.mx === t.mx && Math.abs(f.my - t.my) <= m.height + m.rowGap + 1) return [[f.mx, down ? f.y + f.h : f.y], [t.mx, down ? t.y : t.y + t.h]];
    if (f.mx === t.mx) {
      const ex = s < 0 ? f.x : f.x + f.w, gx = ex + (s < 0 ? -1 : 1) * (m.gutter - 3);
      return [[ex, f.my], [gx, f.my], [gx, t.my], [ex, t.my]];
    }
    if (s === 0) return [[t.mx > f.mx ? f.x + f.w : f.x, f.my], [t.mx, f.my], [t.mx, down ? t.y : t.y + t.h]];
    return [[f.mx, down ? f.y + f.h : f.y], [f.mx, t.my], [t.mx > f.mx ? t.x : t.x + t.w, t.my]];
  };
  const nodes = b["nodes"], node = (id: string) => obj(Array.isArray(nodes) ? nodes.find((n) => obj(n)["id"] === id) : obj(nodes)[id]);
  const first = g.spine[0] === undefined ? null : box(g.spine[0]);
  if (first) svg.append(svgEl("circle", { cx: first.mx, cy: 10, r: 6, class: "dgs" }), svgEl("path", { d: d([[first.mx, 16], [first.mx, first.y]]), class: "dge" }));
  for (const e of g.edges) {
    const pts = route(box(e.from), box(e.into), g.side.get(e.from) ?? 0);
    const timer = node(e.from)["limit"] != null || node(e.into)["limit"] != null;
    svg.append(svgEl("path", { d: d(pts), class: timer ? "dge timer" : "dge" }));
    const [tip, back] = [pts[pts.length - 1], pts[pts.length - 2]];
    if (tip && back) head(tip, back);
    const [start, after] = pts;
    if (e.both && start && after) head(start, after);
  }
  out.append(svg);
  for (const id of g.order) {
    const n = node(id), at = box(id), name = g.names.get(id) ?? id, label = String(n["label"] ?? name);
    let e: HTMLElement;
    if (n["limit"] != null) {
      const mark = h("span", "", "⧗");
      mark.setAttribute("aria-hidden", "true");
      e = h("div", "dgn timer", mark, h("span", "", h("span", "dgl", label), h("span", "dgv", String(n["value"] ?? ""))));
      e.setAttribute("aria-label", `${label} ${n["value"] ?? ""}, opens its setting`);
    } else {
      const count = counts[id] ?? 0, before = was[id], moved = before !== undefined && before !== count, opt = g.optional.has(id);
      const cls = `dgn ${n["state"] ?? "idle"}${count === 0 ? " zero" : ""}${moved ? " moved" : ""}${b["selected"] === id ? " picked" : ""}`;
      const extra = moved ? [h("small", "", `was ${before}`)] : opt ? [h("small", "opt", "optional")] : [];
      e = h("div", cls, h("span", "dgl", name), h("span", "dgc", String(count), ...extra));
      e.setAttribute("aria-label", `${name}, ${count} issue${count === 1 ? "" : "s"}${opt ? ", optional" : ""}`);
    }
    e.style.cssText = `left:${at.x}px;top:${at.y}px;width:${at.w}px;height:${at.h}px`;
    e.title = label;
    if (n["tap"]) {
      e.classList.add("tap");
      e.tabIndex = 0;
      e.setAttribute("role", "button");
      e.onclick = () => c.tap(n["tap"]);
    }
    out.append(e);
  }
  return out;
}

export function diagram(b: Blk, c: Ctx): HTMLElement {
  const g = chart(String(b["source"] ?? ""));
  if (!g.order.length) return fallback(b, c);
  const counts: Counts = Object.fromEntries(Object.entries(obj(b["counts"])).map(([k, v]) => [k, Number(v)]));
  const key = String(b["id"] ?? ""), prev = seen.get(key);
  const was = !prev ? {} : same(prev.counts, counts) ? prev.was : prev.counts;
  seen.set(key, { counts, was });
  const box = h("div", "dg", map(g, b, c, WIDE, counts, was), map(g, b, c, PHONE, counts, was));
  return box;
}
