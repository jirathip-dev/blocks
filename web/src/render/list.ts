import { type Blk, type Ctx, el, kids } from "./index.ts";

export function list(b: Blk, c: Ctx): HTMLElement {
  const l = el("div", "list");
  l.append(...kids(b.rows, c));
  return l;
}
