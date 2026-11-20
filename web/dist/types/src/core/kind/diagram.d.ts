type Blk = Record<string, unknown>;
type Box = {
    x: number;
    y: number;
    w: number;
    h: number;
    mx: number;
    my: number;
};
export type Place = {
    id: string;
    cls: string;
    at: Box;
    name: string;
    title: string;
    aria: string;
    tap: unknown;
    timer: {
        value: string;
    } | null;
    count: {
        n: string;
        note: {
            cls: string;
            text: string;
        } | null;
    } | null;
};
export type Plan = {
    cls: string;
    width: number;
    height: number;
    dot: {
        cx: number;
        cy: number;
    } | null;
    paths: {
        d: string;
        cls: string;
    }[];
    places: Place[];
};
export declare function diagrams(b: Blk): Plan[];
export {};
