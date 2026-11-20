import type { Label, Toned } from "../gen/types.ts";
import { value } from "../core/text.ts";
import { isBlk } from "../core/tree.ts";
import { el, esc, h } from "./dom.ts";

export const tone = (v: Toned): Label => (typeof v === "string" ? { text: v } : v);

export function md(s: unknown, refs = false): string {
  const link = new RegExp(String.raw`\[([^\]]+)\]\((https?:[^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)])|\b(${refs ? "t\\d+" : "(?!)"})\b`, "g");
  const a = (_: string, t: string, u: string, bare: string, ref: string) =>
    ref ? `<a href="#" data-thread="${ref}">${ref}</a>` : `<a href="${u ?? bare}" target=_blank rel=noopener>${t ?? bare}</a>`;
  return String(s ?? "")
    .split(/```(?:[a-z]*)\n?/)
    .map((part, i) =>
      i % 2
        ? `<div class=cb><pre>${esc(part.replace(/\n$/, ""))}</pre><button type=button class=cpy><span>copy</span></button></div>`
        : esc(part).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(link, a).replace(/\n/g, "<br>"),
    )
    .join("");
}

export const ticked = (v: unknown): Node | string => {
  if (isBlk(v) && typeof v["get"] === "string") {
    const s = el("span", "");
    s.dataset["get"] = v["get"];
    return s;
  }
  if (!(isBlk(v) && ("since" in v || "until" in v))) return value(v);
  const s = h("span", "", value(v));
  s.dataset["tick"] = JSON.stringify(v);
  return s;
};
/// Redraws every age under `root`; the shell calls it once a second.
export const tick = (root: ParentNode) =>
  root.querySelectorAll<HTMLElement>("[data-tick]").forEach((e) => {
    const t = value(JSON.parse(e.dataset["tick"] ?? "null"));
    if (e.textContent !== t) e.textContent = t;
  });
