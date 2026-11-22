import type { Chart, PointMove, Series } from "../../gen/types.ts";
import type { Rules } from "../gesture.ts";
export type PointGrab = {
    series: string;
    at: string;
};
export type PointReach = {
    steps: number;
};
export declare function nice(v: number): number;
export declare function decimals(x: number): number;
export declare function fixed(v: number, d: number): string;
export declare const isLine: (c: Chart, s: Series) => boolean;
export declare function axis(c: Chart): [number, number];
export declare function stepOf(c: Chart, s: Series): number;
export declare function shown(c: Chart, s: Series, v: number): string;
export declare const chart: Rules<Chart, PointGrab, PointReach, PointMove>;
