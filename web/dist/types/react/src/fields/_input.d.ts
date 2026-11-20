import type { TextField } from "../../../src/core/index.ts";
import type { FieldCx } from "./_view.ts";
export declare function input(x: TextField, c: FieldCx, attrs: Record<string, unknown>, password: boolean, placeholder: string): import("react").ReactElement<{
    type: string;
    inputMode: string | undefined;
    value: string;
    placeholder: string;
    autoComplete: string;
    "data-was": string;
    "data-draft": string | undefined;
    onChange: (e: {
        target: {
            value: string;
        };
    }) => void;
}, string | import("react").JSXElementConstructor<any>>;
