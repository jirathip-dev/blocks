import type { FieldView } from "../fields/_view.ts";
import { picker } from "../fields/picker.ts";
import { scan } from "../fields/scan.ts";
import { secret } from "../fields/secret.ts";
import { slider } from "../fields/slider.ts";
import { text } from "../fields/text.ts";
import { toggle } from "../fields/toggle.ts";
import { upload } from "../fields/upload.ts";

export const views: Record<string, FieldView | undefined> = { picker, scan, secret, slider, text, toggle, upload };
