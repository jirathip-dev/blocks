import type { OnFile } from "../core/field/files.ts";
import { type Blk } from "../core/tree.ts";
import type { Held } from "../gesture.ts";
import type { Locale } from "../gen/types.ts";
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
    locale?: Locale | undefined;
    act: (a: Post, el?: HTMLElement) => Promise<boolean>;
    tap: (t: unknown) => void;
    open: Set<string>;
    theme: Theme;
    store: Store;
    apps?: Record<string, Renderer> | undefined;
    drop?: (what: string) => void;
    held?: Map<string, Held>;
    view?: Map<string, Record<string, unknown>>;
    file?: OnFile | undefined;
};
export declare const obj: (v: unknown) => Blk;
export declare const draft: (i: HTMLInputElement, key: string, store: Store) => void;
export declare const sent: (box: Element, store: Store) => void;
