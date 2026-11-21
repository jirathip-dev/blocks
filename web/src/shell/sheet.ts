import type { Blk } from "../core/tree.ts";
import { btn, el, h } from "../render/dom.ts";

/// A sheet: a card with a head and a body over the page; `closed` runs before it closes or shows anew.
export type Sheet = ReturnType<typeof sheet>;

/// The sheet, hidden; a click beside its card closes it.
export function sheet(closed: () => void) {
  const box = el("div", "b-sheet");
  const head = el("header", "b-sheet__head");
  const body = el("div", "b-sheet__body");
  box.hidden = true;
  box.append(h("div", "b-sheet__card", head, body));
  const close = () => {
    closed();
    box.hidden = true;
  };
  box.addEventListener("click", (e) => e.target === box && close());
  const frame = (title: string, prev?: () => void) => {
    const x = btn("close", "b-sheet__close");
    x.onclick = close;
    const b = btn("‹ back", "b-back");
    if (prev) b.onclick = prev;
    head.replaceChildren(...(prev ? [b] : []), h("b", "b-sheet__title", title), x);
  };
  const show = (title: string, kids: HTMLElement[], prev?: () => void) => {
    closed();
    frame(title, prev);
    body.replaceChildren(...kids);
    box.hidden = false;
  };
  return { box, body, close, frame, show };
}

/// The confirm dialog: `ask(c)` shows `c`'s title and message and resolves with the button pressed.
export function confirmer() {
  const box = el("div", "b-confirm");
  box.hidden = true;
  const ask = (c: Blk): Promise<boolean> =>
    new Promise((done) => {
      const no = btn("cancel");
      const yes = btn(c["ok"] ?? "ok", c["destructive"] ? "bad" : "");
      const end = (v: boolean) => {
        box.hidden = true;
        done(v);
      };
      no.onclick = () => end(false);
      yes.onclick = () => end(true);
      box.replaceChildren(h("p", "", h("b", "", String(c["title"] ?? ""))), ...(c["message"] ? [h("p", "m", String(c["message"]))] : []), h("div", "bar", no, yes));
      box.hidden = false;
      yes.focus();
    });
  return { box, ask };
}
