import type { Heat } from "../../gen/types.ts";
import type { Ctx } from "../ctx.ts";
export declare function range(b: Heat): [number, number];
export declare function step(v: number, [min, max]: [number, number]): number;
export declare function heat(b: Heat, ctx: Ctx): HTMLElement;
