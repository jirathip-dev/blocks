import type { Row } from "../gen/types.ts";
import { btn, type Ctx, el, h, href, ticked, toggle, tone, urlOf } from "./index.ts";

export function row(b: Row, c: Ctx): HTMLElement {
  const cls = `row${b.style === "link" ? " link" : ""}${b.sticky ? " sticky" : ""}${b.indent ? " in" + Math.min(b.indent, 3) : ""}`;
  const url = urlOf(b.tap);
  const r: HTMLElement = url ? href(el("a", cls), url) : el("div", cls);
  r.dataset.id = b.id ?? "";
  const sub = b.subtitle == null ? null : tone(b.subtitle);
  const badge = b.badge == null ? null : tone(b.badge);
  const fig = b.figure ? c.theme.figure(b.figure) : null;
  if (fig instanceof Element) fig.classList.add("b-row__figure");
  const main = h("span", "rm", h("span", "rt b-row__title", b.title ?? ""));
  if (badge) main.append(" ", h("span", `tag b-row__badge ${badge.tone ?? ""}`, badge.text));
  if (sub) main.append(h("span", `rs b-row__subtitle ${sub.tone ?? ""}`, ticked(sub.text)));
  r.replaceChildren(...(fig ? [fig] : []), main, ...(b.value != null ? [h("span", "rv b-row__value", ticked(b.value))] : []));
  const swipe = b.swipe ?? [];
  if (url) r.classList.add("tap");
  else if (b.tap || swipe.length) {
    r.classList.add("tap");
    r.tabIndex = 0;
    r.setAttribute("role", "button");
    r.onclick = () => (b.tap ? c.tap(b.tap) : toggle(r, b.id, c));
  }
  if (!swipe.length) return r;
  const w = el("div", "rw");
  w.append(r);
  const bar = el("div", "ra b-row__actions");
  bar.hidden = !c.open.has(`sw:${b.id}`);
  for (const s of swipe) {
    const x = btn(s.label, s.tone === "bad" ? "bad" : "");
    x.onclick = () => c.act({ action: s.action, block: b.id, values: s.values ?? {}, confirm: s.confirm }, x);
    bar.append(x);
  }
  w.append(bar);
  let x0 = 0;
  r.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  r.addEventListener("touchend", (e) => x0 - e.changedTouches[0].clientX > 40 && bar.hidden && toggle(r, b.id, c), { passive: true });
  return w;
}
