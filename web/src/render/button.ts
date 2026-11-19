import type { Button } from "../gen/types.ts";
import { btn, type Ctx, sends, urlOf } from "./index.ts";

export function button(b: Button, c: Ctx): HTMLElement {
  const x = btn(b.label, b.style ?? "", urlOf(b.tap), sends(b.tap, b.action));
  x.dataset.id = b.id ?? "";
  x.onclick = () => (b.tap ? c.tap(b.tap) : c.act({ action: b.action, block: b.id, values: b.values ?? {}, confirm: b.confirm }, x));
  return x;
}
