import { type Event, type Phase, step } from "./core/gesture.ts";
import type { Store } from "./render/ctx.ts";

type Shown = "rail" | "open" | "drawer";
type Drawer = { root: HTMLElement; panel: HTMLElement; shown: () => Shown; open: () => void; shut: () => void; back: () => void };
const HOVER_IN = 150;
const HOVER_OUT = 300;
const FLICK = 0.5;
const CUT = 33;

function toggles(root: HTMLElement, signal: AbortSignal, open?: Set<string>) {
  for (const g of root.querySelectorAll<HTMLElement>("button.sdk[aria-controls]")) {
    const id = g.getAttribute("aria-controls") ?? "";
    const key = `sidebar:${id}`;
    const flip = () => {
      const now = g.getAttribute("aria-expanded") !== "true";
      g.setAttribute("aria-expanded", String(now));
      root.querySelector(`#${CSS.escape(id)}`)?.toggleAttribute("hidden", !now);
      if (!open) return;
      if (open.has(key)) open.delete(key);
      else open.add(key);
    };
    g.addEventListener("click", flip, { signal });
  }
}

const pullOf = (from: number, x0: number, x: number, wide: number) => Math.round(Math.min(100, Math.max(0, from + ((x - x0) / wide) * 100)));

function swipe(d: Drawer, from: number, signal: AbortSignal) {
  return (e: PointerEvent) => {
    if (e.pointerType === "mouse" || (from === 0) === (d.shown() === "drawer")) return;
    const [x0, wide] = [e.clientX, d.panel.getBoundingClientRect().width || 1];
    let [x1, t1] = [x0, performance.now()];
    let p: Phase<number> = { at: "idle" };
    const go = (ev: Event<number>) => {
      const [next, fx] = step(p, ev, from);
      p = next;
      if (p.at === "previewing") {
        d.root.style.setProperty("--pull", String(p.c / 100));
        d.root.dataset["pull"] = "";
      }
      if (fx && fx !== "tap") {
        p = step(step(p, { on: "answer", ok: true }, from)[0], { on: "settled" }, from)[0];
        if (Math.abs(fx.send - from) > CUT === (from === 0)) d.open();
        else d.shut();
      } else if (p.at === "idle" && ev.on !== "press") d.back();
    };
    const move = (m: PointerEvent) => {
      const t = performance.now();
      const fast = Math.abs(m.clientX - x1) / Math.max(1, t - t1) > FLICK;
      [x1, t1] = [m.clientX, t];
      const flung = m.clientX > x0 ? 100 : 0;
      go({ on: "move", c: fast ? flung : pullOf(from, x0, m.clientX, wide) });
    };
    const drag = new AbortController();
    const end = (on: "release" | "cancel") => () => {
      drag.abort();
      go({ on });
    };
    addEventListener("pointermove", move, { signal: drag.signal });
    addEventListener("pointerup", end("release"), { signal: drag.signal });
    addEventListener("pointercancel", end("cancel"), { signal: drag.signal });
    signal.addEventListener("abort", () => drag.abort());
    go({ on: "press" });
  };
}

/// Runs a drawn sidebar under `root`: hover and focus open the rail, pin pushes the page and is kept in `store` under `key`, the phone drawer opens by its button or an edge swipe; returns its undo.
export function behave(root: HTMLElement, key: string, store: Store, open?: Set<string>): () => void {
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const [panel, menu, pin] = [q(".sdp"), q(".sdm"), q(".sdpin")];
  if (!panel || !menu || !pin) return () => {};
  const life = new AbortController();
  const { signal } = life;
  const on = <K extends keyof HTMLElementEventMap>(e: HTMLElement | null, type: K, f: (ev: HTMLElementEventMap[K]) => void) => e?.addEventListener(type, f, { signal });
  let pinned = store.get(key) === "1";
  let shown: Shown = "rail";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const to = (s: Shown) => {
    clearTimeout(timer);
    shown = s;
    if (root.dataset["pull"] !== undefined) {
      root.style.removeProperty("--pull");
      delete root.dataset["pull"];
    }
    root.dataset["side"] = shown === "rail" && pinned ? "pinned" : shown;
    menu.setAttribute("aria-expanded", String(shown === "drawer"));
    pin.setAttribute("aria-pressed", String(pinned));
    pin.setAttribute("aria-label", pinned ? "unpin sidebar" : "pin sidebar");
  };
  const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>("a[href], button")).filter((e) => e.offsetParent !== null);
  const openDrawer = () => {
    to("drawer");
    focusables()[0]?.focus();
  };
  const shut = () => {
    const was = shown;
    to("rail");
    if (was === "drawer") menu.focus();
  };
  const hover = (s: Shown, ms: number) => (e: PointerEvent | FocusEvent) => {
    const mouse = !(e instanceof PointerEvent) || e.pointerType === "mouse";
    const inside = s === "rail" && e instanceof FocusEvent && e.relatedTarget instanceof Node && panel.contains(e.relatedTarget);
    if (!mouse || inside || pinned || shown !== (s === "open" ? "rail" : "open")) return;
    clearTimeout(timer);
    timer = setTimeout(() => to(s), ms);
  };
  on(menu, "click", openDrawer);
  on(q(".sdx"), "click", shut);
  on(q(".sdscrim"), "click", shut);
  on(pin, "click", () => {
    pinned = !pinned;
    store.put(key, pinned ? "1" : null);
    to("rail");
  });
  on(panel, "pointerenter", hover("open", HOVER_IN));
  on(panel, "focusin", hover("open", HOVER_IN));
  on(panel, "pointerleave", hover("rail", HOVER_OUT));
  on(panel, "focusout", hover("rail", HOVER_OUT));
  on(panel, "click", (e) => {
    if (shown === "drawer" && e.target instanceof Element && e.target.closest("a[href]")) shut();
  });
  on(root, "keydown", (e) => {
    if (e.key === "Escape" && shown !== "rail") {
      e.preventDefault();
      shut();
    }
    if (e.key !== "Tab" || shown !== "drawer") return;
    const all = focusables();
    const [first, last] = [all[0], all[all.length - 1]];
    const at = document.activeElement;
    if (!(e.shiftKey ? at === first || !panel.contains(at) : at === last)) return;
    e.preventDefault();
    (e.shiftKey ? last : first)?.focus();
  });
  const d: Drawer = { root, panel, shown: () => shown, open: openDrawer, shut, back: () => to(shown) };
  on(q(".sdedge"), "pointerdown", swipe(d, 0, signal));
  on(panel, "pointerdown", swipe(d, 100, signal));
  toggles(root, signal, open);
  to("rail");
  return () => {
    life.abort();
    clearTimeout(timer);
  };
}
