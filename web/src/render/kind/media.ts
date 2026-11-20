import { type MarkChange, type MarkGrab, type MarkReach, media as rules, named, said, type Spot } from "../../core/kind/media.ts";
import type { Gesture, Mark, MarkKind, Media } from "../../gen/types.ts";
import { gestured, held, zoomed } from "../../gesture.ts";
import type { Ctx } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";

const NS = "http://www.w3.org/2000/svg";
const TONES = ["ok", "warn", "bad", "info", "accent", "ink"];
const HINT = "pick a tool, then drag on the photo";
type Drawn = Mark & { at: number[] };

const set = (e: Element, a: Record<string, string | number | null | undefined>) => Object.entries(a).forEach(([k, v]) => v != null && e.setAttribute(k, String(v)));
const svg = <K extends keyof SVGElementTagNameMap>(t: K, a: Record<string, string | number>) => {
  const e = document.createElementNS(NS, t);
  set(e, a);
  return e;
};
const pc = (v: number | undefined) => `${(v ?? 0) * 100}%`;
const tone = (m: Mark) => (typeof m.tone === "string" && TONES.includes(m.tone) ? ` mk-${m.tone}` : "");
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

function shape(g: SVGGElement, m: Drawn, w: number, ht: number) {
  const [x1, y1] = [(m.at[0] ?? 0) * w, (m.at[1] ?? 0) * ht];
  const [x2, y2] = [(m.to?.[0] ?? m.at[0] ?? 0) * w, (m.to?.[1] ?? m.at[1] ?? 0) * ht];
  const both = <K extends keyof SVGElementTagNameMap>(t: K, a: Record<string, string | number>) => g.append(svg(t, { ...a, class: "mkh" }), svg(t, { ...a, class: "mki" }));
  const r = { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  g.replaceChildren();
  if (m.path) both("polyline", { points: m.path.map((p) => `${(p[0] ?? 0) * w},${(p[1] ?? 0) * ht}`).join(" ") });
  else if (m.kind === "line" || m.kind === "arrow") both("line", { x1, y1, x2, y2 });
  else if (m.kind === "box") both("rect", r);
  else if (m.kind === "highlight") g.append(svg("rect", { ...r, class: "mkl" }));
  else if (m.kind === "ellipse") both("ellipse", { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, rx: r.width / 2, ry: r.height / 2 });
  if (m.kind !== "arrow" || m.path) return;
  const [a, len] = [Math.atan2(y2 - y1, x2 - x1), Math.max(w, ht) * 0.025];
  const [bx, by, s, co] = [x2 - len * Math.cos(a), y2 - len * Math.sin(a), (len / 2) * Math.sin(a), (len / 2) * Math.cos(a)];
  both("polygon", { points: `${x2},${y2} ${bx + s},${by - co} ${bx - s},${by + co}` });
}

function label(m: Drawn): HTMLElement | null {
  if (m.kind !== "pin" && m.kind !== "text") return null;
  const l = el("span", `mkla${tone(m)}`);
  l.setAttribute("aria-hidden", "true");
  Object.assign(l.style, { left: pc(m.at[0]), top: pc(m.at[1]) });
  if (m.kind === "pin") l.append(el("i", "mkpd"), ...(m.text ? [h("span", "mkn", m.text)] : []));
  else l.append(h("span", "mkt", m.text ?? ""));
  return l;
}

function painted(art: SVGSVGElement, top: HTMLElement, b: Media, m: Drawn, cls = "") {
  const g = svg("g", { class: `mkd${tone(m)}${m.fixed ? " fixed" : ""}${cls}` });
  art.append(g);
  let l: HTMLElement | null = null;
  const move = (d: Drawn) => {
    shape(g, d, b.width, b.height);
    const next = label(d);
    if (l && next) l.replaceWith(next);
    else if (next) top.append(next);
    l = next;
  };
  move(m);
  return { g, move, drop: () => (g.remove(), l?.remove()) };
}

/// A picture with its marks drawn read-only: one image whose name lists them, its caption under it.
export function figure(m: Media): HTMLElement {
  const f = el("figure", "media");
  const marks = m.marks ?? [];
  const v = el(m.video ? "video" : "img");
  const alt = marks.length ? `${m.alt}. ${marks.length} marks: ${marks.map((x) => named(m, x.id)).join("; ")}` : m.alt;
  if (m.video) set(v, { src: m.src, "aria-label": m.alt, controls: "", preload: "metadata", width: m.width, height: m.height, poster: m.poster });
  else set(v, { src: m.src, alt, loading: "lazy", width: m.width, height: m.height });
  if (!marks.length || m.video) f.append(v);
  else {
    const { w, art, top } = frame(m, v);
    for (const x of marks) painted(art, top, m, x);
    f.append(w);
  }
  if (m.caption) f.append(h("figcaption", "", m.caption));
  return f;
}

function frame(m: Media, img: HTMLElement) {
  const w = el("div", "mkw");
  const z = el("div", "mkz");
  const art = svg("svg", { class: "mkv", viewBox: `0 0 ${m.width} ${m.height}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  const top = el("div", "mko");
  w.style.width = `min(100%, ${m.width}px)`;
  z.style.aspectRatio = `${m.width} / ${m.height}`;
  z.append(img, art, top);
  w.append(z);
  return { w, z, art, top };
}

const places = (m: Mark): Spot[] => [m.at, ...(m.to ? [m.to] : []), ...(m.path ?? [])].map((p) => [p[0] ?? 0, p[1] ?? 0]);

function over(stop: HTMLElement, m: Mark) {
  const ps = places(m);
  const [xs, ys] = [ps.map((p) => p[0]), ps.map((p) => p[1])];
  const [l, t, r, d] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  Object.assign(stop.style, { left: pc((l + r) / 2), top: pc((t + d) / 2), width: `calc(${pc(r - l)} + 12px)`, height: `calc(${pc(d - t)} + 12px)` });
}

const merged = (m: Mark, c: MarkChange | null): Drawn => (c?.at ? { ...m, at: c.at, ...(c.to ? { to: c.to } : {}) } : m);
const isChange = (v: unknown): v is MarkChange => typeof v === "object" && v !== null && !Array.isArray(v);

/// A picture whose marks take gestures: the tools over it, a focus stop per mark, grips on the picked one.
export function media(b: Media, c: Ctx): HTMLElement {
  if (b.video || b.id == null || !(b.draw ?? b.move ?? b.stretch ?? b.remove)) return figure(b);
  const f = el("figure", "media mkm");
  const v = c.view?.get(b.id) ?? {};
  c.view?.set(b.id, v);
  const draw = () => {
    const at = document.activeElement instanceof HTMLElement && f.contains(document.activeElement) ? document.activeElement.dataset["key"] : undefined;
    f.replaceChildren(...marked(b, c, v, { redraw: draw, press: (k) => f.querySelector<HTMLElement>(`[data-key="${k}"]`)?.click() }));
    if (at) f.querySelector<HTMLElement>(`[data-key="${CSS.escape(at)}"]`)?.focus();
  };
  draw();
  return f;
}

type Again = { redraw: () => void; press: (key: string) => void };
type Painter = (m: Mark, d: MarkChange | null) => void;
type Reach = (dx: number, dy: number, x: number, y: number) => MarkReach;
const mirror = (from: HTMLElement, g: SVGGElement) => new MutationObserver(() => set(g, { "data-phase": from.dataset["phase"] })).observe(from, { attributeFilter: ["data-phase"] });

function marked(b: Media, c: Ctx, v: Record<string, unknown>, again: Again): HTMLElement[] {
  const { redraw } = again;
  const marks = b.marks ?? [];
  const img = el("img");
  set(img, { src: b.src, alt: b.alt, width: b.width, height: b.height });
  const { w, z, art, top } = frame(b, img);
  const tool = (b.tools ?? []).find((t) => t === str(v["tool"])) ?? (b.tools?.length === 1 ? b.tools[0] : undefined);
  const groups = [...new Set(marks.filter((m) => !m.fixed && m.group != null).map((m) => m.group ?? ""))];
  const into = groups.find((g) => g === str(v["into"])) ?? groups[groups.length - 1];
  const sel = marks.find((m) => m.id === str(v["sel"]) && !m.fixed);
  const reach: Reach = (dx, dy, x, y) => {
    const r = z.getBoundingClientRect();
    const at = (px: number, py: number): Spot => [(px - r.left) / (r.width || 1), (py - r.top) / (r.height || 1)];
    return { from: at(x, y), to: at(x + dx, y + dy) };
  };
  const painter = (cls: string, where: (m: Mark, d: MarkChange) => Mark): Painter => {
    let p: ReturnType<typeof painted> | null = null;
    return (m, d) => {
      p?.drop();
      p = d?.at ? painted(art, top, b, where(m, d), cls) : null;
    };
  };
  const faint = () => painter(" ghost", (m) => m);
  const draft = painter(" new", merged);
  const pen = (t: MarkKind) => ({ tool: t, ...(into != null ? { group: into } : {}) });
  const out = held(c, { block: b, rules, grab: { draw: pen(tool ?? b.tools?.[0] ?? "pin") }, item: "draw" });
  for (const m of marks) {
    const g: MarkGrab | undefined = [{ body: m.id }, { end: m.id }, { remove: m.id }].find((x) => rules.word(b, x));
    const h0 = g ? held(c, { block: b, rules, grab: g, item: m.id }) : undefined;
    const p = painted(art, top, b, merged(m, isChange(h0) ? h0 : null), isChange(h0) ? " sent" : "");
    if (!m.fixed) stops(b, c, { m, p, sel: m.id === sel?.id, top, reach, faint: faint(), again, v });
  }
  if (isChange(out) && out.kind) painted(art, top, b, { id: "", kind: out.kind, at: out.at ?? [], to: out.to ?? null, text: out.text ?? null }, " sent");
  const parts: HTMLElement[] = [];
  const tools = b.draw && b.tools?.length ? bar(b, c, { tool, groups, into, sel, v, redraw, reach, draft, pen }) : null;
  if (tools) parts.push(tools);
  if (b.draw && tool) surface(b, c, { z, tool, pen: pen(tool), reach, show: draft, v, redraw });
  if (b.draw && tool === "text" && Array.isArray(v["typing"])) typing(b, c, { top, at: v["typing"], pen: pen("text"), v, redraw });
  if (tool === "pin" && b.tools?.length === 1) tools?.querySelector(".mkr")?.append(...zoom(w, z, v));
  parts.push(w);
  if (!marks.length && b.draw) parts.push(h("p", "mkhint", HINT));
  if (b.caption) parts.push(h("figcaption", "", b.caption));
  return parts;
}

type Stop = {
  m: Mark;
  p: ReturnType<typeof painted>;
  sel: boolean;
  top: HTMLElement;
  reach: Reach;
  faint: Painter;
  again: Again;
  v: Record<string, unknown>;
};

function stops(b: Media, c: Ctx, o: Stop) {
  const name = named(b, o.m.id) ?? o.m.id;
  const stop = el("span", `mk${o.sel ? " sel" : ""}`);
  set(stop, { role: "button", tabindex: 0, "aria-roledescription": "mark", "aria-label": name });
  stop.dataset["key"] = o.m.id;
  over(stop, o.m);
  o.top.append(stop);
  const follow = (d: MarkChange | null) => {
    o.p.move(merged(o.m, d));
    o.faint(o.m, d);
    over(stop, merged(o.m, d));
  };
  mirror(stop, o.p.g);
  if (b.move) gestured(stop, c, { block: b, gesture: b.move, rules, grab: { body: o.m.id }, item: o.m.id, reach: o.reach, show: follow });
  const pick = () => {
    if (stop.dataset["phase"] && stop.dataset["phase"] !== "idle") return;
    o.v["sel"] = o.sel ? undefined : o.m.id;
    o.again.redraw();
  };
  stop.addEventListener("click", pick);
  stop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (stop.dataset["phase"] ?? "idle") === "idle") pick();
    else if ((e.key === "Delete" || e.key === "Backspace") && b.remove) {
      o.v["sel"] = o.m.id;
      o.again.redraw();
      o.again.press("rm");
    } else return;
    e.preventDefault();
  });
  if (!o.sel || !o.m.to || !b.stretch) return;
  for (const end of ["start", "end"] as const) {
    const grip = el("span", "mkg");
    const at = end === "start" ? o.m.at : o.m.to;
    set(grip, { role: "button", tabindex: 0, "aria-label": `${end === "start" ? "Start" : "End"} of ${name}` });
    Object.assign(grip.style, { left: pc(at[0]), top: pc(at[1]) });
    grip.dataset["key"] = `${o.m.id}:${end}`;
    o.top.append(grip);
    mirror(grip, o.p.g);
    const pull = (d: MarkChange | null) => {
      follow(d);
      const p = d?.[end === "start" ? "at" : "to"] ?? at;
      Object.assign(grip.style, { left: pc(p[0]), top: pc(p[1]) });
    };
    const grab: MarkGrab = end === "start" ? { start: o.m.id } : { end: o.m.id };
    gestured(grip, c, { block: b, gesture: b.stretch, rules, grab, item: o.m.id, reach: o.reach, show: pull });
  }
}

type Bar = {
  tool?: MarkKind | undefined;
  groups: string[];
  into?: string | undefined;
  sel?: Mark | undefined;
  v: Record<string, unknown>;
  redraw: () => void;
  reach: Reach;
  draft: Painter;
  pen: (t: MarkKind) => { tool: MarkKind; group?: string };
};

function bar(b: Media, c: Ctx, o: Bar): HTMLElement {
  const box = el("div", "mkbar");
  const tl = el("div", "mktl");
  set(tl, { role: "toolbar", "aria-label": "Marks" });
  box.append(tl);
  const draw: Gesture | null | undefined = b.draw;
  for (const k of b.tools ?? []) {
    const t = btn(k, o.tool === k ? "on" : "");
    set(t, { "aria-label": `${said(k)} tool`, "aria-current": o.tool === k ? "true" : null });
    t.dataset["key"] = `tool:${k}`;
    t.addEventListener("click", () => {
      if ((t.dataset["phase"] ?? "idle") !== "idle") return;
      [o.v["tool"], o.v["typing"]] = [o.tool === k ? "" : k, undefined];
      o.redraw();
    });
    tl.append(t);
    const show = (d: MarkChange | null) => o.draft({ id: "", kind: k, at: [] }, d);
    if (draw) gestured(t, c, { block: b, gesture: draw, rules, grab: { draw: { ...o.pen(k), at: [0.5, 0.5] } }, item: "draw", reach: o.reach, show });
  }
  if (o.groups.length) {
    const s = el("select");
    s.setAttribute("aria-label", "Into group");
    s.append(...o.groups.map((g) => Object.assign(el("option"), { value: g, textContent: g, selected: g === o.into })));
    s.addEventListener("change", () => ((o.v["into"] = s.value), o.redraw()));
    box.append(h("label", "mkgp", h("span", "m", "into"), s));
  }
  const right = el("div", "mkr");
  box.append(right);
  if (!b.remove) return box;
  const d = Object.assign(el("button", "bad"), { type: "button" });
  d.append(h("span", "", "delete"));
  d.dataset["key"] = "rm";
  right.append(d);
  const id = o.sel && rules.word(b, { remove: o.sel.id }) ? o.sel.id : null;
  d.disabled = id === null;
  if (id === null) return box;
  const run = gestured(d, c, { block: b, gesture: b.remove, rules, grab: { remove: id }, item: id, reach: o.reach, show: () => {} });
  d.addEventListener("click", () => run({ dir: "right" }));
  return box;
}

type Surface = {
  z: HTMLElement;
  tool: MarkKind;
  pen: { tool: MarkKind; group?: string; at?: Spot };
  reach: Reach;
  show: Painter;
  v: Record<string, unknown>;
  redraw: () => void;
};

function surface(b: Media, c: Ctx, o: Surface) {
  if (!b.draw) return;
  const s = el("div", "mks");
  o.z.querySelector(".mko")?.before(s);
  const show = (d: MarkChange | null) => o.show({ id: "", kind: o.tool, at: [] }, d);
  const run = gestured(s, c, { block: b, gesture: b.draw, rules, grab: { draw: o.pen }, item: "draw", reach: o.reach, show });
  s.addEventListener("click", (e) => {
    if ((s.dataset["phase"] ?? "idle") !== "idle") return;
    const { to } = o.reach(0, 0, e.clientX, e.clientY);
    if (o.tool === "text") {
      o.v["typing"] = to;
      o.redraw();
    } else if (o.tool === "pin") {
      o.pen.at = to;
      run({ dir: "right" });
    }
  });
}

type Typing = { top: HTMLElement; at: unknown[]; pen: { tool: MarkKind; group?: string }; v: Record<string, unknown>; redraw: () => void };

function typing(b: Media, c: Ctx, o: Typing) {
  if (!b.draw) return;
  const at: Spot = [Number(o.at[0]) || 0, Number(o.at[1]) || 0];
  const pen = { ...o.pen, at, text: str(o.v["words"]) ?? "" };
  const box = el("span", "mkin");
  Object.assign(box.style, { left: pc(at[0]), top: pc(at[1]) });
  const i = Object.assign(el("input"), { value: pen.text });
  i.setAttribute("aria-label", "Text of the new mark");
  const add = btn("add");
  add.dataset["key"] = "add";
  box.append(i, add);
  o.top.append(box);
  i.addEventListener("input", () => (pen.text = o.v["words"] = i.value));
  const run = gestured(add, c, { block: b, gesture: b.draw, rules, grab: { draw: pen }, item: "draw", reach: () => ({ from: [-1, -1], to: [-1, -1] }), show: () => {} });
  const done = () => {
    run({ dir: "right" });
    [o.v["typing"], o.v["words"]] = [undefined, undefined];
  };
  add.addEventListener("click", done);
  i.addEventListener("keydown", (e) => {
    if (e.key === "Enter") done();
    if (e.key !== "Escape") return;
    o.v["typing"] = undefined;
    o.redraw();
  });
  queueMicrotask(() => i.isConnected && i.focus());
}

function zoom(w: HTMLElement, z: HTMLElement, v: Record<string, unknown>): HTMLElement[] {
  const pct = el("span", "mkzm");
  const apply = (k: number) => {
    z.style.width = `${k * 100}%`;
    pct.textContent = `${Math.round(k * 100)}%`;
  };
  w.classList.add("zoom");
  zoomed(w, v, { min: 1, max: 3, apply });
  const to = (k: number) => apply((v["zoom"] = Math.min(3, Math.max(1, k))));
  const now = () => (typeof v["zoom"] === "number" ? v["zoom"] : 1);
  const ways: [string, string, () => void][] = [
    ["−", "Zoom out", () => to(now() / 1.25)],
    ["", "Fit", () => to(1)],
    ["+", "Zoom in", () => to(now() * 1.25)],
  ];
  return ways.map(([t, name, go]) => {
    const x = btn(t);
    set(x, { "aria-label": name });
    if (!t) x.replaceChildren(pct);
    x.addEventListener("click", go);
    return x;
  });
}
