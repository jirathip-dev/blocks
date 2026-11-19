import { Component, type ReactNode } from "react";
import { type Fallback, type Kind, type Of } from "../../src/core/index.ts";
import { type Ctx } from "./act.ts";
import { type Attrs } from "./h.ts";
export type Blk = Record<string, unknown>;
export type Views = {
    [K in Kind]?: (p: {
        b: Of<K>;
        hooks: Attrs;
    }) => ReactNode;
};
export declare function hooksOf(b: Blk, cx: Ctx, fallback: boolean): Attrs;
export declare function row(f: Fallback, cx: Ctx): ReactNode;
export declare const kids: (bs: unknown) => ReactNode[];
type Caught = {
    b: Blk;
    report: Ctx["report"];
    fallback: ReactNode;
    children?: ReactNode;
};
export declare class Boundary extends Component<Caught, {
    threw: boolean;
}> {
    state: {
        threw: boolean;
    };
    static getDerivedStateFromError(): {
        threw: boolean;
    };
    componentDidCatch(error: unknown): void;
    componentDidUpdate(was: Caught): void;
    render(): ReactNode;
}
export declare const Block: import("react").MemoExoticComponent<({ b }: {
    b: Blk;
}) => ReactNode>;
export {};
