import { type Blk } from "../core/tree.ts";
import type { Held } from "../gesture.ts";
import type { Theme } from "../theme.ts";
export type Post = {
    action: unknown;
    block?: unknown;
    values?: unknown;
    confirm?: unknown;
};
export type Store = {
    get(key: string): string | null;
    put(key: string, value: string | null): void;
};
export type Renderer = (b: Blk, c: Ctx) => HTMLElement | null;
export type Ctx = {
    screen: string;
    act: (a: Post, el?: HTMLElement) => Promise<boolean>;
    tap: (t: unknown) => void;
    open: Set<string>;
    theme: Theme;
    store: Store;
    apps?: Record<string, Renderer>;
    drop?: (what: string) => void;
    held?: Map<string, Held>;
};
export declare const obj: (v: unknown) => Blk;
export declare const draft: (i: HTMLInputElement, key: string, store: Store) => void;
export declare const sent: (box: Element, store: Store) => void;
