import type { LayoutEdit } from "../gen/layout.ts";
export type Tree = {
    type: string;
    id: string;
    slots?: Record<string, Tree[]>;
};
export declare function stay(n: Tree, grabbed: string): LayoutEdit | null;
export declare function places(tree: Tree, slots: Record<string, string[]>, grabbed: string): LayoutEdit[];
export declare function drops(tree: Tree, slots: Record<string, string[]>, grabbed: string): LayoutEdit[];
