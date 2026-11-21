import type { Op, Part } from "../../gen/types.ts";
export type Append = Extract<Op, {
    op: "append";
}>;
export declare function grow(parts: Part[], op: Append): Part[] | undefined;
