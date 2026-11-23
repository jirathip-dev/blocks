import type { Chart, Tone } from "../../gen/types.ts";
import type { Ctx } from "../ctx.ts";
export declare const colour: (tone: Tone | null | undefined, i: number) => string;
export declare function chart(b: Chart, ctx: Ctx): HTMLElement;
