import type { Nav, NavLink } from "../gen/types.ts";
import { el, h, linkable } from "./index.ts";

const link = (l: NavLink, cls = "") => {
  const a = linkable(l.href) ? Object.assign(h("a", cls, l.label), { href: l.href }) : h("span", cls, l.label);
  if (l.current) a.setAttribute("aria-current", "page");
  return a;
};

export function nav(b: Nav): HTMLElement {
  const n = el("nav", "nav");
  if (b.brand) n.append(link(b.brand, "brand"));
  n.append(...b.links.map((l) => link(l)));
  return n;
}
