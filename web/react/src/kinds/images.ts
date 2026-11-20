import { type Images, linkable } from "../../../src/core/index.ts";
import { out, type V } from "../draw.ts";
import { h } from "../h.ts";

export function images({ b, hooks }: V<Images>) {
  const item = (i: Images["items"][number], n: number) => {
    if (!linkable(i.src)) return h("span", "", { key: n }, i.alt ?? "");
    const src = i.src.replace(/^[/]/, "");
    return h("a", "", { key: n, ...out(src) }, h("img", "", { src, alt: i.alt ?? "", loading: "lazy" }));
  };
  return h("div", "imgs", hooks, ...b.items.map(item));
}
