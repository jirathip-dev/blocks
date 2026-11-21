import type { LayoutEdit, LayoutPlace, SizeClass } from "./gen/layout.ts";
import { type Tree } from "./core/layout.ts";
export type Editing = {
    slots: Record<string, string[]>;
    save: (e: LayoutEdit) => Promise<boolean | string>;
};
export type Placed = Omit<Tree, "slots"> & {
    label?: string;
    place: LayoutPlace;
    slots?: Record<string, Placed[]>;
};
export declare const rows: (tree: Placed) => {
    id: string;
    depth: number;
    label: string;
    places: LayoutPlace[];
}[];
export declare function wire(list: HTMLElement, tree: Placed, size: SizeClass, o: Editing, refuse: (why: string) => void, done: () => void): () => void;
