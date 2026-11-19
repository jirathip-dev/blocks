import { type Phase, type Rules } from "./core/gesture.ts";
import type { Gesture } from "./gen/types.ts";
import type { Ctx } from "./render/index.ts";
export type Held = {
    start: unknown;
    c: unknown;
    back: (ok: boolean) => void;
};
export type Grabbed<B, G, R, C> = {
    block: B;
    gesture: Gesture;
    rules: Rules<B, G, R, C>;
    grab: G;
    item: string;
    reach: (dx: number, dy: number) => R;
    show: (c: C | null) => void;
};
type Block = {
    id?: string | null;
};
export declare function say(text: string): void;
export declare function held<B extends Block, G, R, C>(c: Ctx, o: Pick<Grabbed<B, G, R, C>, "block" | "rules" | "grab" | "item">): unknown;
export declare function gestured<B extends Block, G, R, C>(el: HTMLElement, c: Ctx, o: Grabbed<B, G, R, C>): void;
export declare function zoomed(el: HTMLElement, keep: Record<string, unknown>, o: {
    min: number;
    max: number;
    apply: (z: number) => void;
}): void;
export type Typed<B, G, C> = Omit<Grabbed<B, G, string, C>, "reach" | "show"> & {
    show: (p: Phase<C>["at"], c: C | null) => void;
    left: (key: string) => void;
};
export declare function edited<B extends Block, G, C>(input: HTMLInputElement, c: Ctx, o: Typed<B, G, C>): void;
export {};
