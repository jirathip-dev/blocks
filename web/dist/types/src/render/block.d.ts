import { type Blk } from "../core/tree.ts";
import type { Ctx } from "./ctx.ts";
export declare function fallback(b: Blk, c: Ctx): HTMLElement;
export declare function render(b: Blk, c: Ctx): HTMLElement | null;
export declare function kids(bs: unknown, c: Ctx): HTMLElement[];
