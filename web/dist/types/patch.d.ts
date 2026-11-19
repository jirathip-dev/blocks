import type { Block, Op } from "./gen/types.ts";
export type Draw = (block: Block) => HTMLElement | null;
export declare function apply(screen: Block, ops: Op[]): Block | undefined;
export declare function patcher(o: {
    root: HTMLElement;
    model: () => Block;
    draw: Draw;
    saved?: () => void;
}): {
    queue(next: Op[]): void;
    flush: () => void;
    drop(): void;
};
