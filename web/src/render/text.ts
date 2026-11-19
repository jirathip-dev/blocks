import { type Blk, type Ctx, el, md } from "./index.ts";

export function text(b: Blk, c: Ctx): HTMLElement {
  const t = el("div", "txt", md(b.markdown, c.screen.startsWith("thread-")));
  t.dataset.md = String(b.markdown ?? "");
  return t;
}
