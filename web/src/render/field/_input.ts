import type { TextField } from "../../gen/types.ts";
import { draft } from "../ctx.ts";
import { el } from "../dom.ts";
import type { FieldCtx, FieldOut } from "./_view.ts";

/// A one-line input; a secret and any type this renderer has no view for draw one too.
export function input(x: TextField, c: FieldCtx, password: boolean, placeholder: string): FieldOut {
  const kb = x.keyboard ?? "default";
  const t = Object.assign(el("input"), {
    type: password ? "password" : kb === "url" ? "url" : "text",
    value: password ? "" : String(x.value ?? ""),
    placeholder,
    autocomplete: "off",
  });
  if (kb !== "default") t.inputMode = kb === "number" ? "decimal" : "url";
  t.dataset.was = t.value;
  if (!password) draft(t, c.key + x.name, c.store);
  if (c.set) t.onchange = () => c.set?.(t.value);
  return { el: t, sent: () => (password && !t.value ? undefined : t.value) };
}
