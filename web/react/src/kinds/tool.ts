import { useState } from "react";
import { glyph, type Tool } from "../../../src/core/index.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

export function tool({ b, hooks }: V<Tool>) {
  const [open, setOpen] = useState(false);
  const attrs = { ...hooks, ...(b.state === "running" ? { "aria-busy": "true" } : null) };
  const parts = [h("i", "tog", { key: "g", "aria-hidden": "true" }, glyph(b.state)), h("span", "ton b-tool__name", { key: "n" }, b.name), h("span", "tos b-tool__summary", { key: "s" }, b.summary ?? "")];
  if (b.body == null) return h("div", "tol", attrs, h("div", "toh", null, ...parts));
  const head = h("button", "toh", { type: "button", "aria-label": b.name, "aria-expanded": String(open), onClick: () => setOpen((o) => !o) }, ...parts, h("span", "toc", { key: "c" }, "›"));
  return h("div", "tol has", attrs, head, h("pre", "tob b-tool__body", { hidden: !open || undefined }, b.body));
}
