import type { PickerField } from "../../gen/types.ts";
import { el } from "../index.ts";
import type { FieldView } from "./_view.ts";

export const picker: FieldView<PickerField> = {
  draw(x, c) {
    const s = el("select");
    const opts = [...new Set([x.value, ...(x.options ?? [])].filter((o) => o != null && o !== "").map(String))];
    for (const o of opts) s.append(Object.assign(el("option"), { value: o, textContent: o, selected: o === String(x.value) }));
    if (c.set) s.onchange = () => c.set?.(s.value);
    return { el: s, sent: () => s.value };
  },
};
