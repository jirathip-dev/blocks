import { useContext } from "react";
import type { Button } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { btn, sends, urlOf, type V } from "../draw.ts";

export function button({ b, hooks }: V<Button>) {
  const cx = useContext(Cx);
  const url = urlOf(b.tap);
  const go = () => (b.tap ? cx.tap(b.tap) : void cx.act({ action: b.action ?? "", block: b.id, values: b.values ?? {}, confirm: b.confirm }));
  return btn(b.label, b.style ?? "", url, sends(b.tap, b.action), { ...hooks, "data-id": b.id ?? "", onClick: url ? undefined : go }, b.id != null && cx.v.disabled.has(b.id));
}
