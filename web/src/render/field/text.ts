import type { TextField } from "../../gen/types.ts";
import { input } from "./_input.ts";
import type { FieldView } from "./_view.ts";

export const text: FieldView<TextField> = { draw: (x, c) => input(x, c, false, x.placeholder ?? "") };
