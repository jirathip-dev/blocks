import { type Blk, type Ctx, el, kids } from "./index.ts";

export function sheet(b: Blk, c: Ctx): HTMLElement {
  const s = el("div", "shb");
  s.append(...kids(b.blocks, c));
  return s;
}
