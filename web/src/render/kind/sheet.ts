import type { Sheet } from "../../gen/types.ts";
import { kids } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el } from "../dom.ts";

export function sheet(b: Sheet, c: Ctx): HTMLElement {
  const s = el("div", "shb");
  s.append(...kids(b.blocks, c));
  return s;
}
