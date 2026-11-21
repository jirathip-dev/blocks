import type { Scheme } from "../gen/schemes.ts";
import { choose, type Pair, type Scale } from "../core/look.ts";
import type { Store } from "../render/ctx.ts";
import { el, h } from "../render/dom.ts";
import { type Theme, tiles } from "../theme.ts";

/// A look on offer: one scheme, or a light and dark pair with the style it wears.
export type Worn = Scheme | (Pair & { style?: Scale });

/// A tappable row of a sheet's list, ticked when `on`.
export const row = (label: string, f: () => void, on = false) => {
  const r = h("div", `row tap${on ? " on" : ""}`, h("span", "rm", h("span", "rt", `${on ? "✓ " : ""}${label}`)));
  r.tabIndex = 0;
  r.setAttribute("role", "button");
  r.onclick = f;
  return r;
};

/// The page's look style and how to wear one of `schemes` by name, kept in `keep` when given.
export function wearer(schemes: Record<string, Worn>, theme: Theme, own: Element | null = null) {
  const look = el("style");
  look.id = "b-look";
  document.head.append(look);
  const base = own?.textContent ?? "";
  const wear = (name: string | null, keep?: Store) => {
    keep?.put("b:look", name);
    const dark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
    const w = name !== null && Object.prototype.hasOwnProperty.call(schemes, name) ? schemes[name] : undefined;
    if (own) own.textContent = w && !("tokens" in w) ? "" : base;
    look.textContent = tiles + (!w ? (name ? theme.css(choose(name, dark)) : "") : "tokens" in w ? theme.css(w) : theme.css(w, w.style));
    if (w && name) document.documentElement.dataset["look"] = name;
    else document.documentElement.removeAttribute("data-look");
  };
  return { look, wear };
}

/// The list of looks to pick from, the worn one ticked; a pick wears it and calls `again`.
export function looks(schemes: Record<string, Worn>, store: Store, wear: (name: string | null, keep?: Store) => void, again: () => void): HTMLElement {
  const now = store.get("b:look");
  const pick = (name: string | null) => () => {
    wear(name, store);
    again();
  };
  const rows = Object.entries(schemes).map(([name, s]) => row("tokens" in s ? s.label : name, pick(name), name === now));
  return h("div", "list", row("the app's own", pick(null), !now), ...rows);
}
