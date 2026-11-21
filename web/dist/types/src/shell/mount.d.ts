import type { Scheme } from "../gen/schemes.ts";
import { type Editing } from "../arrange.ts";
import type { OnFile } from "../core/field/files.ts";
import { type Store } from "../render/ctx.ts";
import { type Theme } from "../theme.ts";
import { type AppBlocks } from "./host.ts";
import { type Layout, type Resolved } from "./layout.ts";
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
    edit?: Editing;
    file?: OnFile;
};
export declare function mount(o: Mount): {
    layout(next: Layout): void;
    close(): void;
};
