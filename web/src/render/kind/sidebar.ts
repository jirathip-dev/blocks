import { sideCount, sideIcon, sideTitle } from "../../core/kind/sidebar.ts";
import type { SideBadge, Sidebar, SideItem, SideLink } from "../../gen/types.ts";
import { linkable } from "../act.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";
import { behave } from "../../sidebar.ts";

const hidden = <E extends HTMLElement>(e: E) => (e.setAttribute("aria-hidden", "true"), e);

function badge(b: SideBadge | null | undefined): HTMLElement[] {
  if (!b) return [];
  const [shown, said] = sideCount(b);
  return [h("span", b.tone === "bad" ? "tag bad" : "tag", hidden(h("span", "", shown)), h("span", "b-sr", said))];
}

const icon = (l: SideLink | SideItem) => {
  const [g, initials] = sideIcon(l);
  return hidden(h("i", initials ? "sdi av" : "sdi", g));
};

function label(text: string): HTMLElement {
  const s = h("span", "sdl", text);
  s.title = text;
  return s;
}

function link(l: SideLink | SideItem, child: boolean): HTMLElement {
  const a = linkable(l.href ?? "") ? Object.assign(el("a", "sdk"), { href: l.href ?? "" }) : el("span", "sdk");
  if (l.current) a.setAttribute("aria-current", "page");
  a.append(...(child ? [] : [icon(l)]), label(l.label), ...badge(l.badge));
  return a;
}

function button(cls: string, name: string, ...text: string[]): HTMLButtonElement {
  const b = Object.assign(h("button", cls, ...text.map((t) => h("span", "", t))), { type: "button" as const });
  b.setAttribute("aria-label", name);
  return b;
}

export function sidebar(b: Sidebar, c: Ctx): HTMLElement {
  const id = `sd-${b.id ?? "side"}`;
  const root = el("div", "sd");
  const panel = el("div", "sdp");
  panel.id = id;
  const menu = button("sdm", "menu", "≡");
  menu.setAttribute("aria-controls", id);
  const brand = b.brand ? [Object.assign(link(b.brand, false), { className: "sdk sdb" })] : [];
  const groups = b.groups.flatMap((g, gi) => {
    if (!g.links.length) return [];
    const sec = el("section", "sdgr");
    if (g.title) {
      const t = h("h3", "sdgt", g.title);
      t.id = `${id}-t${gi}`;
      sec.setAttribute("aria-labelledby", t.id);
      sec.append(t);
    }
    sec.append(h("ul", "", ...g.links.map((l, li) => h("li", "", ...(l.children ? parent(l, `${id}-g${gi}-${li}`, c) : [link(l, false)])))));
    return [sec];
  });
  panel.append(h("div", "sdh", ...brand, button("sdpin", "pin sidebar", "pin", "unpin"), button("sdx", "close menu", "×")), h("div", "sdg", ...(groups.length ? groups : [h("p", "empty", b.empty ?? "No pages yet")])));
  if (b.footer?.length) panel.append(h("div", "sdf", h("ul", "", ...b.footer.map((l) => h("li", "", link(l, false))))));
  root.append(menu, h("span", "sdn", sideTitle(b)), hidden(el("div", "sdscrim")), hidden(el("div", "sdedge")), panel);
  behave(root, `sidebar-pin:${b.id ?? "side"}`, c.store, c.open);
  return root;
}

function parent(l: SideItem, id: string, c: Ctx): HTMLElement[] {
  const kids = l.children ?? [];
  const key = `sidebar:${id}`;
  const inner = kids.some((k) => k.current);
  const btn = Object.assign(h("button", inner ? "sdk in" : "sdk", icon(l), label(l.label), ...badge(l.badge), hidden(h("i", "sdc", "▸"))), { type: "button" as const });
  btn.setAttribute("aria-controls", id);
  const sub = h("ul", "sdsub", ...kids.map((k) => h("li", "", link(k, true))));
  sub.id = id;
  const open = (l.open === true || inner) !== c.open.has(key);
  btn.setAttribute("aria-expanded", String(open));
  sub.hidden = !open;
  return [btn, sub];
}
