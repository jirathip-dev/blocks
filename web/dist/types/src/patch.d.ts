import type { Append } from "./core/kind/prose.ts";
import type { Block, Op } from "./gen/types.ts";
export type Draw = (block: Block) => HTMLElement | null;
export type Grow = (el: HTMLElement, op: Append) => boolean;
export type Sync = (el: HTMLElement, block: Block) => boolean;
export declare function patcher(o: {
    root: HTMLElement;
    model: () => Block;
    draw: Draw;
    grow?: Grow;
    sync?: Record<string, Sync>;
    saved?: () => void;
}): {
    queue(next: Op[]): void;
    flush: () => void;
    drop(): void;
};
