import { createElement } from "react";
import type { TextField } from "../../../src/core/index.ts";
import type { FieldCx } from "./_view.ts";

/// A one-line input; a secret and any type this adapter has no view for draw one too.
export function input(x: TextField, c: FieldCx, attrs: Record<string, unknown>, password: boolean, placeholder: string) {
  const kb = x.keyboard ?? "default";
  const was = password ? "" : String(x.value ?? "");
  const own = { type: password ? "password" : kb === "url" ? "url" : "text", inputMode: kb === "default" ? undefined : kb === "number" ? "decimal" : "url" };
  const draft = password ? undefined : c.key + x.name;
  const value = c.value == null ? "" : String(c.value);
  return createElement("input", { ...attrs, ...own, value, placeholder, autoComplete: "off", "data-was": was, "data-draft": draft, onChange: (e: { target: { value: string } }) => c.put(e.target.value) });
}
