import type { FieldView } from "../render/field/_view.ts";
import { picker } from "../render/field/picker.ts";
import { scan } from "../render/field/scan.ts";
import { secret } from "../render/field/secret.ts";
import { slider } from "../render/field/slider.ts";
import { text } from "../render/field/text.ts";
import { toggle } from "../render/field/toggle.ts";
import { upload } from "../render/field/upload.ts";

export const views: Record<string, FieldView | undefined> = { picker, scan, secret, slider, text, toggle, upload };
