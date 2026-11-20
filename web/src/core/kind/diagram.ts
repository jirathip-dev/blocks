type Blk = Record<string, unknown>;
type Edge = { from: string; into: string; both: boolean };
type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number; mx: number; my: number };
type Metrics = { cls: string; widths: [number, number, number]; gap: number; gutter: number; height: number; rowGap: number };
type Counts = Record<string, number>;
type Chart = ReturnType<typeof chart>;
/// One state's box: where it sits, its classes, name and tap, then a timer's value or a count with its note.
export type Place = { id: string; cls: string; at: Box; name: string; title: string; aria: string; tap: unknown; timer: { value: string } | null; count: { n: string; note: { cls: string; text: string } | null } | null };
/// A diagram at one size: its box, the start dot, each path with its class, and each state's place.
export type Plan = { cls: string; width: number; height: number; dot: { cx: number; cy: number } | null; paths: { d: string; cls: string }[]; places: Place[] };

const WIDE: Metrics = { cls: "wide", widths: [156, 176, 140], gap: 40, gutter: 18, height: 54, rowGap: 22 };
const PHONE: Metrics = { cls: "phone", widths: [108, 100, 78], gap: 22, gutter: 12, height: 46, rowGap: 20 };
const TOP = 34;
const seen = new Map<string, { counts: Counts; was: Counts }>();
const same = (a: Counts, b: Counts) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const isObj = (v: unknown): v is Blk => typeof v === "object" && v !== null && !Array.isArray(v);
const obj = (v: unknown): Blk => (isObj(v) ? v : {});
const node = (b: Blk, id: string) => {
  const nodes = b["nodes"];
  return obj(Array.isArray(nodes) ? nodes.find((n) => obj(n)["id"] === id) : obj(nodes)[id]);
};

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

const d = (pts: Pt[]) => `M${pts.map((p) => p.join(" ")).join("L")}`;
const head = (tip: Pt, back: Pt) => {
  const a = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
  return { d: d([-0.45, 0, 0.45].map((t): Pt => (t ? [tip[0] - 8 * Math.cos(a + t), tip[1] - 8 * Math.sin(a + t)] : tip))), cls: "dgh" };
};

function route(f: Box, t: Box, s: number, m: Metrics): Pt[] {
  const down = t.my > f.my;
  if (f.my === t.my) return f.mx < t.mx ? [[f.x + f.w, f.my], [t.x, t.my]] : [[f.x, f.my], [t.x + t.w, t.my]];
  if (f.mx === t.mx && Math.abs(f.my - t.my) <= m.height + m.rowGap + 1) return [[f.mx, down ? f.y + f.h : f.y], [t.mx, down ? t.y : t.y + t.h]];
  if (f.mx === t.mx) {
    const ex = s < 0 ? f.x : f.x + f.w, gx = ex + (s < 0 ? -1 : 1) * (m.gutter - 3);
    return [[ex, f.my], [gx, f.my], [gx, t.my], [ex, t.my]];
  }
  if (s === 0) return [[t.mx > f.mx ? f.x + f.w : f.x, f.my], [t.mx, f.my], [t.mx, down ? t.y : t.y + t.h]];
  return [[f.mx, down ? f.y + f.h : f.y], [f.mx, t.my], [t.mx > f.mx ? t.x : t.x + t.w, t.my]];
}

function place(g: Chart, b: Blk, id: string, at: Box, counts: Counts, was: Counts): Place {
  const n = node(b, id);
  const name = g.names.get(id) ?? id, label = String(n["label"] ?? name), tap = n["tap"];
  const base = { id, at, title: label, tap };
  if (n["limit"] != null) {
    const value = String(n["value"] ?? "");
    return { ...base, name: label, cls: "dgn timer", aria: `${label} ${value}, opens its setting`, timer: { value }, count: null };
  }
  const count = counts[id] ?? 0, before = was[id], moved = before !== undefined && before !== count, opt = g.optional.has(id);
  const cls = `dgn ${String(n["state"] ?? "idle")}${count === 0 ? " zero" : ""}${moved ? " moved" : ""}${b["selected"] === id ? " picked" : ""}`;
  const note = moved ? { cls: "", text: `was ${before}` } : opt ? { cls: "opt", text: "optional" } : null;
  return { ...base, name, cls, aria: `${name}, ${count} issue${count === 1 ? "" : "s"}${opt ? ", optional" : ""}`, timer: null, count: { n: String(count), note } };
}

function plan(g: Chart, b: Blk, m: Metrics, counts: Counts, was: Counts): Plan {
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
  const limited = (id: string) => node(b, id)["limit"] != null;
  const paths: Plan["paths"] = [];
  const first = g.spine[0] === undefined ? null : box(g.spine[0]);
  if (first) paths.push({ d: d([[first.mx, 16], [first.mx, first.y]]), cls: "dge" });
  for (const e of g.edges) {
    const pts = route(box(e.from), box(e.into), g.side.get(e.from) ?? 0, m);
    paths.push({ d: d(pts), cls: limited(e.from) || limited(e.into) ? "dge timer" : "dge" });
    const [tip, back] = [pts[pts.length - 1], pts[pts.length - 2]];
    if (tip && back) paths.push(head(tip, back));
    const [start, after] = pts;
    if (e.both && start && after) paths.push(head(start, after));
  }
  const height = TOP + g.rows * (m.height + m.rowGap) - m.rowGap + 12;
  return { cls: m.cls, width: left - m.gap + m.gutter, height, dot: first ? { cx: first.mx, cy: 10 } : null, paths, places: g.order.map((id) => place(g, b, id, box(id), counts, was)) };
}

/// A diagram's wide and phone plans, counts compared with the last ones drawn for its id; none when its source names no state.
export function diagrams(b: Blk): Plan[] {
  const g = chart(String(b["source"] ?? ""));
  if (!g.order.length) return [];
  const counts: Counts = Object.fromEntries(Object.entries(obj(b["counts"])).map(([k, v]) => [k, Number(v)]));
  const key = String(b["id"] ?? ""), prev = seen.get(key);
  const was = !prev ? {} : same(prev.counts, counts) ? prev.was : prev.counts;
  seen.set(key, { counts, was });
  return [WIDE, PHONE].map((m) => plan(g, b, m, counts, was));
}
