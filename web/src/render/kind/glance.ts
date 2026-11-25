import type { Glance } from "../../gen/types.ts";
import { fallback } from "../block.ts";
import type { Ctx } from "../ctx.ts";

export const glance = (b: Glance, c: Ctx): HTMLElement => fallback(b, c);
