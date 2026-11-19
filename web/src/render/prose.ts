import { type Blk, blks, el, h, isList } from "./index.ts";

const MARKS = [["code", "code"], ["i", "italic"], ["b", "bold"]] as const;
const HEADS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

const spans = (ss: unknown): Node[] =>
  blks(ss).map((s) => {
    let n: Node = document.createTextNode(String(s.text ?? ""));
    for (const [tag, k] of MARKS) if (s[k]) n = h(tag, "", n);
    return typeof s.link === "string" ? Object.assign(h("a", "", n), { href: s.link }) : n;
  });

function part(p: Blk): HTMLElement | null {
  if (p.part === "heading") return h(HEADS[Math.min(6, Math.max(1, Number(p.level ?? 2))) - 1] ?? "h2", "", ...spans(p.spans));
  if (p.part === "para") return h("p", "", ...spans(p.spans));
  if (p.part === "quote") return h("blockquote", "", ...spans(p.spans));
  if (p.part === "list") return h(p.ordered ? "ol" : "ul", "", ...(isList(p.items) ? p.items : []).map((i) => h("li", "", ...spans(i))));
  if (p.part === "code") return h("pre", "", h("code", typeof p.lang === "string" ? `lang-${p.lang}` : "", String(p.text ?? "")));
  return p.part === "rule" ? el("hr") : null;
}

export function prose(b: Blk): HTMLElement {
  const d = el("div", "prose");
  d.append(...blks(b.parts).map(part).filter((e): e is HTMLElement => e !== null));
  return d;
}
