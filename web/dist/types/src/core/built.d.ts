import type { Of } from "../gen/builders.ts";
declare const checked: unique symbol;
export type Built = Of<"screen"> & {
    readonly [checked]: true;
};
export declare function built(screen: Of<"screen">): Built;
export {};
