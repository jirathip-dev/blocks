import type { LayoutPlace, LayoutTransition } from "../gen/layout.ts";
export type Placed<P> = {
    type: string;
    id: string;
    source?: string;
    path?: string;
    label?: string;
    place: P;
    transition: LayoutTransition;
    config?: Record<string, unknown>;
    slots?: Record<string, Placed<P>[]>;
};
export type Layout = {
    format: number;
    theme?: string;
    root: Placed<{
        compact: LayoutPlace;
        wide: LayoutPlace;
    }>;
};
export type Resolved = Placed<LayoutPlace>;
export declare const ALWAYS: LayoutPlace[];
export declare const SHEET: LayoutPlace[];
export declare function resolved(n: Layout["root"], wide: boolean): Resolved;
export declare const walk: (n: Resolved) => Resolved[];
export declare const isScreen: (n: Resolved) => n is Resolved & {
    source: string;
    path: string;
};
