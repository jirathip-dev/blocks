import type { Blk } from "../core/tree.ts";
export type Sheet = ReturnType<typeof sheet>;
export declare function sheet(closed: () => void): {
    box: HTMLDivElement;
    body: HTMLDivElement;
    close: () => void;
    frame: (title: string, prev?: () => void, own?: boolean) => void;
    show: (title: string, kids: HTMLElement[], prev?: () => void) => void;
};
export declare function confirmer(): {
    box: HTMLDivElement;
    ask: (c: Blk) => Promise<boolean>;
};
