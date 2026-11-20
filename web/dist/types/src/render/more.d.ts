import type { Page } from "../gen/types.ts";
import { type Ctx } from "./index.ts";
export type Paged = {
    id: string;
    page?: Page | null;
    n: number;
    root: HTMLElement;
    held?: () => boolean;
    wrap: (kids: (Node | string)[], no: boolean) => HTMLElement;
};
export declare function paged(c: Ctx, o: Paged): HTMLElement | null;
