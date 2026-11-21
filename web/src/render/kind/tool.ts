import { glyph as glyphOf } from "../../core/kind/message.ts";
import type { Tool } from "../../gen/types.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";

export function tool(b: Tool, c: Ctx): HTMLElement {
  const t = el("div", `tol${b.body != null ? " has" : ""}`);
  if (b.state === "running") t.setAttribute("aria-busy", "true");
  const glyph = h("i", "tog", glyphOf(b.state));
  glyph.setAttribute("aria-hidden", "true");
  const parts = [glyph, h("span", "ton b-tool__name", b.name), h("span", "tos b-tool__summary", b.summary ?? "")];
  if (b.body == null) {
    t.append(h("div", "toh", ...parts));
    return t;
  }
  const key = `tool:${b.id ?? b.name}`;
  const head = h("button", "toh", ...parts, h("span", "toc", "›"));
  const body = h("pre", "tob b-tool__body", b.body);
  head.type = "button";
  head.setAttribute("aria-label", b.name);
  const show = () => {
    const open = c.open.has(key);
    head.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
  };
  head.onclick = () => (c.open.has(key) ? c.open.delete(key) : c.open.add(key), show());
  show();
  t.append(head, body);
  return t;
}
