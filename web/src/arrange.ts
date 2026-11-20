import type { SizeClass } from "./gen/layout.ts";
import { type Editing, type Placed, rows, wire } from "./edits.ts";
import { btn, el, h } from "./render/dom.ts";

export type { Editing } from "./edits.ts";

function arrange(tree: Placed, size: SizeClass, o: Editing, refuse: (why: string) => void, done: () => void): HTMLElement {
  const list = h("div", "list b-arrange");
  list.setAttribute("aria-label", `layout on ${size}`);
  for (const r of rows(tree)) {
    const row = h("div", "row", h("span", "rm", h("span", "rt", r.label)));
    row.dataset.id = r.id;
    row.style.paddingInlineStart = `calc(var(--s3) * ${r.depth + 1})`;
    const pick = el("select");
    pick.setAttribute("aria-label", `${r.label} shows on ${size} as`);
    pick.append(...r.places.map((p) => Object.assign(el("option"), { value: p, textContent: p })));
    row.append(pick);
    list.append(row);
  }
  wire(list, tree, size, o, refuse, done);
  return list;
}

/// The edit mode's sheet and the tab that opens it; `draw` hands it the tree and size on screen, and redraws it while open.
export function editor(o: Editing, root: HTMLElement): { tab: HTMLElement; sheet: HTMLElement; draw(tree: Placed, size: SizeClass): void } {
  const sheet = el("div", "b-sheet");
  sheet.hidden = true;
  let now: [Placed, SizeClass] | undefined;
  const close = () => (sheet.hidden = true);
  const draw = (tree: Placed, size: SizeClass) => {
    now = [tree, size];
    root.append(sheet);
    if (sheet.hidden) return;
    const why = h("p", "m");
    why.setAttribute("role", "alert");
    const x = btn("done", "b-sheet__close");
    x.onclick = close;
    const head = h("header", "b-sheet__head", h("b", "b-sheet__title", `layout on ${size}`), x);
    sheet.replaceChildren(h("div", "b-sheet__card", head, h("div", "b-sheet__body", arrange(tree, size, o, (w) => (why.textContent = w), close), why)));
  };
  const tab = btn("edit layout", "b-tab");
  tab.onclick = () => {
    sheet.hidden = false;
    if (now) draw(...now);
  };
  return { tab, sheet, draw };
}
