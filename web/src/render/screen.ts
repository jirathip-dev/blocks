import type { Screen } from "../gen/types.ts";
import { btn, type Ctx, el, kids, offable, sends, urlOf } from "./index.ts";

export function screen(b: Screen, c: Ctx): HTMLElement {
  const s = el("div", "scr");
  s.dataset.id = String(b.id);
  const title = el("span", "tw b-screen__title");
  title.append(c.theme.word(`tab-${b.id}`, (b.title ?? "").toLowerCase()));
  const head = el("p", "tabh");
  head.append(title);
  for (const a of b.actions ?? [])
    for (const m of a.menu ?? [a]) {
      const x = btn(m.label, "b-screen__actions", urlOf(m.tap), sends(m.tap, m.action));
      x.onclick = () => (m.tap ? c.tap(m.tap) : c.act({ action: m.action, values: m.values, confirm: m.confirm }, x));
      head.append(offable(x, m));
    }
  s.append(head, ...kids(b.blocks, c));
  if (b.focus) {
    const m = el("div", "msgs");
    m.append(...Array.from(s.children).filter((e) => !e.matches(".row.sticky, .cmp")));
    s.insertBefore(m, s.querySelector(":scope > .cmp"));
  }
  return s;
}
