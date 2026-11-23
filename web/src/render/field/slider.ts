import { along, reads } from "../../core/field/slider.ts";
import type { Field } from "../../gen/types.ts";
import { draft } from "../ctx.ts";
import { el, h } from "../dom.ts";
import type { FieldView } from "./_view.ts";

export const slider: FieldView<Extract<Field, { type: "slider" }>> = {
  row: " sl",
  group: true,
  draw(x, c) {
    const box = el("div", "fs");
    box.dataset["field"] = x.name;
    const v = el("output", "fsv");
    const parts = [v, h("span", "fst", el("b")), el("span", "fsb"), h("span", "fse", h("span", "", reads(x, x.min)), h("span", "", reads(x, x.max)))];
    for (const p of parts) p.setAttribute("aria-hidden", "true");
    const now = String(x.value ?? x.min);
    const i = Object.assign(el("input"), { type: "range", name: x.name, min: String(x.min), max: String(x.max), step: String(x.step ?? 1), value: now });
    i.setAttribute("aria-label", x.label ?? x.name);
    if (x.error) i.setAttribute("aria-invalid", "true");
    i.dataset["was"] = now;
    draft(i, c.key + x.name, c.store);
    const paint = () => {
      box.setAttribute("style", `--v:${along(x, Number(i.value))}`);
      v.textContent = reads(x, Number(i.value));
      i.setAttribute("aria-valuetext", v.textContent);
    };
    i.addEventListener("input", paint);
    i.onchange = () => {
      i.dataset["was"] = i.value;
      c.set?.(Number(i.value));
    };
    paint();
    box.append(i, ...parts, ...(x.error ? [h("span", "fe", x.error)] : []));
    return { el: box, sent: () => Number(i.value) };
  },
};
