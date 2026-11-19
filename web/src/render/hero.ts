import type { Hero } from "../gen/types.ts";
import { btn, type Ctx, h, sends, urlOf } from "./index.ts";
import { figure } from "./media.ts";

export function hero(b: Hero, c: Ctx): HTMLElement {
  const x = h("header", "hero", h("h1", "b-hero__title", b.title));
  if (b.subtitle) x.append(h("p", "b-hero__subtitle", b.subtitle));
  if (b.media) x.append(figure(b.media));
  const acts = (b.actions ?? []).map((a) => {
    const m = btn(a.label, "primary", urlOf(a.tap), sends(a.tap, a.action));
    m.onclick = () => (a.tap ? c.tap(a.tap) : c.act({ action: a.action, block: b.id, values: a.values ?? {}, confirm: a.confirm }, m));
    return m;
  });
  if (acts.length) x.append(h("div", "bar b-hero__actions", ...acts));
  return x;
}
