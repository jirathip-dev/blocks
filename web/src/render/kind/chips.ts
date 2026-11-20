import type { Chips } from "../../gen/types.ts";
import type { Ctx } from "../ctx.ts";
import { btn, el } from "../dom.ts";

export function chips(b: Chips, c: Ctx): HTMLElement {
  const s = el("div", "chips");
  const sel = b.selected ?? [];
  for (const o of b.options) {
    const x = btn(o.label, sel.includes(o.value) ? "on" : "", undefined, b.action);
    x.setAttribute("aria-pressed", String(sel.includes(o.value)));
    x.onclick = () => {
      const next = !b.multi || o.value === "all" ? [o.value] : sel.includes(o.value) ? sel.filter((v) => v !== o.value) : [...sel.filter((v) => v !== "all"), o.value];
      c.act({ action: b.action, block: b.id, values: { [b.name]: next.length ? next : ["all"] } }, x);
    };
    s.append(x);
  }
  return s;
}
