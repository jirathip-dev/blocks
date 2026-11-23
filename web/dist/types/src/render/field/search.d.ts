import type { SearchField } from "../../gen/types.ts";
import { type FieldView } from "./_view.ts";
export declare const search: FieldView<Omit<SearchField, "value"> & {
    value?: unknown;
}>;
