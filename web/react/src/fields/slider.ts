import { createElement } from "react";
import { along, type Field, said } from "../../../src/core/index.ts";
import { h } from "../h.ts";
import type { FieldView } from "./_view.ts";

export const slider: FieldView<Extract<Field, { type: "slider" }>> = {
  row: " sl",
  group: true,
  draw(x, c, attrs) {
    const n = typeof c.value === "number" ? c.value : (x.value ?? x.min);
    const [hide, t] = [{ "aria-hidden": "true" }, said(x, n)];
    const own = { type: "range", min: x.min, max: x.max, step: x.step ?? 1, value: n, "aria-label": x.label ?? x.name, "aria-valuetext": t, "data-was": String(x.value ?? x.min), "data-draft": c.key + x.name };
    const i = createElement("input", { ...attrs, ...own, onChange: (e: { target: { valueAsNumber: number } }) => c.put(e.target.valueAsNumber) });
    const ends = h("span", "fse", hide, h("span", "", null, said(x, x.min)), h("span", "", null, said(x, x.max)));
    return h("div", "fs", { "data-field": x.name, "aria-invalid": attrs["aria-invalid"], style: { "--v": along(x, n) } }, i, h("output", "fsv", hide, t), h("span", "fst", hide, h("b", "", null)), h("span", "fsb", hide), ends, x.error ? h("span", "fe", null, x.error) : null);
  },
  sent: (x, v) => (typeof v === "number" ? v : (x.value ?? x.min)),
};
