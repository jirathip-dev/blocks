import type { Part, Prose, Span } from "../gen/types.ts";
import { el, h } from "./index.ts";

const MARKS = [["code", "code"], ["i", "italic"], ["b", "bold"]] as const;
const HEADS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

const spans = (ss: Span[]): Node[] =>
  ss.map((s) => {
    let n: Node = document.createTextNode(s.text);
    for (const [tag, k] of MARKS) if (s[k]) n = h(tag, "", n);
    return s.link != null ? Object.assign(h("a", "", n), { href: s.link }) : n;
  });

function part(p: Part): HTMLElement {
  switch (p.part) {
    case "heading":
      return h(HEADS[Math.min(6, Math.max(1, p.level)) - 1] ?? "h2", "", ...spans(p.spans));
    case "para":
      return h("p", "", ...spans(p.spans));
    case "quote":
      return h("blockquote", "", ...spans(p.spans));
    case "list":
      return h(p.ordered ? "ol" : "ul", "", ...p.items.map((i) => h("li", "", ...spans(i))));
    case "code":
      return h("pre", "", h("code", p.lang != null ? `lang-${p.lang}` : "", p.text));
    case "rule":
      return el("hr");
  }
}

export function prose(b: Prose): HTMLElement {
  return h("div", "prose", ...b.parts.map(part));
}
