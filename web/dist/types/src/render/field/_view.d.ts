import type { Field, Locale } from "../../gen/types.ts";
import type { Store } from "../ctx.ts";
export type FieldCtx = {
    locale: Locale;
    store: Store;
    key: string;
    set?(value: unknown): void;
};
export type FieldOut = {
    el: HTMLInputElement | HTMLSelectElement;
    sent(): unknown;
};
export type FieldView<F = Field> = {
    row?: string;
    draw(field: F, c: FieldCtx): FieldOut;
};
export declare const word: (c: FieldCtx, key: string) => string;
