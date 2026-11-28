import type { Blk } from "../../core/tree.ts";
import { diagrams, type Place, type Plan } from "../../core/kind/diagram.ts";
import { fallback } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";

const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(["http:", "", "www.w3.org", "2000", "svg"].join("/"), tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

function state(p: Place, c: Ctx): HTMLElement {
  let e: HTMLElement;
  if (p.timer) {
    const mark = h("span", "", "⧗");
    mark.setAttribute("aria-hidden", "true");
    e = h("div", p.cls, mark, h("span", "", h("span", "dgl", p.name), h("span", "dgv", p.timer.value)));
  } else {
    const note = p.count?.note;
    e = h("div", p.cls, h("span", p.cls.split(" ").includes("picked") ? "dgl as-picked-label" : "dgl", p.name), h("span", "dgc", p.count?.n ?? "", ...(note ? [h("small", note.cls, note.text)] : [])));
  }
  e.setAttribute("aria-label", p.aria);
  e.style.cssText = `left:${p.at.x}px;top:${p.at.y}px;width:${p.at.w}px;height:${p.at.h}px`;
  e.title = p.title;
  if (p.tap) {
    e.classList.add("tap");
    e.tabIndex = 0;
    e.setAttribute("role", "button");
    e.onclick = () => c.tap(p.tap);
  }
  return e;
}

function map(p: Plan, c: Ctx): HTMLElement {
  const out = el("div", `dgm ${p.cls}`);
  out.style.cssText = `width:${p.width}px;height:${p.height}px`;
  const svg = svgEl("svg", { width: p.width, height: p.height, "aria-hidden": "true" });
  if (p.dot) svg.append(svgEl("circle", { ...p.dot, r: 6, class: "dgs" }));
  svg.append(...p.paths.map((x) => svgEl("path", { d: x.d, class: x.cls })));
  out.append(svg, ...p.places.map((x) => state(x, c)));
  return out;
}

export function diagram(b: Blk, c: Ctx): HTMLElement {
  const plans = diagrams(b);
  return plans.length ? h("div", "dg", ...plans.map((p) => map(p, c))) : fallback(b, c);
}
