import type { Page } from "../gen/types.ts";
import { say } from "../gesture.ts";
import { btn, type Ctx, h } from "./index.ts";

type Asked = { cursor: string; n: number; focus?: string; no: boolean; draw: () => void };
/// A table or list that may have more: its id, its page, how many rows it has loaded, the element that is busy while it waits, whether an edit or a move holds the load, and how a row of its own is made.
export type Paged = { id: string; page?: Page | null; n: number; root: HTMLElement; held?: () => boolean; wrap: (kids: (Node | string)[], no: boolean) => HTMLElement };

const asked = new Map<string, Asked>();
const FOCUSABLE = "button, a[href], input, select, [tabindex]";

function refocus(id: string, row: string) {
  if (document.activeElement && document.activeElement !== document.body) return;
  const e = document.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] [data-id="${CSS.escape(row)}"]`);
  (e?.matches(FOCUSABLE) ? e : e?.querySelector<HTMLElement>(FOCUSABLE))?.focus({ preventScroll: true });
}

function answered(o: Paged) {
  const was = asked.get(o.id);
  if (!was || was.cursor === o.page?.cursor) return;
  asked.delete(o.id);
  if (o.n > was.n) say(`${o.n - was.n} more row${o.n - was.n === 1 ? "" : "s"} loaded, ${o.n} in all`);
  const row = was.focus;
  if (row) queueMicrotask(() => refocus(o.id, row));
}

/// The row under a table's or list's last row while it has `more`: it asks for the next page once, when it comes into view or the last row gets focus, and turns into a retry if the app refuses.
export function paged(c: Ctx, o: Paged): HTMLElement | null {
  answered(o);
  const page = o.page;
  if (!page) return null;
  let e = o.wrap([], false);
  let paused = false;
  const retry = btn("load more");
  retry.dataset.action = page.action;
  const draw = () => {
    const no = !!asked.get(o.id)?.no;
    const kids = no ? [h("span", "", "Couldn’t load more."), retry] : paused ? [h("span", "", "more below · loads once the row is placed")] : [h("span", "tbmw", "Loading more")];
    const next = o.wrap(kids, no);
    if (e.parentNode) e.replaceWith(next);
    e = next;
    if (!asked.has(o.id)) (seen?.disconnect(), seen?.observe(e));
    o.root.setAttribute("aria-busy", String(!no && !paused));
  };
  const seen = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => es.some((x) => x.isIntersecting) && ask()) : null;
  const ask = () => {
    if (asked.has(o.id) || !e.isConnected) return;
    paused = !!o.held?.();
    if (paused) return draw();
    seen?.disconnect();
    const focus = document.activeElement?.closest<HTMLElement>("[data-id]")?.dataset.id;
    asked.set(o.id, { cursor: page.cursor, n: o.n, focus, no: false, draw });
    draw();
    void c.act({ action: page.action, block: o.id, values: { cursor: page.cursor } }).then((ok) => {
      const a = asked.get(o.id);
      if (ok || a?.cursor !== page.cursor) return;
      a.no = true;
      a.draw();
    });
  };
  retry.onclick = () => (asked.delete(o.id), ask());
  const a = asked.get(o.id);
  if (a) a.draw = draw;
  draw();
  if (a) return e;
  o.root.addEventListener("focusin", (ev) => ev.target instanceof Element && ev.target.matches(":focus-visible") && !!e.previousElementSibling?.contains(ev.target) && ask());
  return e;
}
