import type { LayoutEdit, LayoutPlace, SizeClass } from "./gen/layout.ts";
import { type Tree } from "./core/layout.ts";
import { type Ctx } from "./render/index.ts";
export type Editing = {
    slots: Record<string, string[]>;
    save: (e: LayoutEdit) => Promise<boolean | string>;
};
type Node = Omit<Tree, "slots"> & {
    label?: string;
    place: LayoutPlace;
    slots?: Record<string, Node[]>;
};
export declare function editor(o: Editing, c: Pick<Ctx, "theme" | "store">): {
    tab: HTMLElement;
    sheet: HTMLElement;
    draw(tree: Node, size: SizeClass): void;
};
export {};
