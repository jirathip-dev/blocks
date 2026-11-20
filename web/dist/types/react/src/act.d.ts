import { type ReactNode } from "react";
import { type Action, type Built, type Confirm, type Fault, type Tap, type View } from "../../src/core/index.ts";
export type Go = {
    open: string;
} | {
    sheet: string;
} | {
    thread: string;
};
export type Report = {
    what: "fault";
    fault: Fault;
} | {
    what: "dropped";
    block: string;
    event: string;
} | {
    what: "failed";
    action: string;
    error: unknown;
} | {
    what: "threw";
    block: string;
    error: unknown;
};
export type Post = {
    action: string;
    block?: string | null;
    values?: Record<string, unknown> | null;
    confirm?: Confirm | null;
};
export type KindProps = {
    block: Record<string, unknown> & {
        type: string;
    };
    act: (a: Omit<Post, "block">) => Promise<boolean>;
};
export type IslandProps = {
    props: Record<string, unknown>;
    emit: (name: string, values?: Record<string, unknown>) => void;
};
export type Islands = Record<string, (p: IslandProps) => ReactNode>;
export type Ctx = {
    screen: string;
    v: View;
    busy: ReadonlySet<string>;
    act: (a: Post) => Promise<boolean>;
    tap: (t: Tap) => void;
    report: (r: Report) => void;
    kinds: Record<string, (p: KindProps) => ReactNode>;
    islands: Islands;
};
export type Props = {
    onAction: (a: Action) => Promise<boolean | void> | boolean | void;
    onOpen?: (go: Go) => void;
    kinds?: Record<string, (p: KindProps) => ReactNode>;
    islands?: Islands;
    onReport?: (r: Report) => void;
};
export declare const Cx: import("react").Context<Ctx>;
export declare function useCx(p: Props, screen: Built): {
    cx: Ctx;
    ask: ReactNode;
};
