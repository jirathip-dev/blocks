import type { Island } from "../../gen/types.ts";
import { island as mount, isTag } from "../../island.ts";
import { fallback } from "../block.ts";
import type { Ctx } from "../ctx.ts";

export function island(b: Island, c: Ctx): HTMLElement {
  return isTag(b.name)
    ? mount(b, [...fallback(b, c).childNodes], (action, values) => void c.act({ action, block: b.id, values }), (n) => c.drop?.(`event ${b.id ?? ""} ${n}`))
    : fallback(b, c);
}
