import type { Sheet } from "../gen/types.ts";
import { type Ctx, el, kids } from "./index.ts";

export function sheet(b: Sheet, c: Ctx): HTMLElement {
  const s = el("div", "shb");
  s.append(...kids(b.blocks, c));
  return s;
}
