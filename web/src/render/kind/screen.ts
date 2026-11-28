import { columns } from "../../core/tree.ts";
import type { Screen } from "../../gen/types.ts";
import { offable, sends, urlOf } from "../act.ts";
import { kids } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { btn, el } from "../dom.ts";

export function screen(b: Screen, c: Ctx): HTMLElement {
  const s = el("div", "scr");
  s.dataset["id"] = String(b.id);
  const title = el("span", "tw b-screen__title");
  title.append(c.theme.word(`tab-${b.id}`, b.title ?? ""));
  const head = el("p", "tabh");
  head.append(title);
  for (const a of b.actions ?? [])
    for (const m of a.menu ?? [a]) {
      const x = btn(m.label, "b-screen__actions", urlOf(m.tap), sends(m.tap, m.action));
      x.onclick = () => (m.tap ? c.tap(m.tap) : c.act({ action: m.action, values: m.values, confirm: m.confirm }, x));
      head.append(offable(x, m));
    }
  const split = columns(b);
  if (split) {
    const [mains, side] = split;
    const main = el("div", "scr-main");
    main.dataset["kids"] = "";
    main.append(...kids(mains, c));
    const col = el("aside", "scr-side");
    col.setAttribute("aria-label", side.map((x) => String(x["header"] ?? "")).join(", "));
    col.append(...kids(side, c));
    const cols = el("div", "scr-cols");
    cols.append(main, col);
    s.classList.add("split");
    s.append(head, cols);
    return s;
  }
  s.append(head, ...kids(b.blocks, c));
  if (b.focus) {
    const m = el("div", "msgs");
    m.append(...Array.from(s.children).filter((e) => !e.matches(".row.sticky, .cmp")));
    s.insertBefore(m, s.querySelector(":scope > .cmp"));
  }
  return s;
}
