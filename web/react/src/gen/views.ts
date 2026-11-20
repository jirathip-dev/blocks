import type { Views } from "../block.ts";
import { button } from "../kinds/button.ts";
import { card } from "../kinds/card.ts";
import { chips } from "../kinds/chips.ts";
import { form } from "../kinds/form.ts";
import { images } from "../kinds/images.ts";
import { list } from "../kinds/list.ts";
import { row } from "../kinds/row.ts";
import { screen } from "../kinds/screen.ts";
import { section } from "../kinds/section.ts";
import { sheet } from "../kinds/sheet.ts";
import { stat } from "../kinds/stat.ts";
import { text } from "../kinds/text.ts";
import { timeline } from "../kinds/timeline.ts";

export const views: Views = { button, card, chips, form, images, list, row, screen, section, sheet, stat, text, timeline };
