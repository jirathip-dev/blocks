import { hooks, roles } from "../gen/hooks.ts";
import type { Fallback, Kind } from "../gen/types.ts";
import { type Blk, blks, isBlk, named } from "../core/tree.ts";
import { type Of, R } from "../gen/kinds.ts";
import type { Ctx } from "./ctx.ts";
import { el } from "./dom.ts";
import { row } from "./kind/row.ts";

const isFallback = (v: unknown): v is Fallback => isBlk(v);

export function fallback(b: Blk, c: Ctx): HTMLElement {
  const box = el("div");
  box.dataset.fallback = "";
  const f = b.fallback ?? { title: b.type };
  if (isFallback(f) && f.title != null) box.append(row({ title: f.title, subtitle: f.subtitle, tap: f.tap }, c));
  box.append(...kids(b.blocks, c));
  return box;
}

const core = (b: Blk): b is Of<Kind> => Object.prototype.hasOwnProperty.call(hooks, String(b.type));
const view = <K extends Kind>(t: K, b: Of<K>, c: Ctx) => R[t](b, c);

/// A block as DOM with its hooks: its kind's view, the app's, else its fallback and then its children.
export function render(b: Blk, c: Ctx): HTMLElement | null {
  const t = String(b.type);
  const own = core(b);
  const e = own ? view(b.type, b, c) : (c.apps?.[t] ?? fallback)(b, c);
  if (!e) return null;
  e.classList.add("b", ...(own ? [] : ["b-app"]), `b-${t}`);
  e.dataset.block = t;
  if (b.id != null) e.dataset.id = String(b.id);
  const v = own ? hooks[b.type].variant : null;
  if (v && b[v] != null) e.dataset.variant = String(b[v]);
  if (typeof b.tone === "string") e.dataset.tone = b.tone;
  const native = e.tagName === "BUTTON" ? "button" : e.tagName === "A" && e.hasAttribute("href") ? "link" : null;
  e.setAttribute("role", e.getAttribute("role") ?? native ?? roles[t] ?? "group");
  e.setAttribute("aria-label", named(b, t));
  return e;
}

export function kids(bs: unknown, c: Ctx): HTMLElement[] {
  return blks(bs)
    .map((b) => render(b, c))
    .filter((e): e is HTMLElement => e !== null);
}
