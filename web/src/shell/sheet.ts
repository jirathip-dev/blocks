import type { Blk } from "../core/tree.ts";
import { btn, el, h } from "../render/dom.ts";
import { box as modal } from "../render/kind/modal.ts";

/// A sheet: a modal over the page around a body; `closed` runs before it closes or shows anew.
export type Sheet = ReturnType<typeof sheet>;

/// Where a sheet's back button goes, and the title it names.
export type Back = { title: string; go: () => void };

/// The sheet, hidden; it closes when its modal does.
export function sheet(closed: () => void) {
  const box = el("div", "b-sheet");
  const body = el("div", "b-sheet__body");
  box.hidden = true;
  const close = () => {
    closed();
    box.hidden = true;
    box.replaceChildren();
  };
  box.addEventListener("close", close, true);
  const frame = (title: string, prev?: Back, own = false) => {
    const lead = prev && Object.assign(btn(`‹ ${prev.title}`, "b-back"), { onclick: prev.go });
    if (own && lead) body.querySelector(".mdt")?.before(lead);
    box.replaceChildren(own ? body : modal({ title, blocks: [] }, [body], { done: async () => true, lead }));
    box.hidden = false;
  };
  const show = (title: string, kids: HTMLElement[], prev?: Back) => {
    closed();
    body.replaceChildren(...kids);
    frame(title, prev);
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
