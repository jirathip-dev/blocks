import type { ImportColumn, Refused } from "../gen/types.ts";
import type { Line } from "./read.ts";
export type Say = (key: string, v?: Record<string, string | number>) => string;
export type Row = {
    n: number;
    cells: Record<string, string>;
    values: Record<string, string | number>;
    bad: Record<string, string>;
};
export declare const match: (cols: ImportColumn[], head: string[]) => Record<string, number>;
export declare function check(cols: ImportColumn[], map: Record<string, number>, lines: Line[], say: Say, refused?: Refused[]): Row[];
