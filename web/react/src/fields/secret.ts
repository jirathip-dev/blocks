import type { SecretField } from "../../../src/core/index.ts";
import { input } from "./_input.ts";
import { type FieldView, word } from "./_view.ts";

export const secret: FieldView<Omit<SecretField, "value">> = {
  draw: (x, c, attrs) => input({ name: x.name }, c, attrs, true, x.set ? word(c, "set") : (x.placeholder ?? word(c, "unset"))),
  sent: (_x, v) => (v === "" || v == null ? undefined : v),
};
