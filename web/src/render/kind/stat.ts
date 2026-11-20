import type { Stat } from "../../gen/types.ts";
import { el, h, nodes } from "../dom.ts";
import { ticked } from "../text.ts";

export function stat(b: Stat): HTMLElement {
  const s = el("div", "stats");
  for (const i of b.items ?? [b]) {
    const sp = i.spark ?? [];
    const hi = Math.max(1, ...sp);
    const tile = h("div", `st ${i.tone ?? ""}`, h("b", "b-stat__value", ticked(i.value)));
    if (i.unit) tile.append(" ", h("small", "", i.unit));
    tile.append(h("span", "m", i.label ?? ""));
    const points = sp.map((v, x) => `${x},${10 - (v / hi) * 10}`).join(" ");
    if (sp.length > 1) tile.append(...nodes(`<svg class=spark viewBox="0 0 ${sp.length - 1} 10" preserveAspectRatio=none aria-hidden=true><polyline points="${points}"/></svg>`));
    s.append(tile);
  }
  return s;
}
