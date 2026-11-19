import type { Toast } from "./gen/types.ts";
export type Undo = (b: HTMLElement) => Promise<boolean>;
export declare function toasts(): {
    box: HTMLElement;
    say(t: Toast, undo?: Undo, first?: boolean): void;
    close(): void;
};
