import type { Page } from "../gen/types.ts";
import type { Ctx } from "./ctx.ts";
export type Paged = {
    id: string;
    page?: Page | null | undefined;
    n: number;
    root: HTMLElement;
    held?: () => boolean;
    wrap: (kids: (Node | string)[], no: boolean) => HTMLElement;
};
export declare function paged(c: Ctx, o: Paged): HTMLElement | null;
