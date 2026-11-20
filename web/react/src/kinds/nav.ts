import { linkable, type Nav, type NavLink } from "../../../src/core/index.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const link = (l: NavLink, cls = "") => h(linkable(l.href) ? "a" : "span", cls, { href: linkable(l.href) ? l.href : undefined, "aria-current": l.current ? "page" : undefined }, l.label);

export function nav({ b, hooks }: V<Nav>) {
  return h("nav", "nav", hooks, b.brand ? link(b.brand, "brand") : null, ...b.links.map((l) => link(l)));
}
