import type { FieldView } from "../fields/_view.ts";
import { picker } from "../fields/picker.ts";
import { secret } from "../fields/secret.ts";
import { text } from "../fields/text.ts";
import { toggle } from "../fields/toggle.ts";

export const views: Record<string, FieldView | undefined> = { picker, secret, text, toggle };
