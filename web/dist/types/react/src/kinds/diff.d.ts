import type { Diff } from "../../../src/core/index.ts";
import type { V } from "../draw.ts";
export declare function diff({ b, hooks }: V<Diff>): import("react").FunctionComponentElement<{
    b: import("../block.ts").Blk;
}> | import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
