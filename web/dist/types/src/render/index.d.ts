import type { Act, Block, Kind, Label, Locale, Tap, Toned } from "../gen/types.ts";
import { linkable } from "../core/check.ts";
import type { OnFile } from "../core/field/files.ts";
import { type Blk, blks, isBlk, named } from "../core/tree.ts";
import type { Held } from "../gesture.ts";
import type { Theme } from "../theme.ts";
export { type Blk, blks, isBlk, named };
export type { OnFile, Picked } from "../core/field/files.ts";
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
    locale?: Locale;
    act: (a: Post, el?: HTMLElement) => Promise<boolean>;
    tap: (t: unknown) => void;
    open: Set<string>;
    theme: Theme;
    store: Store;
    apps?: Record<string, Renderer>;
    drop?: (what: string) => void;
    held?: Map<string, Held>;
    view?: Map<string, Record<string, unknown>>;
    file?: OnFile;
};
export declare const obj: (v: unknown) => Blk;
export declare const esc: (s: unknown) => string;
export declare const nodes: (html: string) => ChildNode[];
export declare const el: <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) => HTMLElementTagNameMap[K];
export declare const h: <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, ...kids: (Node | string)[]) => HTMLElementTagNameMap[K];
export declare const href: (a: HTMLAnchorElement, url: string) => HTMLAnchorElement & {
    href: string;
    target: string;
    rel: string;
};
export { linkable };
export declare const urlOf: (t?: Tap | null) => string | undefined;
export declare const sends: (t?: Tap | null, action?: unknown) => unknown;
export declare const acts: <E extends HTMLElement>(e: E, action: unknown) => E;
export declare const offable: <E extends HTMLElement>(e: E, a: Act) => E;
export declare const btn: (label: unknown, cls?: string, url?: string, action?: unknown) => (HTMLAnchorElement & {
    href: string;
    target: string;
    rel: string;
}) | (HTMLButtonElement & {
    type: string;
});
export declare const tone: (v: Toned) => Label;
export declare function md(s: unknown, refs?: boolean): string;
export declare const ticked: (v: unknown) => Node | string;
export declare const tick: (root: ParentNode) => void;
export declare const draft: (i: HTMLInputElement, key: string, store: Store) => void;
export declare const sent: (box: Element, store: Store) => void;
export declare function toggle(e: HTMLElement, id: unknown, c: Ctx, folds?: boolean): void;
export declare function fallback(b: Blk, c: Ctx): HTMLElement;
export declare const gap: (_issue: number) => Renderer;
type Of<K extends Kind> = Extract<Block, {
    type: K;
}>;
export declare const R: {
    [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null;
};
export declare function render(b: Blk, c: Ctx): HTMLElement | null;
export declare function kids(bs: unknown, c: Ctx): HTMLElement[];
