import type { Act, Tap } from "../gen/types.ts";
import { linkable } from "../core/check.ts";
import type { Ctx } from "./ctx.ts";
export { linkable };
export declare const urlOf: (t?: Tap | null) => string | undefined;
export declare const sends: (t?: Tap | null, action?: unknown) => unknown;
export declare const acts: <E extends HTMLElement>(e: E, action: unknown) => E;
export declare const offable: <E extends HTMLElement>(e: E, a: Act) => E;
export declare function toggle(e: HTMLElement, id: unknown, c: Ctx, folds?: boolean): void;
