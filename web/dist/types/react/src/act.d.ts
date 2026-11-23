import { type ReactNode } from "react";
import { type Action, type Built, type Confirm, type Fault, type Lit, type Locale, type OnFile, type Seek, type State, type Tap, type View } from "../../src/core/index.ts";
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
    block?: string | null | undefined;
    values?: Record<string, unknown> | null | undefined;
    confirm?: Confirm | null | undefined;
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
    locale: Locale;
    v: View;
    state: State;
    edits: State;
    put: (key: string, to: Lit | undefined) => void;
    busy: ReadonlySet<string>;
    act: (a: Post) => Promise<boolean>;
    tap: (t: Tap) => void;
    report: (r: Report) => void;
    kinds: Record<string, (p: KindProps) => ReactNode>;
    islands: Islands;
    file?: OnFile | undefined;
    seek: Record<string, Seek>;
};
export type Props = {
    onAction: (a: Action) => Promise<boolean | void> | boolean | void;
    onOpen?: (go: Go) => void;
    kinds?: Record<string, (p: KindProps) => ReactNode>;
    islands?: Islands;
    onReport?: (r: Report) => void;
    onFile?: OnFile;
};
export declare const Cx: import("react").Context<Ctx>;
export declare function useCx(p: Props, screen: Built): {
    cx: Ctx;
    ask: ReactNode;
};
