import type { Block, Kind } from "./types.ts";
import type { Ctx } from "../render/ctx.ts";
export type Of<K extends Kind> = Extract<Block, {
    type: K;
}>;
export declare const R: {
    [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null;
};
export declare const native: readonly Kind[];
