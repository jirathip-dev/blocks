import { defaultPair, type Scheme } from "../gen/schemes.ts";
import { decode, encode } from "../core/code.ts";
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

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/// The page's look style and how to wear one of `schemes` by name or a look code, kept in `keep` when given; none wears `own look`.
export function wearer(schemes: Record<string, Worn>, theme: Theme, own: Element | null = null, ownLook: string | null = null) {
  const look = el("style");
  look.id = "b-look";
  document.head.append(look);
  const base = own?.textContent ?? "";
  let worn = "";
  const coded = (code: string) => {
    try {
      const { style, scheme } = decode(code);
      const w = scheme !== null && has(schemes, scheme) ? schemes[scheme] : undefined;
      const pair = w && !("tokens" in w) ? w : defaultPair;
      return { light: pair.light, dark: pair.dark, style, name: w && scheme !== null ? scheme : "default" };
    } catch {
      return null;
    }
  };
  const codeOf = (name: string, w: Worn) => {
    try {
      return "tokens" in w || !w.style ? "" : encode(w.style, name === "default" ? null : name);
    } catch {
      return "";
    }
  };
  const wear = (name: string | null, keep?: Store) => {
    keep?.put("b:look", name);
    const pick = name ?? ownLook;
    const dark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
    const named = pick !== null && has(schemes, pick) ? schemes[pick] : undefined;
    const c = !named && pick !== null ? coded(pick) : null;
    const w = named ?? c;
    if (own) own.textContent = w && !("tokens" in w) ? "" : base;
    look.textContent = tiles + (!w ? (pick ? theme.css(choose(pick, dark)) : "") : "tokens" in w ? theme.css(w) : theme.css(w, w.style));
    worn = c && pick ? pick : named && pick ? codeOf(pick, named) : "";
    const at = document.documentElement;
    if (w && pick) at.dataset["look"] = c ? c.name : pick;
    else at.removeAttribute("data-look");
    if (c) at.dataset["shared"] = "";
    else at.removeAttribute("data-shared");
  };
  const named = (code: string) => Object.entries(schemes).find(([n, w]) => codeOf(n, w) === code)?.[0] ?? null;
  return { look, wear, code: () => worn, named };
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
