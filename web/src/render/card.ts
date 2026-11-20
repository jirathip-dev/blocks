import type { Card } from "../gen/types.ts";
import { btn, type Ctx, el, h, kids, ticked, toggle, tone } from "./index.ts";

export function card(b: Card, c: Ctx): HTMLElement {
  const k = el("div", `card ${b.tone ?? ""} k-${b.kind ?? ""}`);
  k.dataset.id = b.id ?? "";
  const fold = b.fold ?? null;
  const main = fold?.main ?? null;
  const shut = fold && !c.open.has(String(b.id));
  if (fold) {
    const line = el("div", "fold");
    line.tabIndex = 0;
    line.setAttribute("role", "button");
    line.setAttribute("aria-expanded", String(!shut));
    line.append(h("span", "fl", fold.line));
    line.onclick = (e) => {
      if (!(e.target instanceof Element && e.target.closest("button"))) toggle(k, b.id, c, true);
    };
    if (main && shut) {
      const m = btn(main.label, "main", undefined, main.action);
      m.onclick = () => c.act({ action: main.action, block: main.block, values: { ...main.values, choice: main.value } }, m);
      line.append(m);
    }
    k.append(line);
    if (shut) return k;
  }
  const head = h("div", "ch", h("b", "b-card__title", b.title ?? ""));
  if (b.badge) head.append(" ", h("span", `tag b-card__badge ${b.badge.tone ?? ""}`, ticked(b.badge.text)));
  if (b.meta) head.append(" ", h("span", "m", ticked(b.meta)));
  if (b.title || b.badge) k.append(head);
  if (b.subtitle) {
    const s = tone(b.subtitle);
    k.append(h("p", `m b-card__subtitle ${s.tone ?? ""}`.trimEnd(), ticked(s.text)));
  }
  k.append(...kids(b.blocks, c));
  const buttons = b.buttons ?? [];
  if (buttons.length) {
    const bar = el("div", "bar b-card__actions");
    bar.append(...kids(buttons, c));
    k.append(bar);
  }
  return k;
}
