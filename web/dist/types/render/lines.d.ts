import type { Lines } from "../gen/types.ts";
import { type Ctx } from "./index.ts";
export declare function minor(v: unknown, scale: number): number | null;
export declare function money(m: number, scale: number): string;
export declare function lines(b: Lines, c: Ctx): HTMLElement;
