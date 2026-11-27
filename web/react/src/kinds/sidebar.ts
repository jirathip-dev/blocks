import { useLayoutEffect, useRef } from "react";
import { linkable, type SideBadge, type Sidebar, type SideItem, type SideLink, sideCount, sideIcon, sideTitle } from "../../../src/core/index.ts";
import { behave } from "../../../src/sidebar.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const shelf = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
const kept = {
  get: (k: string) => shelf()?.getItem(k) ?? null,
  put: (k: string, v: string | null) => {
    if (v === null) shelf()?.removeItem(k);
    else shelf()?.setItem(k, v);
  },
};

const badge = (b: SideBadge | null | undefined) => {
  if (!b) return null;
  const [shown, said] = sideCount(b);
  return h("span", b.tone === "bad" ? "tag bad" : "tag", null, h("span", "", { "aria-hidden": "true" }, shown), h("span", "b-sr", null, said));
};

const icon = (l: SideLink | SideItem) => {
  const [g, initials] = sideIcon(l);
  return h("i", initials ? "sdi av" : "sdi", { "aria-hidden": "true" }, g);
};

const link = (l: SideLink | SideItem, child: boolean, cls = "sdk") =>
  h(
    linkable(l.href ?? "") ? "a" : "span",
    cls,
    { href: linkable(l.href ?? "") ? (l.href ?? undefined) : undefined, "aria-current": l.current ? "page" : undefined },
    child ? null : icon(l),
    h("span", "sdl", { title: l.label }, l.label),
    badge(l.badge),
  );

function parent(l: SideItem, id: string) {
  const kids = l.children ?? [];
  const inner = kids.some((k) => k.current);
  const open = l.open === true || inner;
  return [
    h("button", inner ? "sdk in" : "sdk", { key: "b", type: "button", "aria-controls": id, "aria-expanded": String(open) }, icon(l), h("span", "sdl", { title: l.label }, l.label), badge(l.badge), h("i", "sdc", { "aria-hidden": "true" }, "▸")),
    h("ul", "sdsub", { key: "u", id, hidden: !open || undefined }, ...kids.map((k) => h("li", "", null, link(k, true)))),
  ];
}

const button = (cls: string, name: string, ...text: string[]) => h("button", cls, { type: "button", "aria-label": name }, ...text.map((t) => h("span", "", null, t)));

export function sidebar({ b, hooks }: V<Sidebar>) {
  const ref = useRef<HTMLDivElement>(null);
  const id = `sd-${b.id ?? "side"}`;
  useLayoutEffect(() => (ref.current ? behave(ref.current, `sidebar-pin:${b.id ?? "side"}`, kept) : undefined), [b]);
  const groups = b.groups.flatMap((g, gi) =>
    g.links.length
      ? [
          h(
            "section",
            "sdgr",
            { "aria-labelledby": g.title ? `${id}-t${gi}` : undefined },
            g.title ? h("h3", "sdgt", { id: `${id}-t${gi}` }, g.title) : null,
            h("ul", "", null, ...g.links.map((l, li) => h("li", "", null, ...(l.children ? parent(l, `${id}-g${gi}-${li}`) : [link(l, false)])))),
          ),
        ]
      : [],
  );
  const foot = b.footer?.length ? h("div", "sdf", null, h("ul", "", null, ...b.footer.map((l) => h("li", "", null, link(l, false))))) : null;
  return h(
    "div",
    "sd",
    { ...hooks, ref },
    h("button", "sdm", { type: "button", "aria-label": "menu", "aria-controls": id, "aria-expanded": "false" }, h("span", "", null, "≡")),
    h("span", "sdn", null, sideTitle(b)),
    h("div", "sdscrim", { "aria-hidden": "true" }),
    h("div", "sdedge", { "aria-hidden": "true" }),
    h(
      "div",
      "sdp",
      { id },
      h("div", "sdh", null, b.brand ? link(b.brand, false, "sdk sdb") : null, button("sdpin", "pin sidebar", "pin", "unpin"), button("sdx", "close menu", "×")),
      h("div", "sdg", null, ...(groups.length ? groups : [h("p", "empty", null, b.empty ?? "No pages yet")])),
      foot,
    ),
  );
}
