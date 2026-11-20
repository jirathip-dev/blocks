import type { Diff } from "../../gen/types.ts";
import { fallback } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";

const mark = (line: string) => (line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx");

export function diff(b: Diff, c: Ctx): HTMLElement {
  if (typeof b.file !== "string" || !Array.isArray(b.hunks)) return fallback(b, c);
  const root = h("div", "df", h("div", "dfh", h("span", "dff", b.file), ...(b.summary != null ? [h("span", "dfs", b.summary)] : [])));
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", b.file);
  if (!b.hunks.length) return root;
  const box = el("div", "dfb");
  for (const k of b.hunks) box.append(h("div", "dfk", k.at), ...k.lines.map((l) => h("div", `dfl ${mark(l)}`, h("i", "dfm", l.slice(0, 1) || " "), l.slice(1))));
  root.append(box);
  return root;
}
