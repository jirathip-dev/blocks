import { type Event, type Nudge, type Phase, type Rules, same, step } from "./core/gesture.ts";
import type { Gesture } from "./gen/types.ts";
import type { Ctx } from "./render/index.ts";

/// An item whose action is out: the data it was grabbed from, its candidate, and how its view draws it back.
export type Held = { start: unknown; c: unknown; back: (ok: boolean) => void };
/// What a view hands the driver for one grabbable item.
export type Grabbed<B, G, R, C> = {
  block: B;
  gesture: Gesture;
  rules: Rules<B, G, R, C>;
  grab: G;
  item: string;
  reach: (dx: number, dy: number, x: number, y: number) => R;
  show: (c: C | null) => void;
};
type Block = { id?: string | null };

const ARROWS: Record<string, Nudge["dir"]> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
const key = (b: Block, item: string) => `${b.id ?? ""}\n${item}`;
let speaker: HTMLElement | undefined;

/// Speaks `text` through one polite live region.
export function say(text: string) {
  if (!speaker?.isConnected) {
    speaker = Object.assign(document.createElement("div"), { className: "b-sr" });
    speaker.setAttribute("aria-live", "polite");
    document.body.append(speaker);
  }
  speaker.textContent = text;
}

const beside = (el: HTMLElement, steps: [string, Nudge][], run: (n: Nudge) => void) =>
  el.parentElement?.append(
    ...steps.map(([name, n]) => {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "b-sr", tabIndex: -1, textContent: name });
      b.onclick = () => run(n);
      return b;
    }),
  );

/// The candidate of an item whose action is out, while its data is still what it was grabbed from.
export function held<B extends Block, G, R, C>(c: Ctx, o: Pick<Grabbed<B, G, R, C>, "block" | "rules" | "grab" | "item">): unknown {
  const h = c.held?.get(key(o.block, o.item));
  return h && same(h.start, o.rules.start(o.block, o.grab)) ? h.c : undefined;
}

/// Runs one item's gesture on `el` (attached, its named actions go beside it): pointer, keys and named actions feed one machine; returns its named-step runner.
export function gestured<B extends Block, G, R, C>(el: HTMLElement, c: Ctx, o: Grabbed<B, G, R, C>): (n: Nudge) => void {
  const start = o.rules.word(o.block, o.grab) ? o.rules.start(o.block, o.grab) : null;
  if (start === null) return () => {};
  const k = key(o.block, o.item);
  el.dataset.grab = JSON.stringify(o.grab);
  const out = c.held?.get(k);
  let p: Phase<C> = out ? { at: "sent", c: start } : { at: "idle" };
  let x0 = 0;
  let y0 = 0;
  const mark = () => {
    el.dataset.phase = p.at;
    el.setAttribute("aria-pressed", String(p.at === "pressed" || p.at === "dragging" || p.at === "previewing"));
  };
  const back = (ok: boolean) => {
    go({ on: "answer", ok });
    go({ on: "settled" });
  };
  if (out) out.back = back;
  const send = async (cand: C) => {
    const h: Held = { start, c: cand, back };
    c.held?.set(k, h);
    say("sending");
    const ok = await c.act({ action: o.gesture.action, block: o.block.id, values: { [o.gesture.name]: cand } }, el).catch(() => false);
    c.held?.delete(k);
    h.back(ok);
    say(ok ? o.rules.says(o.block, o.grab, cand) : "not changed");
  };
  const go = (e: Event<C>) => {
    const [next, fx] = step(p, e, start);
    if (next.at === p.at && e.on !== "move") return;
    p = next;
    mark();
    if (p.at === "previewing") o.show(p.c);
    if (p.at === "idle" || p.at === "dragging") o.show(null);
    if (p.at === "pressed") say(`${el.getAttribute("aria-label") ?? ""}, grabbed, ${o.rules.says(o.block, o.grab, start)}. Arrows move, Enter drops, Escape cancels`);
    if (p.at === "dragging") say("no drop here");
    if (p.at === "previewing") say(o.rules.says(o.block, o.grab, p.c));
    if (fx && fx !== "tap") void send(fx.send);
  };
  const phase = () => p.at;
  const live = () => p.at === "pressed" || p.at === "dragging" || p.at === "previewing";
  const nudge = (n: Nudge) => {
    const next = o.rules.nudge(o.block, o.grab, p.at === "previewing" ? p.c : start, n);
    if (next !== null) go({ on: "move", c: next });
  };
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    if (p.at !== "idle" || e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    [x0, y0] = [e.clientX, e.clientY];
    go({ on: "press" });
  });
  el.addEventListener("pointermove", (e) => {
    const [dx, dy] = [e.clientX - x0, e.clientY - y0];
    if (live() && (p.at !== "pressed" || Math.hypot(dx, dy) >= 4)) go({ on: "move", c: o.rules.candidate(o.block, o.grab, o.reach(dx, dy, x0, y0)) });
  });
  el.addEventListener("pointerup", () => live() && go({ on: "release" }));
  el.addEventListener("pointercancel", () => go({ on: "cancel" }));
  el.addEventListener("blur", () => go({ on: "cancel" }));
  el.addEventListener("keydown", (e) => {
    const dir = ARROWS[e.key];
    if (p.at === "idle" && e.key === " ") go({ on: "press" });
    else if (!live()) return;
    else if (dir) nudge({ dir, big: e.shiftKey });
    else if (e.key === "Enter" || e.key === " ") go({ on: p.at === "pressed" ? "cancel" : "release" });
    else if (e.key === "Escape") go({ on: "cancel" });
    else return;
    e.preventDefault();
  });
  const run = (n: Nudge) => {
    if (p.at !== "idle") return;
    go({ on: "press" });
    nudge(n);
    go({ on: phase() === "pressed" ? "cancel" : "release" });
  };
  beside(el, o.rules.steps(o.block, o.grab), run);
  mark();
  return run;
}

/// The one pinch, Ctrl and wheel, double-tap and key zoom; `keep` holds the zoom outside the view, `apply` draws it, `live` while fingers or the wheel still move.
export function zoomed(el: HTMLElement, keep: Record<string, unknown>, o: { min: number; max: number; apply: (z: number, live: boolean) => void }): void {
  const at = new Map<number, [number, number]>();
  const z = () => (typeof keep.zoom === "number" ? keep.zoom : o.min);
  const to = (k: number, live = false) => o.apply((keep.zoom = Math.min(o.max, Math.max(o.min, k))), live);
  const span = () => {
    const [a, b] = [...at.values()];
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0;
  };
  let d0 = 0;
  let z0 = 1;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    at.set(e.pointerId, [e.clientX, e.clientY]);
    if (at.size === 2) [d0, z0] = [span(), z()];
  });
  el.addEventListener("pointermove", (e) => {
    if (!at.has(e.pointerId)) return;
    at.set(e.pointerId, [e.clientX, e.clientY]);
    if (at.size === 2 && d0) to((z0 * span()) / d0, true);
  });
  const up = (e: PointerEvent) => {
    at.delete(e.pointerId);
    if (at.size < 2 && d0) to(z());
    if (at.size < 2) d0 = 0;
  };
  let still: ReturnType<typeof setTimeout> | undefined;
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  const wheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    to(z() * Math.exp(-e.deltaY / 100), true);
    clearTimeout(still);
    still = setTimeout(() => to(z()), 150);
  };
  el.addEventListener("wheel", wheel, { passive: false });
  el.addEventListener("dblclick", () => to(z() > o.min ? o.min : 2.5));
  el.addEventListener("keydown", (e) => {
    const k: Record<string, number> = { "+": z() * 1.25, "=": z() * 1.25, "-": z() / 1.25, "0": o.min };
    if (k[e.key] === undefined) return;
    e.preventDefault();
    to(k[e.key] ?? o.min);
  });
  to(z());
}
