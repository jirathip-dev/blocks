import type { Append } from "../../core/kind/prose.ts";
import type { Part, Prose, Span } from "../../gen/types.ts";
import { linkable } from "../act.ts";
import { el, h } from "../dom.ts";

const MARKS = [["code", "code"], ["i", "italic"], ["b", "bold"]] as const;
const HEADS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

const spans = (ss: Span[]): Node[] =>
  ss.map((s) => {
    let n: Node = document.createTextNode(s.text);
    for (const [tag, k] of MARKS) if (s[k]) n = h(tag, "", n);
    return s.link != null && linkable(s.link) ? Object.assign(h("a", "", n), { href: s.link }) : n;
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
  const e = h("div", "prose", ...b.parts.map(part));
  if (b.streaming) e.setAttribute("aria-busy", "true");
  return e;
}

const last = (n: Node | null): Text | null => (n instanceof Text ? n : n?.lastChild ? last(n.lastChild) : null);

/// Grows a drawn prose `el` by an `append` in place: the parts before `keep` and every text node but the last stay; false when it cannot.
export function grow(el: HTMLElement, op: Append): boolean {
  if (op.keep != null) {
    if (op.keep > el.children.length) return false;
    while (el.children.length > op.keep) el.lastElementChild?.remove();
  }
  el.append(...(op.parts ?? []).map(part));
  const t = op.text ? last(el.lastElementChild) : null;
  if (t) t.data += op.text;
  return !op.text || t !== null;
}
