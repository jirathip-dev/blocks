import type { Act, Tap } from "../gen/types.ts";
import { linkable } from "../core/check.ts";
import { actionOf } from "../core/eval.ts";
import type { Ctx } from "./ctx.ts";

export { linkable };
export const urlOf = (t?: Tap | null): string | undefined => (t?.url != null && linkable(t.url) ? t.url : undefined);
/// The action a tap sends: the tap's own when it goes nowhere else, else `action`.
export const sends = (t?: Tap | null, action?: unknown): unknown => (t ? (t.url != null || t.open != null || t.sheet != null ? null : t.action) : action);
/// Marks `e` with the action a tap on it sends, as `data-action`.
export const acts = <E extends HTMLElement>(e: E, action: unknown): E => {
  if (typeof action === "string" && action) e.dataset.action = action;
  return e;
};
/// Marks an act's button with the action its `enabled` turns off, as `data-act`.
export const offable = <E extends HTMLElement>(e: E, a: Act): E => {
  const k = actionOf(a);
  if (k) e.dataset.act = k;
  return e;
};

export function toggle(e: HTMLElement, id: unknown, c: Ctx, folds = false) {
  const k = `${folds ? "" : "sw:"}${id}`;
  if (c.open.has(k)) c.open.delete(k);
  else c.open.add(k);
  if (folds) e.dispatchEvent(new CustomEvent("redraw", { bubbles: true }));
  else if (e.nextElementSibling instanceof HTMLElement) e.nextElementSibling.hidden = !c.open.has(k);
}
