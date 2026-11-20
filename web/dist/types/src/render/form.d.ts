import { type State } from "../core/eval.ts";
import type { Field, Form } from "../gen/types.ts";
import { type Ctx } from "./index.ts";
export type Drawn = {
    row: HTMLElement;
    name: string;
    sent(): unknown;
};
export declare function form(b: Form, c: Ctx): HTMLElement;
export declare function field(x: Field, key: string, c: Ctx, set?: (v: unknown) => void): Drawn;
export declare function values(all: Drawn[]): State;
