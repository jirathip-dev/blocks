import { type Blk, blks, el, h, isList, nodes, ticked } from "./index.ts";

export function stat(b: Blk): HTMLElement {
  const s = el("div", "stats");
  for (const i of blks(b.items ?? [b])) {
    const sp = isList(i.spark) ? i.spark.map(Number) : [];
    const hi = Math.max(1, ...sp);
    const tile = h("div", `st ${i.tone ?? ""}`, h("b", "b-stat__value", ticked(i.value)));
    if (i.unit) tile.append(" ", h("small", "", String(i.unit)));
    tile.append(h("span", "m", String(i.label ?? "")));
    const points = sp.map((v, x) => `${x},${10 - (v / hi) * 10}`).join(" ");
    if (sp.length > 1) tile.append(...nodes(`<svg class=spark viewBox="0 0 ${sp.length - 1} 10" preserveAspectRatio=none aria-hidden=true><polyline points="${points}"/></svg>`));
    s.append(tile);
  }
  return s;
}
