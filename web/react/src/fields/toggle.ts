import { createElement } from "react";
import type { ToggleField } from "../../../src/core/index.ts";
import type { FieldView } from "./_view.ts";

export const toggle: FieldView<ToggleField> = {
  row: " tg",
  draw: (x, c, attrs) => createElement("input", { ...attrs, type: "checkbox", role: x.as === "check" ? undefined : "switch", checked: !!c.value, onChange: (e: { target: { checked: boolean } }) => c.put(e.target.checked) }),
  sent: (_x, v) => !!v,
};
