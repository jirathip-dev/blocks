import { type Blk, btn, type Ctx, urlOf } from "./index.ts";

export function button(b: Blk, c: Ctx): HTMLElement {
  const x = btn(b.label, String(b.style ?? ""), urlOf(b.tap));
  x.dataset.id = String(b.id ?? "");
  x.onclick = () => (b.tap ? c.tap(b.tap) : c.act({ action: b.action, block: b.id, values: b.values ?? {}, confirm: b.confirm }, x));
  return x;
}
