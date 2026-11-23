import type { OnFile } from "../../core/field/files.ts";
import type { Field, Locale } from "../../gen/types.ts";
import { words } from "../../gen/words.ts";
import type { Store } from "../ctx.ts";

/// What a form hands each field's view: the screen's locale, the drafts' store and key, the app's file handler, and in a live form `set` for each committed value.
export type FieldCtx = { locale: Locale; store: Store; key: string; screen: string; block?: string | undefined; file?: OnFile | undefined; set?: ((value: unknown) => unknown) | undefined };
/// What a field's view gives its form: its control, the value to send (`undefined` leaves the field out), and the files the submit waits on.
export type FieldOut = { el: HTMLElement; sent(): unknown; busy?(): { up: number; failed: number } };
/// One field type's HTML view, the class its row adds, and whether it is a group that draws its own error.
export type FieldView<F = Field> = { row?: string; group?: boolean; draw(field: F, c: FieldCtx): FieldOut };

/// The field word `key` in the screen's language: Thai for `th`, else English.
export const word = (c: FieldCtx, key: string): string => words[key]?.[c.locale.lang === "th" ? 1 : 0] ?? "";
