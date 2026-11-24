import type { ReactNode } from "react";
import type { Field, Lit, Locale, OnFile, Seek } from "../../../src/core/index.ts";
export type FieldCx = {
    locale: Locale;
    key: string;
    value: Lit;
    put(value: Lit): void;
    screen: string;
    block?: string | undefined;
    file?: OnFile | undefined;
    hold(sent: unknown, wait: {
        up: number;
        failed: number;
    }): void;
    send?: ((value: unknown) => unknown) | undefined;
    found?: Seek | undefined;
};
export type FieldView<F = Field> = {
    row?: string;
    group?: boolean;
    waits?: boolean;
    draw(field: F, c: FieldCx, attrs: Record<string, unknown>): ReactNode;
    sent?(field: F, value: Lit): unknown;
};
export declare const word: (c: {
    locale: Locale;
}, key: string) => string;
