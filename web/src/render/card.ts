import { type Blk, blks, btn, type Ctx, el, h, isBlk, kids, obj, ticked, toggle, tone } from "./index.ts";

export function card(b: Blk, c: Ctx): HTMLElement {
  const k = el("div", `card ${b.tone ?? ""} k-${b.kind ?? ""}`);
  k.dataset.id = String(b.id ?? "");
  const fold = isBlk(b.fold) ? b.fold : null;
  const main = fold && isBlk(fold.main) ? fold.main : null;
  const shut = fold && !c.open.has(String(b.id));
  if (fold) {
    const line = el("div", "fold");
    line.tabIndex = 0;
    line.setAttribute("role", "button");
    line.setAttribute("aria-expanded", String(!shut));
    line.append(h("span", "fl", String(fold.line ?? "")));
    line.onclick = (e) => {
      if (!(e.target instanceof Element && e.target.closest("button"))) toggle(k, b.id, c, true);
    };
    if (main && shut) {
      const m = btn(main.label, "main");
      m.onclick = () => c.act({ action: main.action, block: main.block, values: { ...obj(main.values), choice: main.value } }, m);
      line.append(m);
    }
    k.append(line);
    if (shut) return k;
  }
  const badge = tone(b.badge);
  const head = h("div", "ch", h("b", "b-card__title", String(b.title ?? "")));
  if (b.badge) head.append(" ", h("span", `tag b-card__badge ${badge.tone ?? ""}`, String(badge.text ?? "")));
  if (b.meta) head.append(" ", h("span", "m", ticked(b.meta)));
  if (b.title || b.badge) k.append(head);
  if (b.subtitle) k.append(h("p", "m b-card__subtitle", String(tone(b.subtitle).text ?? "")));
  k.append(...kids(b.blocks, c));
  const buttons = blks(b.buttons);
  if (buttons.length) {
    const bar = el("div", "bar b-card__actions");
    bar.append(...kids(buttons, c));
    k.append(bar);
  }
  return k;
}
