import { type BarGrab, day, firstFree, iso, parts, timeline as rules, words } from "../../core/kind/timeline.ts";
import type { DaySpan, Gesture, TimeBar, Timeline, TimeRow } from "../../gen/types.ts";
import { gestured, held } from "../../gesture.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STEPS = [48, 32, 24, 16, 8, 4];
const WD = "SMTWTFS";

type Axis = { f: number; t: number; n: number; z: 1 | 2 | 3; px: number | null; live: boolean; lane: () => number };

/// The sub-lane of each bar of a row, by first fit in start order, and how many there are.
export function lanes(bars: TimeBar[]): { of: Map<string, number>; n: number } {
  const ends: number[] = [];
  const of = new Map<string, number>();
  for (const x of [...bars].sort((p, q) => (day(p.start) ?? 0) - (day(q.start) ?? 0))) {
    const s = day(x.start) ?? 0;
    let i = ends.findIndex((e) => e < s);
    if (i < 0) i = ends.push(0) - 1;
    ends[i] = day(x.end) ?? s;
    of.set(x.id, i);
  }
  return { of, n: Math.max(1, ends.length) };
}

const vars = (e: HTMLElement, v: Record<string, number>) => {
  e.style.cssText += Object.entries(v)
    .map(([k, n]) => `--${k}:${n};`)
    .join("");
  return e;
};
const clip = (a: number, b: number, x: Axis) => ({ o: Math.max(a, x.f) - x.f, d: Math.min(b, x.t) - Math.max(a, x.f) + 1 });
const isSpan = (v: unknown): v is DaySpan => typeof v === "object" && v !== null && "start" in v && "end" in v;
const named = (x: TimeBar) => `${x.label ?? "Bar"}, ${words(x.start, x.end)}${x.progress != null ? `, ${x.progress} % done` : ""}${x.fixed ? ", fixed" : ""}`;

function axis(x: Axis, off: Set<number>): HTMLElement {
  const mo = el("div", "tmm");
  const dy = el("div", "tmd");
  for (let d = x.f; d <= x.t; ) {
    const { month, year } = parts(d);
    let k = 0;
    while (d + k <= x.t && parts(d + k).month === month) k++;
    const name = x.z === 3 && x.px !== null && k * x.px < 90 ? (MONTH[month] ?? "").slice(0, 3) : (MONTH[month] ?? "");
    mo.append(vars(h("span", "", h("b", "", `${name} ${year}`)), { k }));
    d += k;
  }
  for (let d = x.f; d <= x.t; d++) {
    const c = el("span", off.has(d) ? "off" : "");
    const { date, weekday } = parts(d);
    if (x.z === 1) c.append(h("b", "", String(date)), h("i", "", WD[weekday] ?? ""));
    else if (x.z === 2 && (weekday === 1 || d === x.f)) c.append(h("b", "", String(date)));
    dy.append(c);
  }
  return h("div", "tmhd", el("div", "tmc"), h("div", "tmx", mo, dy));
}

function shown(ghost: HTMLElement, tag: HTMLElement, home: { o: number; d: number }, to: { o: number; d: number } | null, px: number, text: string) {
  ghost.classList.toggle("on", to !== null);
  ghost.style.transform = to ? `translateX(${(to.o - home.o) * px}px) scaleX(${to.d / home.d})` : "";
  tag.textContent = text;
  tag.classList.toggle("on", text !== "");
  tag.style.transform = to ? `translateX(${(to.o - home.o) * px}px)` : "";
}

function bar(b: Timeline, x: TimeBar, y: number, gap: number, ax: Axis, c: Ctx, lane: HTMLElement) {
  const [s, e] = [day(x.start) ?? 0, day(x.end) ?? 0];
  const home = clip(s, e, ax);
  const cls = ["tmb", x.tone, x.fixed ? "fix" : "", s < ax.f ? "cs" : "", e > ax.t ? "ce" : "", home.d <= 1 && gap >= 2 && x.label ? "out" : ""];
  const w = vars(el("div", cls.filter(Boolean).join(" ")), { ...home, y, gap });
  const ghost = vars(el("div", "tmgh"), { ...home, y });
  const tag = vars(el("span", "tmtag"), { o: home.o, y });
  const body = el("div", "tmbb");
  body.setAttribute("aria-label", named(x));
  if (x.progress != null) w.append(vars(el("i", "tmp"), { p: x.progress / 100 }));
  w.append(h("span", "tmbx", x.label ?? ""), body);
  lane.append(ghost, w, tag);
  const movable = ax.live && (b.move != null || b.stretch != null) && !x.fixed;
  body.setAttribute("role", movable ? "button" : "listitem");
  if (movable) body.setAttribute("aria-roledescription", "bar");
  if (x.tap) {
    body.tabIndex = -1;
    body.addEventListener("click", () => c.tap(x.tap));
    body.addEventListener("keydown", (k) => k.key === "Enter" && !k.defaultPrevented && body.dataset.phase !== "previewing" && c.tap(x.tap));
  }
  if (!movable) return;
  const grip = (part: "start" | "end") => {
    const g = el("span", part === "start" ? "tmgs" : "tmge");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${part === "start" ? "Start" : "End"} of ${x.label ?? "bar"}`);
    w.append(g);
    return g;
  };
  const all: [HTMLElement | null, "body" | "start" | "end", Gesture | null | undefined][] = [
    [body, "body", b.move],
    [ax.z === 1 && s >= ax.f ? grip("start") : null, "start", b.stretch],
    [ax.z === 1 && e <= ax.t ? grip("end") : null, "end", b.stretch],
  ];
  for (const [g, part, gesture] of all) {
    if (!g || !gesture) continue;
    const grab: BarGrab = { bar: x.id, part };
    const item = `${x.id}${part === "body" ? "" : part === "start" ? "<" : ">"}`;
    const show = (span: DaySpan | null) => {
      const [a, z] = span ? [day(span.start) ?? s, day(span.end) ?? e] : [s, e];
      const px = ax.lane() / ax.n;
      const text = span ? words(span.start, span.end) : g.dataset.phase === "dragging" ? "no drop here" : "";
      if (part !== "body") return shown(ghost, tag, home, span ? clip(a, z, ax) : null, px, text);
      w.style.transform = span ? `translate(${(a - s) * px}px, -3px)` : "";
      shown(ghost, tag, home, null, px, text);
      ghost.classList.toggle("on", span !== null);
      tag.style.transform = span ? `translateX(${(a - s) * px}px)` : "";
    };
    g.tabIndex = -1;
    gestured(g, c, { block: b, gesture, rules, grab, item, reach: (dx) => ({ days: Math.round(dx / (ax.lane() / ax.n)) }), show });
    const out = held(c, { block: b, rules, grab, item });
    if (isSpan(out)) show(out);
    if (ax.z > 1) g.addEventListener("pointerdown", (p) => p.stopImmediatePropagation(), { capture: true });
  }
}

function track(b: Timeline, r: TimeRow, ax: Axis, off: Set<number>, c: Ctx): HTMLElement {
  const label = h("div", "tml", h("b", "", r.title), ...(r.subtitle ? [h("span", "", r.subtitle)] : []));
  const lane = el("div", "tmn");
  const L = lanes(r.bars);
  vars(lane, { rows: L.n });
  lane.setAttribute("role", "list");
  lane.setAttribute("aria-label", r.title);
  for (let d = ax.f; d <= ax.t; d++) {
    if (off.has(d)) lane.append(vars(el("div", "tmo"), { o: d - ax.f }));
    else if (ax.z > 1 && parts(d).weekday === 1) lane.append(vars(el("div", "tmk"), { o: d - ax.f }));
  }
  const row = h("div", "tmr", label, lane);
  if (b.draw && ax.live) draw(b, r, ax, c, lane, b.draw);
  for (const x of r.bars) {
    const [s, e] = [day(x.start), day(x.end)];
    if (s === null || e === null || e < ax.f || s > ax.t) continue;
    const y = L.of.get(x.id) ?? 0;
    const next = r.bars.filter((q) => L.of.get(q.id) === y && (day(q.start) ?? 0) > e).map((q) => day(q.start) ?? 0);
    bar(b, x, y, Math.min(...next, ax.t + 1) - Math.min(e, ax.t) - 1, ax, c, lane);
  }
  return row;
}

function draw(b: Timeline, r: TimeRow, ax: Axis, c: Ctx, lane: HTMLElement, gesture: Gesture) {
  const hit = el("div", "tmbb");
  hit.setAttribute("aria-label", `${r.title}, Add a bar`);
  hit.setAttribute("role", "button");
  const home = { o: 0, d: 1 };
  const ghost = vars(el("div", "tmgh st"), { ...home, y: 0 });
  const tag = vars(el("span", "tmtag"), { o: 0, y: 0 });
  lane.append(hit, ghost, tag);
  let from: string | null = null;
  hit.addEventListener("pointerdown", (p) => {
    const free = firstFree(b, r);
    const at = Math.floor((p.clientX - lane.getBoundingClientRect().left) / (ax.lane() / ax.n));
    from = free === null ? null : iso(ax.f + at);
  });
  hit.tabIndex = -1;
  const grab: BarGrab = { row: r.id };
  const show = (span: DaySpan | null) => {
    const to = span ? clip(day(span.start) ?? ax.f, day(span.end) ?? ax.f, ax) : null;
    shown(ghost, tag, home, to, ax.lane() / ax.n, span ? words(span.start, span.end) : "");
  };
  gestured(hit, c, { block: b, gesture, rules, grab, item: `row:${r.id}`, reach: (dx) => ({ days: Math.round(dx / (ax.lane() / ax.n)), from }), show });
  const out = held(c, { block: b, rules, grab, item: `row:${r.id}` });
  if (isSpan(out)) show(out);
  if (ax.z > 1) hit.addEventListener("pointerdown", (p) => p.stopImmediatePropagation(), { capture: true });
}

function rove(root: HTMLElement) {
  const stops = () => Array.from(root.querySelectorAll<HTMLElement>("[data-grab]"));
  root.addEventListener("focusin", (e) => {
    if (!(e.target instanceof HTMLElement) || !e.target.dataset.grab) return;
    const at = e.target;
    for (const s of stops()) s.tabIndex = s === at || (at.classList.contains("tmbb") && s.parentElement === at.parentElement) ? 0 : -1;
  });
  root.addEventListener("keydown", (e) => {
    const all = stops();
    const i = e.target instanceof HTMLElement ? all.indexOf(e.target) : -1;
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (e.defaultPrevented || i < 0 || by === undefined) return;
    all[Math.min(all.length - 1, Math.max(0, i + by))]?.focus();
    e.preventDefault();
  });
}

/// A timeline: a title column and a day axis with the rows' bars; `move`, `stretch` and `draw` run on the gesture driver.
export function timeline(b: Timeline, c: Ctx): HTMLElement {
  const root = el("div", "tm");
  const key = `zoom:${b.id ?? ""}`;
  const paint = () => {
    const [f, t] = [day(b.from), day(b.to)];
    const saved = Number(c.store.get(key));
    const px = STEPS.includes(saved) ? saved : null;
    const live = b.move != null || b.stretch != null || b.draw != null;
    const head = h("div", "tmh", h("span", "tmt", b.title ?? ""));
    const z = px === null || px >= 24 ? 1 : px >= 12 ? 2 : 3;
    if (live && z > 1) head.append(h("span", "tmq", "zoom in to drag"));
    root.className = `tm z${z}`;
    root.replaceChildren(head);
    if (f === null || t === null || t < f || b.tracks.length === 0) return void root.append(h("div", "tme", b.empty ?? "Nothing scheduled"));
    const wrap = vars(el("div", "tmw"), { n: t - f + 1 });
    if (px !== null) wrap.style.cssText += `--day:${px}px;`;
    const grid = el("div", "tmg");
    wrap.append(grid);
    root.append(wrap);
    const ax: Axis = { f, t, n: t - f + 1, z, px, live, lane: () => grid.querySelector<HTMLElement>(".tmn")?.offsetWidth ?? 1 };
    const off = new Set((b.off ?? []).flatMap((d) => day(d) ?? []));
    grid.append(axis(ax, off));
    for (const r of b.tracks) grid.append(track(b, r, ax, off, c));
    const fit = () => Math.min(48, Math.max(24, (wrap.clientWidth - (grid.querySelector<HTMLElement>(".tml")?.offsetWidth ?? 200)) / ax.n));
    const zoom = (name: string, label: string, to: () => number | null, end: boolean) => {
      const z = Object.assign(el("button"), { type: "button", textContent: label, disabled: end });
      z.setAttribute("aria-label", name);
      z.addEventListener("click", () => {
        const next = to();
        c.store.put(key, next === null ? null : String(next));
        paint();
        root.querySelector<HTMLElement>(`.tmz>[aria-label="${name}"]`)?.focus();
      });
      return z;
    };
    const now = () => px ?? fit();
    const zooms = h(
      "div",
      "tmz",
      zoom("zoom out", "−", () => STEPS.find((s) => s < now()) ?? 4, px === 4),
      zoom("fit to width", "fit", () => null, px === null),
      zoom("zoom in", "+", () => [...STEPS].reverse().find((s) => s > now()) ?? 48, px === 48),
    );
    head.append(zooms);
    const first = root.querySelector<HTMLElement>("[data-grab]");
    if (first) first.tabIndex = 0;
  };
  rove(root);
  paint();
  return root;
}
