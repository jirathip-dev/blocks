import { type ReactNode, type RefObject, useContext, useLayoutEffect, useRef, useState } from "react";
import type { DaySpan, Gesture, Tap, TimeBar, Timeline, TimeRow } from "../../../src/core/index.ts";
import { type BarGrab, barName, day, firstFree, iso, lanes, parts, timeline as rules, words } from "../../../src/core/kind/timeline.ts";
import { type Driven, gestured, type Held, held } from "../../../src/gesture.ts";
import { Cx } from "../act.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STEPS = [48, 32, 24, 16, 8, 4];
const WD = "SMTWTFS";

type Axis = { f: number; t: number; n: number; z: 1 | 2 | 3; px: number | null; live: boolean; lane: () => number };
type Ref = RefObject<HTMLElement | null>;
type Wired = Driven & { tap: (t: Tap) => void };
type Wire = (c: Wired) => void;

const ref = (): Ref => ({ current: null });
const vars = (v: Record<string, number | string>) => ({ style: Object.fromEntries(Object.entries(v).map(([k, n]) => [`--${k}`, n])) });
const clip = (a: number, b: number, x: Axis) => ({ o: Math.max(a, x.f) - x.f, d: Math.min(b, x.t) - Math.max(a, x.f) + 1 });
const isSpan = (v: unknown): v is DaySpan => typeof v === "object" && v !== null && "start" in v && "end" in v;

function axis(x: Axis, off: Set<number>): ReactNode {
  const mo: ReactNode[] = [];
  const dy: ReactNode[] = [];
  for (let d = x.f; d <= x.t; ) {
    const { month, year } = parts(d);
    let k = 0;
    while (d + k <= x.t && parts(d + k).month === month) k++;
    const name = x.z === 3 && x.px !== null && k * x.px < 90 ? (MONTH[month] ?? "").slice(0, 3) : (MONTH[month] ?? "");
    mo.push(h("span", "", vars({ k }), h("b", "", null, `${name} ${year}`)));
    d += k;
  }
  for (let d = x.f; d <= x.t; d++) {
    const { date, weekday } = parts(d);
    const kids = x.z === 1 ? [h("b", "", null, String(date)), h("i", "", null, WD[weekday] ?? "")] : x.z === 2 && (weekday === 1 || d === x.f) ? [h("b", "", null, String(date))] : [];
    dy.push(h("span", off.has(d) ? "off" : "", null, ...kids));
  }
  return h("div", "tmhd", null, h("div", "tmc", null), h("div", "tmx", null, h("div", "tmm", null, ...mo), h("div", "tmd", null, ...dy)));
}

function shown(ghost: HTMLElement, tag: HTMLElement, home: { o: number; d: number }, to: { o: number; d: number } | null, px: number, text: string) {
  ghost.classList.toggle("on", to !== null);
  ghost.style.transform = to ? `translateX(${(to.o - home.o) * px}px) scaleX(${to.d / home.d})` : "";
  tag.textContent = text;
  tag.classList.toggle("on", text !== "");
  tag.style.transform = to ? `translateX(${(to.o - home.o) * px}px)` : "";
}

function bar(b: Timeline, x: TimeBar, y: number, gap: number, ax: Axis, wires: Wire[]): ReactNode[] {
  const [s, e] = [day(x.start) ?? 0, day(x.end) ?? 0];
  const home = clip(s, e, ax);
  const cls = ["tmb", x.tone, x.fixed ? "fix" : "", s < ax.f ? "cs" : "", e > ax.t ? "ce" : "", home.d <= 1 && gap >= 2 && x.label ? "out" : ""];
  const [w, ghost, tag, body] = [ref(), ref(), ref(), ref()];
  const movable = ax.live && (b.move != null || b.stretch != null) && !x.fixed;
  const grips: ReactNode[] = [];
  const grip = (part: "start" | "end") => {
    const g = ref();
    grips.push(h("span", part === "start" ? "tmgs" : "tmge", { ref: g, role: "button", "aria-label": `${part === "start" ? "Start" : "End"} of ${x.label ?? "bar"}`, tabIndex: b.stretch ? -1 : undefined }));
    return g;
  };
  const all: [Ref | null, "body" | "start" | "end", Gesture | null | undefined][] = movable
    ? [
        [body, "body", b.move],
        [ax.z === 1 && s >= ax.f ? grip("start") : null, "start", b.stretch],
        [ax.z === 1 && e <= ax.t ? grip("end") : null, "end", b.stretch],
      ]
    : [];
  const own = { ref: body, "aria-label": barName(x), role: movable ? "button" : "listitem", "aria-roledescription": movable ? "bar" : undefined, tabIndex: x.tap || (movable && b.move) ? -1 : undefined };
  wires.push((c) => {
    const [we, gh, tg, bd] = [w.current, ghost.current, tag.current, body.current];
    if (!we || !gh || !tg || !bd) return;
    const tap = x.tap;
    if (tap) {
      bd.addEventListener("click", () => c.tap(tap));
      bd.addEventListener("keydown", (k) => k.key === "Enter" && !k.defaultPrevented && bd.dataset["phase"] !== "previewing" && c.tap(tap));
    }
    for (const [r, part, gesture] of all) {
      const g = r?.current;
      if (!g || !gesture) continue;
      const grab: BarGrab = { bar: x.id, part };
      const item = `${x.id}${part === "body" ? "" : part === "start" ? "<" : ">"}`;
      const show = (span: DaySpan | null) => {
        const [a, z] = span ? [day(span.start) ?? s, day(span.end) ?? e] : [s, e];
        const px = ax.lane() / ax.n;
        const text = span ? words(span.start, span.end) : g.dataset["phase"] === "dragging" ? "no drop here" : "";
        if (part !== "body") return shown(gh, tg, home, span ? clip(a, z, ax) : null, px, text);
        we.style.transform = span ? `translate(${(a - s) * px}px, -3px)` : "";
        shown(gh, tg, home, null, px, text);
        gh.classList.toggle("on", span !== null);
        tg.style.transform = span ? `translateX(${(a - s) * px}px)` : "";
      };
      gestured(g, c, { block: b, gesture, rules, grab, item, reach: (dx) => ({ days: Math.round(dx / (ax.lane() / ax.n)) }), show });
      const out = held(c, { block: b, rules, grab, item });
      if (isSpan(out)) show(out);
      if (ax.z > 1) g.addEventListener("pointerdown", (p) => p.stopImmediatePropagation(), { capture: true });
    }
  });
  const kids = [x.progress != null ? h("i", "tmp", vars({ p: x.progress / 100 })) : null, h("span", "tmbx", null, x.label ?? ""), h("div", "tmbb", own), ...grips];
  return [h("div", "tmgh", { ref: ghost, ...vars({ ...home, y }) }), h("div", cls.filter(Boolean).join(" "), { ref: w, ...vars({ ...home, y, gap }) }, ...kids), h("span", "tmtag", { ref: tag, ...vars({ o: home.o, y }) })];
}

function draw(b: Timeline, r: TimeRow, ax: Axis, gesture: Gesture, wires: Wire[]): ReactNode[] {
  const [hit, ghost, tag] = [ref(), ref(), ref()];
  const home = { o: 0, d: 1 };
  wires.push((c) => {
    const [ht, gh, tg, lane] = [hit.current, ghost.current, tag.current, hit.current?.parentElement];
    if (!ht || !gh || !tg || !lane) return;
    let from: string | null = null;
    ht.addEventListener("pointerdown", (p) => {
      const at = Math.floor((p.clientX - lane.getBoundingClientRect().left) / (ax.lane() / ax.n));
      from = firstFree(b, r) === null ? null : iso(ax.f + at);
    });
    const grab: BarGrab = { row: r.id };
    const show = (span: DaySpan | null) => {
      const to = span ? clip(day(span.start) ?? ax.f, day(span.end) ?? ax.f, ax) : null;
      shown(gh, tg, home, to, ax.lane() / ax.n, span ? words(span.start, span.end) : "");
    };
    const n = lane.children.length;
    gestured(ht, c, { block: b, gesture, rules, grab, item: `row:${r.id}`, reach: (dx) => ({ days: Math.round(dx / (ax.lane() / ax.n)), from }), show });
    tg.after(...Array.from(lane.children).slice(n));
    const out = held(c, { block: b, rules, grab, item: `row:${r.id}` });
    if (isSpan(out)) show(out);
    if (ax.z > 1) ht.addEventListener("pointerdown", (p) => p.stopImmediatePropagation(), { capture: true });
  });
  return [h("div", "tmbb", { ref: hit, "aria-label": `${r.title}, Add a bar`, role: "button", tabIndex: -1 }), h("div", "tmgh st as-surface", { ref: ghost, ...vars({ ...home, y: 0 }) }), h("span", "tmtag", { ref: tag, ...vars({ o: 0, y: 0 }) })];
}

function track(b: Timeline, r: TimeRow, ax: Axis, off: Set<number>, wires: Wire[]): ReactNode {
  const L = lanes(r.bars);
  const marks: ReactNode[] = [];
  for (let d = ax.f; d <= ax.t; d++) {
    if (off.has(d)) marks.push(h("div", "tmo", vars({ o: d - ax.f })));
    else if (ax.z > 1 && parts(d).weekday === 1) marks.push(h("div", "tmk", vars({ o: d - ax.f })));
  }
  const drawn = b.draw && ax.live ? draw(b, r, ax, b.draw, wires) : [];
  const bars = r.bars.flatMap((x) => {
    const [s, e] = [day(x.start), day(x.end)];
    if (s === null || e === null || e < ax.f || s > ax.t) return [];
    const y = L.of.get(x.id) ?? 0;
    const next = r.bars.filter((q) => L.of.get(q.id) === y && (day(q.start) ?? 0) > e).map((q) => day(q.start) ?? 0);
    return bar(b, x, y, Math.min(...next, ax.t + 1) - Math.min(e, ax.t) - 1, ax, wires);
  });
  const label = h("div", "tml", null, h("b", "", null, r.title), r.subtitle ? h("span", "", null, r.subtitle) : null);
  return h("div", "tmr", null, label, h("div", "tmn", { ...vars({ rows: L.n }), role: "list", "aria-label": r.title }, ...marks, ...drawn, ...bars));
}

function rove(root: HTMLElement) {
  const stops = () => Array.from(root.querySelectorAll<HTMLElement>("[data-grab]"));
  const focus = (e: FocusEvent) => {
    if (!(e.target instanceof HTMLElement) || !e.target.dataset["grab"]) return;
    const at = e.target;
    for (const s of stops()) s.tabIndex = s === at || (at.classList.contains("tmbb") && s.parentElement === at.parentElement) ? 0 : -1;
  };
  const key = (e: KeyboardEvent) => {
    const all = stops();
    const i = e.target instanceof HTMLElement ? all.indexOf(e.target) : -1;
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (e.defaultPrevented || i < 0 || by === undefined) return;
    all[Math.min(all.length - 1, Math.max(0, i + by))]?.focus();
    e.preventDefault();
  };
  root.addEventListener("focusin", focus);
  root.addEventListener("keydown", key);
  return () => {
    root.removeEventListener("focusin", focus);
    root.removeEventListener("keydown", key);
  };
}

/// A timeline as the HTML renderer draws one; `move`, `stretch` and `draw` run on the same gesture driver, wired from refs.
export function timeline({ b, hooks }: V<Timeline>) {
  const cx = useContext(Cx);
  const live = useRef(cx);
  live.current = cx;
  const keep = useRef(new Map<string, Held>());
  const done = useRef(new WeakSet<Wire[]>());
  const [root, wrap, grid] = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const [px, setPx] = useState<number | null>(null);
  const [f, t] = [day(b.from), day(b.to)];
  const on = b.move != null || b.stretch != null || b.draw != null;
  const z = px === null || px >= 24 ? 1 : px >= 12 ? 2 : 3;
  const ax: Axis | null = f === null || t === null || t < f || b.tracks.length === 0 ? null : { f, t, n: t - f + 1, z, px, live: on, lane: () => grid.current?.querySelector<HTMLElement>(".tmn")?.offsetWidth ?? 1 };
  const k = JSON.stringify([b, px]);
  const wires: Wire[] = [];
  useLayoutEffect(() => (root.current ? rove(root.current) : undefined), []);
  useLayoutEffect(() => {
    if (done.current.has(wires)) return;
    done.current.add(wires);
    const c: Wired = { act: (a) => live.current.act(a), tap: (x) => live.current.tap(x), held: keep.current };
    for (const w of wires) w(c);
    const first = root.current?.querySelector<HTMLElement>("[data-grab]");
    if (first) first.tabIndex = 0;
  }, [k]);
  const head = h("div", "tmh", null, h("span", "tmt", null, b.title ?? ""), on && z > 1 ? h("span", "tmq", null, "zoom in to drag") : null, ax ? zooms(ax, px, setPx, wrap, grid) : null);
  if (!ax) return h("div", `tm z${z}`, { ...hooks, ref: root }, head, h("div", "tme", null, b.empty ?? "Nothing scheduled"));
  const off = new Set((b.off ?? []).flatMap((d) => day(d) ?? []));
  const body = h("div", "tmg", { ref: grid }, axis(ax, off), ...b.tracks.map((r) => track(b, r, ax, off, wires)));
  return h("div", `tm z${z}`, { ...hooks, ref: root }, head, h("div", "tmw", { key: k, ref: wrap, style: { "--n": ax.n, ...(px === null ? null : { "--day": `${px}px` }) } }, body));
}

function zooms(ax: Axis, px: number | null, set: (p: number | null) => void, wrap: Ref, grid: Ref): ReactNode {
  const fit = () => Math.min(48, Math.max(24, ((wrap.current?.clientWidth ?? 0) - (grid.current?.querySelector<HTMLElement>(".tml")?.offsetWidth ?? 200)) / ax.n));
  const now = () => px ?? fit();
  const zoom = (name: string, label: string, to: () => number | null, end: boolean) => h("button", "", { type: "button", "aria-label": name, disabled: end || undefined, onClick: () => set(to()) }, label);
  return h(
    "div",
    "tmz",
    null,
    zoom("zoom out", "−", () => STEPS.find((s) => s < now()) ?? 4, px === 4),
    zoom("fit to width", "fit", () => null, px === null),
    zoom("zoom in", "+", () => [...STEPS].reverse().find((s) => s > now()) ?? 48, px === 48),
  );
}
