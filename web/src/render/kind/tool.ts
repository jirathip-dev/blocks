import type { Tool } from "../../gen/types.ts";
import { h } from "../dom.ts";

export function tool(b: Tool): HTMLElement {
  return h("div", "tool", b.name);
}
