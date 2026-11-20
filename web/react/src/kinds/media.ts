import { createElement, Fragment, type ReactNode, type RefObject, useContext, useLayoutEffect, useReducer, useRef, useState } from "react";
import type { Mark, MarkKind, Media } from "../../../src/core/index.ts";
import { type MarkChange, type MarkGrab, type MarkReach, media as rules, named, said, type Spot } from "../../../src/core/kind/media.ts";
import type { Nudge } from "../../../src/core/gesture.ts";
import { type Driven, gestured, type Held, held, zoomed } from "../../../src/gesture.ts";
import { Cx } from "../act.ts";
import type { V } from "../draw.ts";
import { type Attrs, h } from "../h.ts";

const TONES = ["ok", "warn", "bad", "info", "accent", "ink"];
const HINT = "pick a tool, then drag on the photo";

type Drawn = Mark & { at: number[] };
type Ref<E = HTMLElement> = RefObject<E | null>;
type Wire = (c: Driven) => void;
type Pen = { tool: MarkKind; group?: string; at?: Spot; text?: string };
type Shown = { k: string; item: string; kind?: MarkKind; c: MarkChange };
type Reach = (dx: number, dy: number, x: number, y: number) => MarkReach;
type Local = Record<string, unknown>;
type Again = (press?: string) => void;
type View = { b: Media; k: string; v: Local; shown: Shown | null; show: (s: Shown | null) => void; reach: Reach; again: Again; wires: Wire[] };

const ref = <E = HTMLElement>(): Ref<E> => ({ current: null });
const pc = (v: number | undefined) => `${(v ?? 0) * 100}%`;
const tone = (m: Mark) => (typeof m.tone === "string" && TONES.includes(m.tone) ? ` mk-${m.tone}` : "");
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const idle = (e: HTMLElement) => (e.dataset.phase ?? "idle") === "idle";
const merged = (m: Mark, c: MarkChange | null): Drawn => (c?.at ? { ...m, at: c.at, ...(c.to ? { to: c.to } : {}) } : m);
const isChange = (v: unknown): v is MarkChange => typeof v === "object" && v !== null && !Array.isArray(v);
const places = (m: Mark): Spot[] => [m.at, ...(m.to ? [m.to] : []), ...(m.path ?? [])].map((p) => [p[0] ?? 0, p[1] ?? 0]);
const mirror = (from: HTMLElement, g: Element) => new MutationObserver(() => from.dataset.phase && g.setAttribute("data-phase", from.dataset.phase)).observe(from, { attributeFilter: ["data-phase"] });

function beside(el: HTMLElement, wire: () => void) {
  const n = el.parentElement?.children.length ?? 0;
  wire();
  el.after(...Array.from(el.parentElement?.children ?? []).slice(n));
}

function shape(m: Drawn, w: number, ht: number): ReactNode[] {
  const [x1, y1] = [(m.at[0] ?? 0) * w, (m.at[1] ?? 0) * ht];
  const [x2, y2] = [(m.to?.[0] ?? m.at[0] ?? 0) * w, (m.to?.[1] ?? m.at[1] ?? 0) * ht];
  const both = (t: string, a: Attrs) => [h(t, "mkh", a), h(t, "mki", a)];
  const r = { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  const body = m.path
    ? both("polyline", { points: m.path.map((p) => `${(p[0] ?? 0) * w},${(p[1] ?? 0) * ht}`).join(" ") })
    : m.kind === "line" || m.kind === "arrow"
      ? both("line", { x1, y1, x2, y2 })
      : m.kind === "box"
        ? both("rect", r)
        : m.kind === "highlight"
          ? [h("rect", "mkl", r)]
          : m.kind === "ellipse"
            ? both("ellipse", { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, rx: r.width / 2, ry: r.height / 2 })
            : [];
  if (m.kind !== "arrow" || m.path) return body;
  const [a, len] = [Math.atan2(y2 - y1, x2 - x1), Math.max(w, ht) * 0.025];
  const [bx, by, s, co] = [x2 - len * Math.cos(a), y2 - len * Math.sin(a), (len / 2) * Math.sin(a), (len / 2) * Math.cos(a)];
  return [...body, ...both("polygon", { points: `${x2},${y2} ${bx + s},${by - co} ${bx - s},${by + co}` })];
}

function label(m: Drawn): ReactNode {
  if (m.kind !== "pin" && m.kind !== "text") return null;
  const kids = m.kind === "pin" ? [h("i", "mkpd", null), m.text ? h("span", "mkn", null, m.text) : null] : [h("span", "mkt", null, m.text ?? "")];
  return h("span", `mkla${tone(m)}`, { "aria-hidden": "true", style: { left: pc(m.at[0]), top: pc(m.at[1]) } }, ...kids);
}

const painted = (b: Media, m: Drawn, cls = "", g?: Ref<Element>) => ({ art: h("g", `mkd${tone(m)}${m.fixed ? " fixed" : ""}${cls}`, g ? { ref: g } : null, ...shape(m, b.width, b.height)), top: label(m) });

function frame(b: Media, img: ReactNode, art: ReactNode[], top: ReactNode[], o: { w?: Ref; z?: Ref; cls?: string; under?: ReactNode } = {}) {
  const svg = h("svg", "mkv", { viewBox: `0 0 ${b.width} ${b.height}`, preserveAspectRatio: "none", "aria-hidden": "true" }, ...art);
  const z = h("div", "mkz", { ref: o.z, style: { aspectRatio: `${b.width} / ${b.height}` } }, img, svg, o.under, h("div", "mko", null, ...top));
  return h("div", `mkw${o.cls ?? ""}`, { ref: o.w, style: { width: `min(100%, ${b.width}px)` } }, z);
}

function still(b: Media, hooks: Attrs): ReactNode {
  const marks = b.marks ?? [];
  const alt = marks.length ? `${b.alt}. ${marks.length} marks: ${marks.map((x) => named(b, x.id)).join("; ")}` : b.alt;
  const size = { width: b.width, height: b.height };
  const v = b.video
    ? h("video", "", { src: b.src, "aria-label": b.alt, controls: true, preload: "metadata", ...size, poster: b.poster ?? undefined })
    : h("img", "", { src: b.src, alt, loading: "lazy", ...size });
  const drawn = marks.map((m) => painted(b, m));
  const body = !marks.length || b.video ? v : frame(b, v, drawn.map((p) => p.art), drawn.map((p) => p.top));
  return h("figure", "media", hooks, body, b.caption ? h("figcaption", "", null, b.caption) : null);
}

/// A picture as the HTML renderer draws one; its marks' move, stretch, remove and draw run on the same gesture driver, wired from refs.
export function media({ b, hooks }: V<Media>): ReactNode {
  const cx = useContext(Cx);
  const live = useRef(cx);
  live.current = cx;
  const keep = useRef(new Map<string, Held>());
  const v = useRef<Local>({}).current;
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const [now, show] = useState<Shown | null>(null);
  const [root, z] = [useRef<HTMLElement>(null), useRef<HTMLDivElement>(null)];
  const after = useRef<{ focus?: string; press?: string }>({});
  const k = JSON.stringify([b, v.tool, v.into, v.sel, v.typing]);
  const c: Driven = { act: (a) => live.current.act(a), held: keep.current };
  const wires: Wire[] = [];
  useLayoutEffect(() => {
    for (const w of wires) w(c);
  }, [k]);
  useLayoutEffect(() => {
    const { focus, press } = after.current;
    after.current = {};
    const at = (key?: string) => (key ? root.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) : null);
    at(focus)?.focus();
    at(press)?.click();
  });
  if (b.video || b.id == null || !(b.draw ?? b.move ?? b.stretch ?? b.remove)) return still(b, hooks);
  const again: Again = (press) => {
    const a = document.activeElement;
    after.current = { focus: a instanceof HTMLElement && root.current?.contains(a) ? a.dataset.key : undefined, press };
    redraw();
  };
  const reach: Reach = (dx, dy, x, y) => {
    const r = z.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 };
    const at = (px: number, py: number): Spot => [(px - r.left) / (r.width || 1), (py - r.top) / (r.height || 1)];
    return { from: at(x, y), to: at(x + dx, y + dy) };
  };
  const o: View = { b, k, v, shown: now?.k === k ? now : null, show, reach, again, wires };
  return h("figure", "media mkm", { ...hooks, ref: root }, createElement(Fragment, { key: k }, ...marked(o, c, z)));
}

function marked(o: View, c: Driven, z: Ref<HTMLDivElement>): ReactNode[] {
  const { b, v, shown } = o;
  const marks = b.marks ?? [];
  const tool = (b.tools ?? []).find((t) => t === str(v.tool)) ?? (b.tools?.length === 1 ? b.tools[0] : undefined);
  const groups = [...new Set(marks.filter((m) => !m.fixed && m.group != null).map((m) => m.group ?? ""))];
  const into = groups.find((g) => g === str(v.into)) ?? groups[groups.length - 1];
  const sel = marks.find((m) => m.id === str(v.sel) && !m.fixed);
  const pen = (t: MarkKind): Pen => ({ tool: t, ...(into != null ? { group: into } : {}) });
  const [art, top, late]: ReactNode[][] = [[], [], []];
  const paint = (m: Drawn, cls: string, g?: Ref<Element>) => {
    const p = painted(b, m, cls, g);
    art.push(p.art);
    top.push(p.top);
  };
  const out = held(c, { block: b, rules, grab: { draw: pen(tool ?? b.tools?.[0] ?? "pin") }, item: "draw" });
  for (const m of marks) {
    const g: MarkGrab | undefined = [{ body: m.id }, { end: m.id }, { remove: m.id }].find((x) => rules.word(b, x));
    const h0 = g ? held(c, { block: b, rules, grab: g, item: m.id }) : undefined;
    const mine = shown?.item === m.id;
    const d = mine ? shown.c : isChange(h0) ? h0 : null;
    const gr = ref<Element>();
    paint(merged(m, d), !mine && isChange(h0) ? " sent" : "", gr);
    if (mine) late.push(painted(b, m, " ghost").art);
    if (!m.fixed) stops(o, { m, d, gr, sel: m.id === sel?.id, top });
  }
  if (isChange(out) && out.kind) paint({ id: "", kind: out.kind, at: out.at ?? [], to: out.to, text: out.text }, " sent");
  if (shown?.item === "draw" && shown.kind && shown.c.at) paint(merged({ id: "", kind: shown.kind, at: [] }, shown.c), " new");
  art.push(...late);
  const zooms = b.draw && b.tools?.length === 1 && tool === "pin";
  const w = ref();
  const tools = b.draw && b.tools?.length ? bar(o, { tool, groups, into, sel, pen, zoom: zooms ? { w, z } : null }) : null;
  const under = b.draw && tool ? surface(o, { tool, pen: pen(tool) }) : null;
  if (b.draw && tool === "text" && Array.isArray(v.typing)) top.push(typing(o, { at: v.typing, pen: pen("text") }));
  const parts: ReactNode[] = [tools, frame(b, h("img", "", { src: b.src, alt: b.alt, width: b.width, height: b.height }), art, top, { w, z, cls: zooms ? " zoom" : "", under })];
  if (!marks.length && b.draw) parts.push(h("p", "mkhint", null, HINT));
  if (b.caption) parts.push(h("figcaption", "", null, b.caption));
  return parts;
}

function over(m: Mark) {
  const ps = places(m);
  const [xs, ys] = [ps.map((p) => p[0]), ps.map((p) => p[1])];
  const [l, t, r, d] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  return { left: pc((l + r) / 2), top: pc((t + d) / 2), width: `calc(${pc(r - l)} + 12px)`, height: `calc(${pc(d - t)} + 12px)` };
}

type Stop = { m: Mark; d: MarkChange | null; gr: Ref<Element>; sel: boolean; top: ReactNode[] };

function stops(o: View, s: Stop) {
  const { b, k, v } = o;
  const { m } = s;
  const name = named(b, m.id) ?? m.id;
  const at = merged(m, s.d);
  const follow = (d: MarkChange | null) => o.show(d && { k, item: m.id, c: d });
  const stop = ref();
  const pick = (e: HTMLElement) => {
    if (!idle(e)) return;
    v.sel = s.sel ? undefined : m.id;
    o.again();
  };
  const key = (e: { key: string; currentTarget: HTMLElement; preventDefault: () => void }) => {
    if (e.key === "Enter" && idle(e.currentTarget)) pick(e.currentTarget);
    else if ((e.key === "Delete" || e.key === "Backspace") && b.remove) {
      v.sel = m.id;
      o.again("rm");
    } else return;
    e.preventDefault();
  };
  const own = { ref: stop, role: "button", tabIndex: 0, "aria-roledescription": "mark", "aria-label": name, "data-key": m.id, style: over(at) };
  s.top.push(h("span", `mk${s.sel ? " sel" : ""}`, { ...own, onClick: (e: { currentTarget: HTMLElement }) => pick(e.currentTarget), onKeyDown: key }));
  o.wires.push((c) => {
    const [el, g] = [stop.current, s.gr.current];
    if (!el || !g) return;
    mirror(el, g);
    const move = b.move;
    if (move) beside(el, () => gestured(el, c, { block: b, gesture: move, rules, grab: { body: m.id }, item: m.id, reach: o.reach, show: follow }));
  });
  const to = m.to;
  const stretch = b.stretch;
  if (!s.sel || !to || !stretch) return;
  for (const end of ["start", "end"] as const) {
    const grip = ref();
    const p = end === "start" ? at.at : (at.to ?? to);
    s.top.push(h("span", "mkg", { ref: grip, role: "button", tabIndex: 0, "aria-label": `${end === "start" ? "Start" : "End"} of ${name}`, "data-key": `${m.id}:${end}`, style: { left: pc(p[0]), top: pc(p[1]) } }));
    const grab: MarkGrab = end === "start" ? { start: m.id } : { end: m.id };
    o.wires.push((c) => {
      const [el, g] = [grip.current, s.gr.current];
      if (!el || !g) return;
      mirror(el, g);
      beside(el, () => gestured(el, c, { block: b, gesture: stretch, rules, grab, item: m.id, reach: o.reach, show: follow }));
    });
  }
}

type Bar = { tool?: MarkKind; groups: string[]; into?: string; sel?: Mark; pen: (t: MarkKind) => Pen; zoom: { w: Ref; z: Ref } | null };

function bar(o: View, t: Bar): ReactNode {
  const { b, k, v } = o;
  const draw = b.draw;
  const tools = (b.tools ?? []).map((kind) => {
    const r = ref();
    const pick = (e: { currentTarget: HTMLElement }) => {
      if (!idle(e.currentTarget)) return;
      [v.tool, v.typing] = [t.tool === kind ? "" : kind, undefined];
      o.again();
    };
    if (draw) {
      const show = (d: MarkChange | null) => o.show(d && { k, item: "draw", kind, c: d });
      const grab = { draw: { ...t.pen(kind), at: [0.5, 0.5] satisfies Spot } };
      o.wires.push((c) => {
        const el = r.current;
        if (el) beside(el, () => gestured(el, c, { block: b, gesture: draw, rules, grab, item: "draw", reach: o.reach, show }));
      });
    }
    const own = { ref: r, type: "button", "aria-label": `${said(kind)} tool`, "aria-current": t.tool === kind ? "true" : undefined, "data-key": `tool:${kind}`, onClick: pick };
    return h("button", t.tool === kind ? "on" : "", own, h("span", "", null, kind));
  });
  const into = (e: { currentTarget: HTMLSelectElement }) => {
    v.into = e.currentTarget.value;
    o.again();
  };
  const options = t.groups.map((g) => h("option", "", { value: g }, g));
  const groups = t.groups.length ? h("label", "mkgp", null, h("span", "m", null, "into"), h("select", "", { "aria-label": "Into group", value: t.into, onChange: into }, ...options)) : null;
  const right = h("div", "mkr", null, b.remove ? remove(o, t.sel) : null, ...(t.zoom ? zoom(o, t.zoom) : []));
  return h("div", "mkbar", null, h("div", "mktl", { role: "toolbar", "aria-label": "Marks" }, ...tools), groups, right);
}

function remove(o: View, sel?: Mark): ReactNode {
  const { b } = o;
  const id = sel && rules.word(b, { remove: sel.id }) ? sel.id : null;
  const r = ref();
  const gone = b.remove;
  if (id !== null && gone)
    o.wires.push((c) => {
      const el = r.current;
      if (!el) return;
      let run = (_: Nudge) => {};
      beside(el, () => (run = gestured(el, c, { block: b, gesture: gone, rules, grab: { remove: id }, item: id, reach: o.reach, show: () => {} })));
      el.addEventListener("click", () => run({ dir: "right" }));
    });
  return h("button", "bad", { ref: r, type: "button", "data-key": "rm", disabled: id === null || undefined }, h("span", "", null, "delete"));
}

function surface(o: View, s: { tool: MarkKind; pen: Pen }): ReactNode {
  const { b, k, v } = o;
  const draw = b.draw;
  const r = ref();
  if (draw)
    o.wires.push((c) => {
      const el = r.current;
      if (!el) return;
      const show = (d: MarkChange | null) => o.show(d && { k, item: "draw", kind: s.tool, c: d });
      const run = gestured(el, c, { block: b, gesture: draw, rules, grab: { draw: s.pen }, item: "draw", reach: o.reach, show });
      el.addEventListener("click", (e) => {
        if (!idle(el)) return;
        const { to } = o.reach(0, 0, e.clientX, e.clientY);
        if (s.tool === "text") {
          v.typing = to;
          o.again();
        } else if (s.tool === "pin") {
          s.pen.at = to;
          run({ dir: "right" });
        }
      });
    });
  return h("div", "mks", { ref: r });
}

function typing(o: View, t: { at: unknown[]; pen: Pen }): ReactNode {
  const { b, v } = o;
  const draw = b.draw;
  const at: Spot = [Number(t.at[0]) || 0, Number(t.at[1]) || 0];
  const pen = { ...t.pen, at, text: str(v.words) ?? "" };
  const [i, add] = [ref<HTMLInputElement>(), ref()];
  if (draw)
    o.wires.push((c) => {
      const [input, el] = [i.current, add.current];
      if (!input || !el) return;
      input.addEventListener("input", () => (pen.text = v.words = input.value));
      const run = gestured(el, c, { block: b, gesture: draw, rules, grab: { draw: pen }, item: "draw", reach: () => ({ from: [-1, -1], to: [-1, -1] }), show: () => {} });
      const done = () => {
        run({ dir: "right" });
        [v.typing, v.words] = [undefined, undefined];
      };
      el.addEventListener("click", done);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") done();
        if (e.key !== "Escape") return;
        v.typing = undefined;
        o.again();
      });
      queueMicrotask(() => input.isConnected && input.focus());
    });
  const style = { left: pc(at[0]), top: pc(at[1]) };
  return h("span", "mkin", { style }, h("input", "", { ref: i, defaultValue: pen.text, "aria-label": "Text of the new mark" }), h("button", "", { ref: add, type: "button", "data-key": "add" }, h("span", "", null, "add")));
}

function zoom(o: View, at: { w: Ref; z: Ref }): ReactNode[] {
  const { v } = o;
  const pct = ref();
  const ways: [string, string, (now: number) => number][] = [
    ["−", "Zoom out", (n) => n / 1.25],
    ["", "Fit", () => 1],
    ["+", "Zoom in", (n) => n * 1.25],
  ];
  const refs = ways.map(() => ref());
  o.wires.push(() => {
    const [w, z, p] = [at.w.current, at.z.current, pct.current];
    if (!w || !z || !p) return;
    const apply = (n: number) => {
      z.style.width = `${n * 100}%`;
      p.textContent = `${Math.round(n * 100)}%`;
    };
    zoomed(w, v, { min: 1, max: 3, apply });
    const now = () => (typeof v.zoom === "number" ? v.zoom : 1);
    ways.forEach(([, , go], n) => refs[n]?.current?.addEventListener("click", () => apply((v.zoom = Math.min(3, Math.max(1, go(now())))))));
  });
  return ways.map(([t, name], n) => h("button", "", { ref: refs[n], type: "button", "aria-label": name }, t ? h("span", "", null, t) : h("span", "mkzm", { ref: pct })));
}
