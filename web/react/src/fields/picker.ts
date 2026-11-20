import { createElement } from "react";
import type { PickerField } from "../../../src/core/index.ts";
import type { FieldView } from "./_view.ts";

const opts = (x: PickerField) => [...new Set([x.value, ...(x.options ?? [])].filter((o) => o != null && o !== "").map(String))];

export const picker: FieldView<PickerField> = {
  draw: (x, c, attrs) =>
    createElement("select", { ...attrs, value: c.value == null || c.value === "" ? opts(x)[0] : String(c.value), onChange: (e: { target: { value: string } }) => c.put(e.target.value) }, ...opts(x).map((o) => createElement("option", { key: o, value: o }, o))),
  sent: (x, v) => (v == null || v === "" ? (opts(x)[0] ?? "") : v),
};
