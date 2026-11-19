import { type Blk, blks, el, h, isBlk } from "./index.ts";

const link = (l: Blk, cls = "") => {
  const a = Object.assign(h("a", cls, String(l.label ?? "")), { href: String(l.href ?? "") });
  if (l.current) a.setAttribute("aria-current", "page");
  return a;
};

export function nav(b: Blk): HTMLElement {
  const n = el("nav", "nav");
  if (isBlk(b.brand)) n.append(link(b.brand, "brand"));
  n.append(...blks(b.links).map((l) => link(l)));
  return n;
}
