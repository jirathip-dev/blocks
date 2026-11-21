import type { Label, Toned } from "../gen/types.ts";
export declare const tone: (v: Toned) => Label;
export declare function md(s: unknown, refs?: boolean): string;
export declare const ticked: (v: unknown) => Node | string;
export declare const tick: (root: ParentNode) => void;
