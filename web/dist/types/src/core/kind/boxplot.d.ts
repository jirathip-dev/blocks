import type { Boxplot, Fallback, PlotBox, Tone } from "../../gen/types.ts";
export declare const decimals: (v: number) => number;
export declare const colour: (tone: Tone | null | undefined) => string;
export declare function places(p: Boxplot): number;
export declare function axis(p: Boxplot): [number, number, number] | null;
export declare function says(p: Boxplot, x: PlotBox): string;
export declare function boxFallback(p: Boxplot): Fallback;
