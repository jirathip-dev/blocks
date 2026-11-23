import { type SearchField } from "../../../src/core/index.ts";
import { type FieldCx, type FieldView } from "./_view.ts";
type Search = Omit<SearchField, "value"> & {
    value?: unknown;
};
declare function Search({ x, c, attrs }: {
    x: Search;
    c: FieldCx;
    attrs: Record<string, unknown>;
}): import("react").ReactElement<{
    className: string | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export declare const search: FieldView<Search>;
export {};
