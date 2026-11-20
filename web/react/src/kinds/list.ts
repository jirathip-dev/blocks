import { useContext, useLayoutEffect, useRef } from "react";
import type { List } from "../../../src/core/index.ts";
import { list as rules } from "../../../src/core/kind/list.ts";
import { gestured } from "../../../src/gesture.ts";
import { Cx } from "../act.ts";
import { kids } from "../block.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const rec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function list({ b, hooks }: V<List>) {
  const cx = useContext(Cx);
  const ref = useRef<HTMLDivElement>(null);
  const act = useRef(cx.act);
  act.current = cx.act;
  useLayoutEffect(() => {
    const l = ref.current;
    const g = b.reorder;
    if (!l || !g) return;
    const drawn = () => Array.from(l.children).filter((e) => e instanceof HTMLElement);
    const at = (id: string) => drawn().find((e) => e.dataset.id === id);
    const show = (order: string[] | null) => {
      const d = drawn();
      const gap = d.length > 1 && d[0] && d[1] ? d[1].offsetTop - d[0].offsetTop - d[0].offsetHeight : 0;
      let y = d[0]?.offsetTop ?? 0;
      for (const e of (order ?? []).flatMap((id) => at(id) ?? [])) {
        e.style.transform = `translateY(${y - e.offsetTop}px)`;
        y += e.offsetHeight + gap;
      }
      if (!order) d.forEach((e) => (e.style.transform = ""));
    };
    const c = { act: (a: { values?: unknown }) => act.current({ action: g.action, block: b.id, values: rec(a.values) ? a.values : null }) };
    const added: Element[] = [];
    for (const r of b.rows) {
      const e = r.id ? at(r.id) : undefined;
      if (!e || !r.id || r.type !== "row" || !rules.word(b, r.id)) continue;
      const hd = Object.assign(document.createElement("button"), { className: "b-hd", type: "button", textContent: "≡" });
      hd.setAttribute("aria-label", `Move ${r.title}`);
      hd.dataset.act = g.action;
      e.append(hd);
      gestured(hd, c, { block: b, gesture: g, rules, grab: r.id, item: r.id, reach: (_, dy) => Math.round(dy / (e.offsetHeight || 1)), show });
      for (let n: Element | null = hd; n; n = n.nextElementSibling) added.push(n);
    }
    return () => {
      added.forEach((n) => n.remove());
      show(null);
    };
  }, [b]);
  return h("div", "list", { ...hooks, ref }, ...kids(b.rows));
}
