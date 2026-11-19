import type { TimeBar, Timeline } from "../gen/types.ts";
import { type Ctx } from "./index.ts";
export declare function lanes(bars: TimeBar[]): {
    of: Map<string, number>;
    n: number;
};
export declare function timeline(b: Timeline, c: Ctx): HTMLElement;
