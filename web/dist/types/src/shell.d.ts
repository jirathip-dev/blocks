import type { LayoutPlace, LayoutTransition } from "./gen/layout.ts";
import type { Scheme } from "./gen/schemes.ts";
import type { Kind } from "./gen/types.ts";
import { type Pair, type Scale } from "./core/look.ts";
import { type Renderer, type Store } from "./render/index.ts";
import { type Theme } from "./theme.ts";
export { behave } from "./behave.ts";
export { evaluate, start, view } from "./core/eval.ts";
export { dump } from "./dump.ts";
export { settle } from "./motion.ts";
export { apply, patcher } from "./patch.ts";
export { el, h, kids, render } from "./render/index.ts";
export { packs, plain, tiles } from "./theme.ts";
export type Placed<P> = {
    type: string;
    id: string;
    source?: string;
    path?: string;
    label?: string;
    place: P;
    transition: LayoutTransition;
    config?: Record<string, unknown>;
    slots?: Record<string, Placed<P>[]>;
};
export type Layout = {
    format: number;
    theme?: string;
    root: Placed<{
        compact: LayoutPlace;
        wide: LayoutPlace;
    }>;
};
export type Resolved = Placed<LayoutPlace>;
export type AppBlocks = Record<string, Renderer> & {
    [K in Kind]?: never;
};
export type Mount = {
    root: HTMLElement;
    layout: Layout;
    url: (source: string, path: string) => string;
    blocks?: AppBlocks;
    components?: Record<string, (n: Resolved) => HTMLElement | null>;
    css?: string[];
    theme?: Theme;
    schemes?: Record<string, Scheme>;
    store?: Store;
};
export declare function resolved(n: Layout["root"], wide: boolean): Resolved;
export type Worn = Scheme | (Pair & {
    style?: Scale;
});
export declare function mount(o: Mount): {
    close(): void;
};
export declare function adopt(o?: {
    theme?: Theme;
    store?: Store;
    blocks?: AppBlocks;
}): boolean;
