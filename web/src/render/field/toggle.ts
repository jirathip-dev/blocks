import type { ToggleField } from "../../gen/types.ts";
import { el } from "../dom.ts";
import type { FieldView } from "./_view.ts";

export const toggle: FieldView<ToggleField> = {
  row: " tg",
  draw(x, c) {
    const i = Object.assign(el("input"), { type: "checkbox", checked: !!x.value });
    i.setAttribute("role", "switch");
    if (c.set) i.onchange = () => c.set?.(i.checked);
    return { el: i, sent: () => i.checked };
  },
};
