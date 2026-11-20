import type { Column, Import, ImportColumn } from "../../gen/types.ts";
import type { Book, Row } from "../../sheet/index.ts";
type Sheet = typeof import("../../sheet/index.ts");
export type Picked = {
    name: string;
    bytes: Uint8Array;
    book: Book;
    map: Record<string, number>;
};
export type ImportState = {
    file: Picked | null;
    error: string;
    show: "all" | "errors";
    step: "pick" | "review" | "ask" | "sending";
    open: boolean;
    sent: boolean;
    again: boolean;
};
export type ImportView = {
    step: ImportState["step"] | "done" | "off";
    rows: Row[];
    good: Row[];
    bad: Row[];
    shown: Row[];
    hidden: number;
    missing: ImportColumn | undefined;
    extra: string[];
    got: number;
};
export declare const load: () => Promise<Sheet>;
export declare const fresh: () => ImportState;
export declare const say: (lang: string | null | undefined, key: string, v?: Record<string, string | number>) => string;
export declare const column: (c: ImportColumn) => Column;
export declare const cell: (c: ImportColumn, r: Row) => string;
export declare function pick(b: Import, st: ImportState, name: string, bytes: Uint8Array, lang?: string | null, at?: number): Promise<(ImportState & {
    error: string;
    file: null;
    step: string;
}) | undefined>;
export declare function view(b: Import, st: ImportState, lang?: string | null): ImportView;
export declare const values: (st: ImportState, v: ImportView) => {
    rows: Record<string, string | number>[];
    file: string;
    left: number;
};
export declare function template(b: Import, lang?: string | null): Promise<void>;
export declare function leftOut(b: Import, v: ImportView, lang?: string | null): Promise<void>;
export {};
