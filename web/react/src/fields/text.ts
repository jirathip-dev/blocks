import type { TextField } from "../../../src/core/index.ts";
import { input } from "./_input.ts";
import type { FieldView } from "./_view.ts";

export const text: FieldView<TextField> = { draw: (x, c, attrs) => input(x, c, attrs, false, x.placeholder ?? "") };
