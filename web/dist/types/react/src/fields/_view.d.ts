import type { ReactNode } from "react";
import type { Field, Lit, Locale } from "../../../src/core/index.ts";
export type FieldCx = {
    locale: Locale;
    key: string;
    value: Lit;
    put(value: Lit): void;
};
export type FieldView<F = Field> = {
    row?: string;
    draw(field: F, c: FieldCx, attrs: Record<string, unknown>): ReactNode;
    sent?(field: F, value: Lit): unknown;
};
export declare const word: (c: {
    locale: Locale;
}, key: string) => string;
