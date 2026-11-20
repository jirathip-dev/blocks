import type { ReactNode } from "react";
import type { Field, Lit, Locale } from "../../../src/core/index.ts";
import { words } from "../../../src/gen/words.ts";

/// What a form hands each field's view: the screen's locale, the field's draft key, its value in local state and `put` for each edit.
export type FieldCx = { locale: Locale; key: string; value: Lit; put(value: Lit): void };
/// One field type's React view: the class its row adds, its control, and the value it sends (`undefined` leaves the field out).
export type FieldView<F = Field> = { row?: string; draw(field: F, c: FieldCx, attrs: Record<string, unknown>): ReactNode; sent?(field: F, value: Lit): unknown };

/// The field word `key` in the screen's language: Thai for `th`, else English.
export const word = (c: { locale: Locale }, key: string): string => words[key]?.[c.locale.lang === "th" ? 1 : 0] ?? "";
