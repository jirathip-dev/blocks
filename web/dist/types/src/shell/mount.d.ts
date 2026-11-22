import type { Scheme } from "../gen/schemes.ts";
import { type Editing } from "../arrange.ts";
import type { OnFile } from "../core/field/files.ts";
import { type Store } from "../render/ctx.ts";
import { type Theme } from "../theme.ts";
import { type AppBlocks } from "./host.ts";
import { type Layout, type Resolved } from "./layout.ts";
import { type Source } from "./source.ts";
type FromServers = {
    url: (source: string, path: string) => string;
    sources?: Record<string, Source>;
};
type FromTheApp = {
    url?: undefined;
    sources: Record<string, Source>;
};
export type Mount = {
    root: HTMLElement;
    layout: Layout;
    blocks?: AppBlocks;
    components?: Record<string, (n: Resolved) => HTMLElement | null>;
    css?: string[];
    theme?: Theme;
    schemes?: Record<string, Scheme>;
    store?: Store;
    edit?: Editing;
    file?: OnFile;
} & (FromServers | FromTheApp);
export declare function mount(o: Mount): {
    layout(next: Layout): void;
    close(): void;
};
export {};
