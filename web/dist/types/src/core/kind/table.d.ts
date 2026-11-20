import type { Cell, Column, Table, TableRow } from "../../gen/types.ts";
import type { Rules } from "../gesture.ts";
export type GridGrab = {
    row: string;
    column: string;
} | string;
export type CellEdit = {
    row: string;
    column: string;
    value: Cell;
};
export type GridChange = CellEdit | string[];
export declare function shown(c: Column, v: Cell | undefined, thai?: boolean): string;
export declare function parse(c: Column, text: string): Cell | null;
export declare const editable: (b: Table, c: Column) => boolean;
export declare const named: (b: Table, r: TableRow) => string;
export declare function worked(b: Table, r: TableRow): TableRow;
export declare function chunks(order: string[], isHead: (id: string) => boolean): [string[], string[][]];
export declare const grid: Rules<Table, GridGrab, string | number, GridChange>;
