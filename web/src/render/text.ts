import type { Text } from "../gen/types.ts";
import { type Ctx, el, md } from "./index.ts";

export function text(b: Text, c: Ctx): HTMLElement {
  const t = el("div", "txt", md(b.markdown, c.screen.startsWith("thread-")));
  t.dataset.md = b.markdown ?? "";
  return t;
}
