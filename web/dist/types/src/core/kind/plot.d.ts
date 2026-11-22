import type { Fallback, Op, Plot, Trace } from "../../gen/types.ts";
export type Points = Extract<Op, {
    op: "points";
}>;
type PlotTick = {
    at: number;
    text: string;
    odd: boolean;
};
export type PlotDrawn = {
    x: [number, number];
    y: [number, number];
    xTicks: PlotTick[];
    yTicks: PlotTick[];
    lines: number[][];
    last: string[];
    band: string | null;
};
export declare function grow(series: Trace[], op: Points): Trace[] | undefined;
export declare function drawn(p: Plot): PlotDrawn;
export declare function fallback(p: Plot): Fallback;
export {};
