import type { SecretField } from "../../gen/types.ts";
import { word, type FieldView } from "./_view.ts";
import { input } from "./_input.ts";

export const secret: FieldView<Omit<SecretField, "value">> = { draw: (x, c) => input({ name: x.name }, c, true, x.set ? word(c, "set") : (x.placeholder ?? word(c, "unset"))) };
