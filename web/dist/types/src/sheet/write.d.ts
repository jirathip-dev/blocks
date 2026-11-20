import type { ImportColumn } from "../gen/types.ts";
import type { Say } from "./check.ts";
export type Cell = string | number;
export type Tab = {
    name: string;
    rows: Cell[][];
    bold?: boolean[];
};
export declare function book(tabs: Tab[]): Uint8Array;
export declare function template(title: string, cols: ImportColumn[], say: Say): Uint8Array;
