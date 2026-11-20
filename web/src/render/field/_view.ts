import type { Field, Locale } from "../../gen/types.ts";
import { words } from "../../gen/words.ts";
import type { Store } from "../index.ts";

/// What a form hands each field's view: the screen's locale, the drafts' store and key, and in a live form `set` for each committed value.
export type FieldCtx = { locale: Locale; store: Store; key: string; set?(value: unknown): void };
/// What a field's view gives its form: its control, and the value to send (`undefined` leaves the field out).
export type FieldOut = { el: HTMLInputElement | HTMLSelectElement; sent(): unknown };
/// One field type's HTML view, and the class its row adds.
export type FieldView<F = Field> = { row?: string; draw(field: F, c: FieldCtx): FieldOut };

/// The field word `key` in the screen's language: Thai for `th`, else English.
export const word = (c: FieldCtx, key: string): string => words[key]?.[c.locale.lang === "th" ? 1 : 0] ?? "";
