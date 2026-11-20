import type { Lane, Scene } from "../../gen/types.ts";
import { acts, sends, urlOf } from "../act.ts";
import type { Ctx } from "../ctx.ts";
import { el, h, href } from "../dom.ts";
import { ticked } from "../text.ts";

function lane(l: Lane, c: Ctx): HTMLElement {
  const url = urlOf(l.tap);
  const cls = `ln ${l.state}${l.tap ? " tap" : ""}`;
  const x: HTMLElement = url ? href(el("a", cls), url) : el("div", cls);
  x.dataset["id"] = l.id;
  x.setAttribute("aria-label", `${l.title}, ${l.state}`);
  const tap = l.tap;
  if (tap && !url) {
    acts(x, sends(tap)).setAttribute("role", "button");
    x.tabIndex = 0;
    x.onclick = () => c.tap(tap);
    x.onkeydown = (e) => e.key === "Enter" && c.tap(tap);
  }
  const body = h("span", "lnb", h("span", "lnh", h("span", "lnt", l.title), h("span", "lns", l.state)));
  const meta = [l.stage, l.tool, l.since ? { since: l.since } : null].filter((v) => v != null && v !== "").map(ticked);
  if (meta.length) body.append(h("span", "lnx", ...meta.flatMap((m, i) => (i ? [" · ", m] : [m]))));
  x.append(el("i", "lnm"), body);
  return x;
}

export function scene(b: Scene, c: Ctx): HTMLElement {
  const root = el("div", "scn");
  if (b.label) root.append(h("div", "sh", b.label));
  const lanes = b.lanes ?? [];
  if (lanes.length) root.append(h("ul", "scl", ...lanes.map((l) => h("li", "", lane(l, c)))));
  return root;
}
