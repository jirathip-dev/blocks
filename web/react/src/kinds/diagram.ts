import { createElement, useContext, useMemo } from "react";
import type { Diagram, Tap } from "../../../src/core/index.ts";
import { diagrams, type Place, type Plan } from "../../../src/core/kind/diagram.ts";
import { type Ctx, Cx } from "../act.ts";
import { Fallen } from "../block.ts";
import { press, type V } from "../draw.ts";
import { h } from "../h.ts";

const isTap = (v: unknown): v is Tap => typeof v === "object" && v !== null;

function state(p: Place, cx: Ctx) {
  const note = p.count?.note;
  const body = p.timer
    ? [h("span", "", { "aria-hidden": "true" }, "⧗"), h("span", "", null, h("span", "dgl", null, p.name), h("span", "dgv", null, p.timer.value))]
    : [h("span", "dgl", null, p.name), h("span", "dgc", null, p.count?.n ?? "", note ? h("small", note.cls, null, note.text) : null)];
  const tap = p.tap;
  const own = { key: p.id, "aria-label": p.aria, title: p.title, style: { left: p.at.x, top: p.at.y, width: p.at.w, height: p.at.h } };
  return h("div", `${p.cls}${tap ? " tap" : ""}`, { ...own, ...(isTap(tap) ? press(() => cx.tap(tap)) : null) }, ...body);
}

function map(p: Plan, cx: Ctx) {
  const dot = p.dot ? h("circle", "dgs", { ...p.dot, r: 6 }) : null;
  const svg = h("svg", "", { width: p.width, height: p.height, "aria-hidden": "true" }, dot, ...p.paths.map((x, i) => h("path", x.cls, { key: i, d: x.d })));
  return h("div", `dgm ${p.cls}`, { key: p.cls, style: { width: p.width, height: p.height } }, svg, ...p.places.map((x) => state(x, cx)));
}

export function diagram({ b, hooks }: V<Diagram>) {
  const cx = useContext(Cx);
  const plans = useMemo(() => diagrams(b), [b]);
  return plans.length ? h("div", "dg", hooks, ...plans.map((p) => map(p, cx))) : createElement(Fallen, { b });
}
