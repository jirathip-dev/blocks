import type { Button } from "../../gen/types.ts";
import { sends, urlOf } from "../act.ts";
import type { Ctx } from "../ctx.ts";
import { btn } from "../dom.ts";

export function button(b: Button, c: Ctx): HTMLElement {
  const x = btn(b.label, b.style ?? "", urlOf(b.tap), sends(b.tap, b.action));
  x.dataset["id"] = b.id ?? "";
  x.firstElementChild?.classList.add("as-button-label");
  x.onclick = () => (b.tap ? c.tap(b.tap) : c.act({ action: b.action, block: b.id, values: b.values ?? {}, confirm: b.confirm }, x));
  return x;
}
