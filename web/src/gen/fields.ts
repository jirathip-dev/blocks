import type { FieldView } from "../render/field/_view.ts";
import { picker } from "../render/field/picker.ts";
import { secret } from "../render/field/secret.ts";
import { text } from "../render/field/text.ts";
import { toggle } from "../render/field/toggle.ts";
import { upload } from "../render/field/upload.ts";

export const views: Record<string, FieldView | undefined> = { picker, secret, text, toggle, upload };
