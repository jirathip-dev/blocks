import { useContext } from "react";
import type { Chips } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { h } from "../h.ts";

export function chips({ b, hooks }: V<Chips>) {
  const cx = useContext(Cx);
  const sel = b.selected ?? [];
  const pick = (v: string) => {
    const next = !b.multi || v === "all" ? [v] : sel.includes(v) ? sel.filter((x) => x !== v) : [...sel.filter((x) => x !== "all"), v];
    void cx.act({ action: b.action ?? "", block: b.id, values: { [b.name]: next.length ? next : ["all"] } });
  };
  const chip = (o: Chips["options"][number]) => btn(o.label, sel.includes(o.value) ? "on" : "", undefined, b.action, { key: o.value, "aria-pressed": String(sel.includes(o.value)), onClick: () => pick(o.value) });
  return h("div", "chips", hooks, ...b.options.map(chip));
}
