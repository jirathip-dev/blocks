import type { {{Name}} } from "../../gen/types.ts";
import { h } from "../dom.ts";

export function {{name}}(b: {{Name}}): HTMLElement {
  return h("div", "{{name}}", b.label);
}
