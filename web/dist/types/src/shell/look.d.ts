import type { Scheme } from "../gen/schemes.ts";
import { type Pair, type Scale } from "../core/look.ts";
import type { Store } from "../render/ctx.ts";
import { type Theme } from "../theme.ts";
export type Worn = Scheme | (Pair & {
    style?: Scale;
});
export declare const row: (label: string, f: () => void, on?: boolean) => HTMLDivElement;
export declare function wearer(schemes: Record<string, Worn>, theme: Theme, own?: Element | null): {
    look: HTMLStyleElement;
    wear: (name: string | null, keep?: Store) => void;
};
export declare function looks(schemes: Record<string, Worn>, store: Store, wear: (name: string | null, keep?: Store) => void, again: () => void): HTMLElement;
