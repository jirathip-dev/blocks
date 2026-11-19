import type { MarkKind, Media } from "../../gen/types.ts";
import type { Rules } from "../gesture.ts";
export type Spot = [number, number];
export type MarkChange = {
    id?: string;
    kind?: MarkKind;
    at?: number[];
    to?: number[];
    text?: string;
    group?: string;
};
export type Pen = {
    tool: MarkKind;
    at?: Spot;
    text?: string;
    group?: string;
};
export type MarkGrab = {
    body: string;
} | {
    start: string;
} | {
    end: string;
} | {
    remove: string;
} | {
    draw: Pen;
};
export type MarkReach = {
    from: Spot;
    to: Spot;
};
export declare const said: (k: MarkKind) => string;
export declare const ninth: ([x, y]: Spot) => string;
export declare const named: (b: Media, id: string) => string | null;
export declare const media: Rules<Media, MarkGrab, MarkReach, MarkChange>;
