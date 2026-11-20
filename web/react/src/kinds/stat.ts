import { useContext } from "react";
import type { Stat, Tile } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { ticked, type V } from "../draw.ts";
import { h } from "../h.ts";

export function stat({ b, hooks }: V<Stat>) {
  const cx = useContext(Cx);
  const tile = (i: Stat | Tile) => {
    const sp = i.spark ?? [];
    const hi = Math.max(1, ...sp);
    const points = sp.map((v, x) => `${x},${10 - (v / hi) * 10}`).join(" ");
    const spark = h("svg", "spark", { viewBox: `0 0 ${sp.length - 1} 10`, preserveAspectRatio: "none", "aria-hidden": "true" }, h("polyline", "", { points }));
    const unit = i.unit ? [" ", h("small", "", null, i.unit)] : [];
    return h("div", `st ${i.tone ?? ""}`, null, h("b", "b-stat__value", null, ticked(i.value, cx)), ...unit, h("span", "m", null, i.label ?? ""), sp.length > 1 ? spark : null);
  };
  return h("div", "stats", hooks, ...(b.items ?? [b]).map(tile));
}
