import { type Blk, blks, btn, type Ctx, el, isList } from "./index.ts";

export function chips(b: Blk, c: Ctx): HTMLElement {
  const s = el("div", "chips");
  const sel = isList(b.selected) ? b.selected : [];
  for (const o of blks(b.options)) {
    const x = btn(o.label, sel.includes(o.value) ? "on" : "");
    x.setAttribute("aria-pressed", String(sel.includes(o.value)));
    x.onclick = () => {
      const next = !b.multi || o.value === "all" ? [o.value] : sel.includes(o.value) ? sel.filter((v) => v !== o.value) : [...sel.filter((v) => v !== "all"), o.value];
      c.act({ action: b.action, block: b.id, values: { [String(b.name)]: next.length ? next : ["all"] } }, x);
    };
    s.append(x);
  }
  return s;
}
