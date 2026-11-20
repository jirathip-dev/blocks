import { useContext } from "react";
import type { Lane, Scene } from "../../../src/core/index.ts";
import { type Ctx, Cx } from "../act.ts";
import { out, press, sends, ticked, urlOf, type V } from "../draw.ts";
import { h } from "../h.ts";

function lane(l: Lane, cx: Ctx) {
  const url = urlOf(l.tap);
  const tap = l.tap;
  const own = { "data-id": l.id, "aria-label": `${l.title}, ${l.state}` };
  const go = tap && !url ? { ...press(() => cx.tap(tap)), "data-action": sends(tap) } : null;
  const meta = [l.stage, l.tool, l.since ? { since: l.since } : null].filter((v) => v != null && v !== "").map((m) => ticked(m, cx));
  const x = meta.length ? h("span", "lnx", null, ...meta.flatMap((m, i) => (i ? [" · ", m] : [m]))) : null;
  const body = h("span", "lnb", null, h("span", "lnh", null, h("span", "lnt", null, l.title), h("span", "lns", null, l.state)), x);
  return h(url ? "a" : "div", `ln ${l.state}${tap ? " tap" : ""}`, { ...own, ...go, ...(url ? out(url) : null) }, h("i", "lnm", null), body);
}

export function scene({ b, hooks }: V<Scene>) {
  const cx = useContext(Cx);
  const lanes = b.lanes ?? [];
  return h("div", "scn", hooks, b.label ? h("div", "sh", null, b.label) : null, lanes.length ? h("ul", "scl", null, ...lanes.map((l) => h("li", "", { key: l.id }, lane(l, cx)))) : null);
}
