import type { Cell, Column, TableRow } from "../gen/types.ts";
export declare const at: (r: TableRow, id: string) => Cell | undefined;
export declare const unit: (c: Column) => string | null | undefined;
export declare const number: (c: Column, v: number) => string;
export declare function total(c: Column, rows: TableRow[]): [string, string] | null;
