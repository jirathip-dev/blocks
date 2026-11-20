import type { SizeClass } from "./gen/layout.ts";
import { type Editing, type Placed } from "./edits.ts";
export type { Editing } from "./edits.ts";
export declare function editor(o: Editing, root: HTMLElement): {
    tab: HTMLElement;
    sheet: HTMLElement;
    draw(tree: Placed, size: SizeClass): void;
};
