import type { List } from "../gen/types.ts";
import { type Ctx, el, kids } from "./index.ts";

export function list(b: List, c: Ctx): HTMLElement {
  const l = el("div", "list");
  l.append(...kids(b.rows, c));
  return l;
}
