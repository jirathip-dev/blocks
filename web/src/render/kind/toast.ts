import type { Toast } from "../../gen/types.ts";
import { fallback } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { h } from "../dom.ts";

const GLYPH = new Map([
  ["ok", "✓"],
  ["warn", "!"],
  ["bad", "×"],
]);

/// A toast's tick, glyph and text, in its tone: `ok`, `warn`, `bad`, else plain.
export function line(t: Toast, cls: string): HTMLElement {
  const tone = t.tone && GLYPH.has(t.tone) ? t.tone : "";
  const glyph = h("i", "tsg", GLYPH.get(tone) ?? "");
  glyph.setAttribute("aria-hidden", "true");
  return h("div", ["tst", cls, tone].filter(Boolean).join(" "), glyph, h("span", "tsx", t.title));
}

export function toast(b: Toast, c: Ctx): HTMLElement {
  return b.title ? line(b, "inl") : fallback({ ...b, fallback: b.fallback ?? { title: "Done" } }, c);
}
