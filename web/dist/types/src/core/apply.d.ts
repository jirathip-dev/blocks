import type { Block, Op } from "../gen/types.ts";
export type Rec = {
    [key: string]: unknown;
};
export declare const isRec: (v: unknown) => v is Rec;
export declare function get(root: Rec, id: string): Rec | undefined;
export declare function apply(screen: Block, ops: Op[]): Block | undefined;
