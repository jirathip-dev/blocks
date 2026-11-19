import type { DaySpan, Timeline, TimeRow } from "../../gen/types.ts";
import type { Rules } from "../gesture.ts";
export type BarGrab = {
    bar: string;
    part: "body" | "start" | "end";
} | {
    row: string;
};
export type Days = {
    days: number;
    from?: string | null;
};
export declare function day(s: string): number | null;
export declare const iso: (n: number) => string;
export declare const parts: (n: number) => {
    date: number;
    month: number;
    year: number;
    weekday: number;
};
export declare function words(start: string, end: string): string;
export declare function firstFree(t: Timeline, r: TimeRow): number | null;
export declare const timeline: Rules<Timeline, BarGrab, Days, DaySpan>;
