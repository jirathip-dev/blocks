import { type Field, type Form } from "../../../src/core/index.ts";
import { type Ctx } from "../act.ts";
import { type V } from "../draw.ts";
type Wait = {
    up: number;
    failed: number;
};
export type Held = {
    sent: Record<string, unknown>;
    wait(name: string, w: Wait): void;
    block?: string | undefined;
};
export declare function field(x: Field, key: string, cx: Ctx, held: Held, shown?: [string, string]): import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export declare function values(fields: Field[], sent: Record<string, unknown>, cx: Ctx): Record<string, unknown>;
export declare function form({ b, hooks }: V<Form>): import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export {};
