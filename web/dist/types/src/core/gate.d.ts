import type { Scheme } from "../gen/schemes.ts";
export type Miss = {
    what: string;
    got: number;
    min: number;
};
export declare function gate(s: Scheme, fills: "tint" | "outline" | "solid"): Miss[];
