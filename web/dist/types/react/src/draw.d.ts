import type { ReactNode } from "react";
import { type Act, type Figure, type Tap } from "../../src/core/index.ts";
import type { Ctx } from "./act.ts";
import { type Attrs } from "./h.ts";
export type V<T> = {
    b: T;
    hooks: Attrs;
};
export declare const urlOf: (t?: Tap | null) => string | undefined;
export declare const sends: (t?: Tap | null, action?: unknown) => string | undefined;
export declare const out: (url: string) => {
    href: string;
    target: string;
    rel: string;
};
export declare const press: (go: () => void) => {
    role: string;
    tabIndex: number;
    onClick: () => void;
    onKeyDown: (e: {
        key: string;
    }) => void | false;
};
export declare const btn: (label: unknown, cls: string, url: string | undefined, action: unknown, attrs: Attrs, off?: boolean, part?: string) => import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export declare const act: (a: Act, cls: string, cx: Ctx, url: string | undefined, go: (() => void) | undefined) => import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export declare function ticked(v: unknown, cx: Ctx): ReactNode;
export declare const figure: (f: Figure, cls: string) => import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export declare function md(s: unknown, refs: boolean): ReactNode[];
