import type { Choice } from "../../gen/types.ts";
import { type Ctx, draft, sent } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";
import { ticked } from "../text.ts";

export function choice(b: Choice, c: Ctx): HTMLElement {
  const s = el("div", "choice as-surface");
  const opts = [...b.options].sort((x, y) => Number(y.value === b.recommended) - Number(x.value === b.recommended));
  for (const o of opts) {
    const x = btn(`${o.label}${o.value === b.recommended ? " · recommended" : ""}`, "pick", undefined, b.action);
    x.name = "choice";
    x.onclick = () => c.act({ action: b.action, block: b.id, values: { ...b.values, ...o.values, choice: o.value }, confirm: o.confirm }, x);
    s.append(x);
  }
  const dflt = b.default;
  const other = b.other;
  if (dflt) s.append(h("p", "m", ticked({ until: dflt.until, label: dflt.label })));
  if (other) {
    const f = el("form", "other");
    const i = el("input");
    Object.assign(i, { name: "other", placeholder: other.placeholder ?? "other…", autocomplete: "off" });
    draft(i, `draft:${c.screen}:${String(b.id)}:other`, c.store);
    const go = btn("send", "", undefined, b.action);
    go.type = "submit";
    f.append(i, go);
    f.onsubmit = (e) => {
      e.preventDefault();
      if (i.value.trim())
        c.act({ action: b.action, block: b.id, values: { ...b.values, choice: other.for ?? "", other: i.value } }, go).then((ok) => ok && sent(f, c.store));
    };
    s.append(f);
  }
  return s;
}
