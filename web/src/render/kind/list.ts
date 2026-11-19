import type { List } from "../../gen/types.ts";
import { kids } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el } from "../dom.ts";

export function list(b: List, c: Ctx): HTMLElement {
  const l = el("div", "list");
  l.append(...kids(b.rows, c));
  return l;
}
