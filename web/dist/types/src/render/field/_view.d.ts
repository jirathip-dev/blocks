import type { OnFile } from "../../core/field/files.ts";
import type { Field, Locale } from "../../gen/types.ts";
import type { Store } from "../ctx.ts";
export type FieldCtx = {
    locale: Locale;
    store: Store;
    key: string;
    screen: string;
    block?: string | undefined;
    file?: OnFile | undefined;
    set?: ((value: unknown) => void) | undefined;
};
export type FieldOut = {
    el: HTMLElement;
    sent(): unknown;
    busy?(): {
        up: number;
        failed: number;
    };
};
export type FieldView<F = Field> = {
    row?: string;
    group?: boolean;
    draw(field: F, c: FieldCtx): FieldOut;
};
export declare const word: (c: FieldCtx, key: string) => string;
