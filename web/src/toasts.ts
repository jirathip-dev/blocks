import type { Toast } from "./gen/types.ts";
import { btn, el, h } from "./render/index.ts";
import { line } from "./render/toast.ts";

/// Sends a toast's undo from its button; false: it was not sent (a confirm said no) or failed.
export type Undo = (b: HTMLElement) => Promise<boolean>;
type Item = { t: Toast; undo?: Undo };
type Shown = { item: Item; e: HTMLElement; more: HTMLElement; timer?: ReturnType<typeof setInterval> };

const WAIT = 3;
const GAP = 160;
const TICK = 1000;
const life = (t: Toast) => (t.tone === "bad" ? 0 : t.undo ? 8000 : t.tone === "warn" ? 6000 : 4000);

/// The answers' toasts: one shown at a time over the screen, at most `WAIT` waiting, each gone after its tone's time.
export function toasts(): { box: HTMLElement; say(t: Toast, undo?: Undo, first?: boolean): void; close(): void } {
  const box = el("div", "tsts");
  box.setAttribute("aria-live", "polite");
  const waiting: Item[] = [];
  let cur: Shown | undefined;
  let gap: ReturnType<typeof setTimeout> | undefined;

  const count = () => {
    if (!cur) return;
    const n = waiting.length;
    cur.more.textContent = n ? `+${n}` : "";
    if (n) cur.more.setAttribute("aria-label", `${n} more`);
    else cur.more.removeAttribute("aria-label");
  };
  const drop = () => {
    clearInterval(cur?.timer);
    cur?.e.remove();
    cur = undefined;
  };
  const next = () => {
    gap = undefined;
    const item = waiting.shift();
    if (item) show(item);
  };
  const done = (e: HTMLElement) => {
    if (cur?.e !== e) return;
    drop();
    if (waiting.length) gap = setTimeout(next, GAP);
  };

  const show = (item: Item) => {
    const { t } = item;
    const e = line(t, "");
    e.setAttribute("role", t.tone === "bad" ? "alert" : "status");
    e.setAttribute("aria-label", t.title);
    const more = el("span", "tsn");
    const undo = t.undo && item.undo ? btn(`${t.undo.label || "undo"}`) : el("span");
    const x = btn("×", "tsc");
    x.setAttribute("aria-label", "dismiss");
    x.onclick = () => done(e);
    e.append(more, undo, x);
    e.onkeydown = (ev) => ev.key === "Escape" && done(e);
    const send = item.undo;
    if (t.undo && send) {
      const label = undo.textContent ?? "";
      undo.onclick = async () => {
        if (undo.hasAttribute("aria-busy")) return;
        undo.replaceChildren(h("span", "", `${label}…`));
        const sent = await send(undo);
        if (sent) return done(e);
        undo.replaceChildren(h("span", "", label));
      };
    }
    cur = { item, e, more };
    const ms = life(t);
    if (ms) {
      const fill = el("b");
      const k = h("span", "tsk", fill);
      k.setAttribute("aria-hidden", "true");
      e.append(k);
      let left = ms;
      let hover = false;
      let focus = false;
      e.onpointerenter = () => (hover = true);
      e.onpointerleave = () => (hover = false);
      e.addEventListener("focusin", () => (focus = true));
      e.addEventListener("focusout", () => (focus = false));
      cur.timer = setInterval(() => {
        if (hover || focus) return;
        left -= TICK;
        fill.style.setProperty("--left", String(Math.max(0, left / ms)));
        if (left <= 0) done(e);
      }, TICK);
    }
    box.replaceChildren(e);
    count();
  };

  return {
    box,
    say(t, undo, first = false) {
      const item = { t: t.title ? t : { ...t, title: "Done" }, undo };
      if (first || (!cur && gap === undefined)) {
        drop();
        clearTimeout(gap);
        gap = undefined;
        return show(item);
      }
      waiting.push(item);
      if (waiting.length > WAIT) {
        const old = waiting.findIndex((w) => w.t.tone !== "bad");
        waiting.splice(Math.max(0, old), 1);
      }
      count();
    },
    close() {
      drop();
      clearTimeout(gap);
      box.remove();
    },
  };
}
