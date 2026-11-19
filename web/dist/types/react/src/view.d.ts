import { type ReactNode } from "react";
import { type Built, type Kind, type Look } from "../../src/core/index.ts";
import { type KindProps, type Props } from "./act.ts";
export type AppKinds = Record<string, (p: KindProps) => ReactNode> & {
    [K in Kind]?: never;
};
export type BlocksViewProps = Props & {
    screen: Built;
    kinds?: AppKinds;
    look?: Look;
    mode?: "auto" | "light" | "dark";
};
export declare const native: readonly Kind[];
export declare function BlocksView(p: BlocksViewProps): ReactNode;
