import type { ReactNode } from "react";
import { linkable, type Part, type Prose, type Span } from "../../../src/core/index.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const MARKS = [["code", "code"], ["i", "italic"], ["b", "bold"]] as const;

const spans = (ss: Span[]): ReactNode[] =>
  ss.map((s) => {
    let n: ReactNode = s.text;
    for (const [tag, k] of MARKS) if (s[k]) n = h(tag, "", null, n);
    return s.link != null && linkable(s.link) ? h("a", "", { href: s.link }, n) : n;
  });

function part(p: Part): ReactNode {
  switch (p.part) {
    case "heading":
      return h(`h${Math.min(6, Math.max(1, p.level))}`, "", null, ...spans(p.spans));
    case "para":
      return h("p", "", null, ...spans(p.spans));
    case "quote":
      return h("blockquote", "", null, ...spans(p.spans));
    case "list":
      return h(p.ordered ? "ol" : "ul", "", null, ...p.items.map((i) => h("li", "", null, ...spans(i))));
    case "code":
      return h("pre", "", null, h("code", p.lang != null ? `lang-${p.lang}` : "", null, p.text));
    case "rule":
      return h("hr", "", null);
  }
}

export function prose({ b, hooks }: V<Prose>) {
  return h("div", "prose", hooks, ...b.parts.map(part));
}
