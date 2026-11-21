import type { Block, Kind } from "./types.ts";
import type { Ctx } from "../render/ctx.ts";
import { button } from "../render/kind/button.ts";
import { card } from "../render/kind/card.ts";
import { chart } from "../render/kind/chart.ts";
import { chips } from "../render/kind/chips.ts";
import { choice } from "../render/kind/choice.ts";
import { composer } from "../render/kind/composer.ts";
import { config } from "../render/kind/config.ts";
import { diagram } from "../render/kind/diagram.ts";
import { diff } from "../render/kind/diff.ts";
import { editor } from "../render/kind/editor.ts";
import { form } from "../render/kind/form.ts";
import { hero } from "../render/kind/hero.ts";
import { images } from "../render/kind/images.ts";
import { import_ } from "../render/kind/import.ts";
import { island } from "../render/kind/island.ts";
import { lines } from "../render/kind/lines.ts";
import { list } from "../render/kind/list.ts";
import { media } from "../render/kind/media.ts";
import { message } from "../render/kind/message.ts";
import { modal } from "../render/kind/modal.ts";
import { nav } from "../render/kind/nav.ts";
import { pages } from "../render/kind/pages.ts";
import { prose } from "../render/kind/prose.ts";
import { row } from "../render/kind/row.ts";
import { run } from "../render/kind/run.ts";
import { scene } from "../render/kind/scene.ts";
import { screen } from "../render/kind/screen.ts";
import { secret } from "../render/kind/secret.ts";
import { section } from "../render/kind/section.ts";
import { sheet } from "../render/kind/sheet.ts";
import { sidebar } from "../render/kind/sidebar.ts";
import { stat } from "../render/kind/stat.ts";
import { steps } from "../render/kind/steps.ts";
import { table } from "../render/kind/table.ts";
import { text } from "../render/kind/text.ts";
import { timeline } from "../render/kind/timeline.ts";
import { toast } from "../render/kind/toast.ts";
import { tool } from "../render/kind/tool.ts";
import { web } from "../render/kind/web.ts";

export type Of<K extends Kind> = Extract<Block, { type: K }>;

export const R: { [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null } = {
  screen,
  modal,
  sheet,
  section,
  list,
  row,
  card,
  choice,
  form,
  config,
  secret,
  run,
  button,
  chips,
  stat,
  text,
  images,
  web,
  diff,
  editor,
  scene,
  diagram,
  composer,
  lines,
  prose,
  hero,
  media,
  nav,
  island,
  table,
  steps,
  chart,
  toast,
  pages,
  timeline,
  import: import_,
  message,
  tool,
  sidebar,
};

export const native: readonly Kind[] = ["screen", "modal", "sheet", "section", "list", "row", "card", "choice", "form", "config", "secret", "run", "button", "chips", "stat", "text", "images", "web", "diff", "editor", "scene", "diagram", "composer", "lines", "prose", "hero", "media", "nav", "table", "steps", "chart", "toast", "pages", "timeline", "import", "message", "tool", "sidebar"];
