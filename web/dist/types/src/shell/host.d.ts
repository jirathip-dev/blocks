import type { OnFile } from "../core/field/files.ts";
import type { Block, Kind, Locale } from "../gen/types.ts";
import type { Ctx, Renderer, Store } from "../render/ctx.ts";
import type { Theme } from "../theme.ts";
export type AppBlocks = Record<string, Renderer> & {
    [K in Kind]?: never;
};
export type Own = {
    theme: Theme;
    store: Store;
    apps?: AppBlocks | undefined;
    file?: OnFile | undefined;
};
export type Screen = {
    screen: () => string;
    locale?: () => Locale | undefined;
    act: Ctx["act"];
    tap: Ctx["tap"];
};
export type Host = ReturnType<typeof host>;
export declare function host(own: Own, s: Screen): {
    open: Set<string>;
    ctx: () => Ctx;
    draw: (b: Block) => HTMLElement | null;
    patch: (root: HTMLElement, model: () => Block, saved?: () => void) => {
        queue(next: import("../gen/types.ts").Op[]): void;
        flush: () => void;
        drop(): void;
    };
};
