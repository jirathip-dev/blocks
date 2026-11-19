import type { Block, TreeNode } from "../gen/types.ts";
import { type State } from "./eval.ts";
export type Blk = {
    [k: string]: unknown;
};
export declare const isBlk: (v: unknown) => v is Blk;
export declare const blks: (v: unknown) => Blk[];
export declare const named: (b: Blk, t: string) => string;
export declare function tree(screen: Block, kinds: readonly string[], state?: State): TreeNode;
export declare function expect(got: TreeNode | undefined, want: TreeNode, at?: string, out?: string[]): string[];
