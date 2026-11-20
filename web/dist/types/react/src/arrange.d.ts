import { type ReactNode } from "react";
import { type Editing, type Placed } from "../../src/edits.ts";
import type { SizeClass } from "../../src/gen/layout.ts";
export type ArrangeProps = {
    tree: Placed;
    size: SizeClass;
    edit: Editing;
    onDone?: () => void;
};
export declare function Arrange(p: ArrangeProps): ReactNode;
