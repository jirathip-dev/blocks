import { type State } from "../../core/eval.ts";
import type { Field, Form } from "../../gen/types.ts";
import { type Ctx, type Store } from "../ctx.ts";
export declare function form(b: Form, c: Ctx): HTMLElement;
export declare function field(x: Field, key: string, store: Store): HTMLElement;
export declare function values(root: HTMLElement): State;
