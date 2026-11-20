import { list as rules } from "../../core/kind/list.ts";
import type { List } from "../../gen/types.ts";
import { gestured, held } from "../../gesture.ts";
import { kids } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";
import { paged } from "../more.ts";

const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

export function list(b: List, c: Ctx): HTMLElement {
  const l = el("div", "list");
  const rows = kids(b.rows, c);
  const at = (id: string) => rows.find((e) => e.dataset.id === id);
  const out = b.rows.map((r) => r.id && held(c, { block: b, rules, grab: r.id, item: r.id })).find(ids);
  l.append(...(out ? out.flatMap((id) => at(id) ?? []) : rows));
  const page = typeof b.more === "object" ? b.more : null;
  const lifted = () => !!l.querySelector(".b-hd:is([data-phase=pressed],[data-phase=previewing],[data-phase=dragging])");
  const mo = paged(c, { id: String(b.id ?? ""), page, n: b.rows.length, root: l, held: lifted, wrap: (k, no) => h("div", no ? "lsm no" : "lsm", ...k) });
  if (mo) l.append(mo);
  const g = b.reorder;
  if (!g) return l;
  const show = (order: string[] | null) => {
    const drawn = Array.from(l.children).filter((e) => e instanceof HTMLElement);
    const gap = drawn.length > 1 && drawn[0] && drawn[1] ? drawn[1].offsetTop - drawn[0].offsetTop - drawn[0].offsetHeight : 0;
    let y = drawn[0]?.offsetTop ?? 0;
    for (const e of (order ?? []).flatMap((id) => at(id) ?? [])) {
      e.style.transform = `translateY(${y - e.offsetTop}px)`;
      y += e.offsetHeight + gap;
    }
    if (!order) drawn.forEach((e) => (e.style.transform = ""));
  };
  for (const r of b.rows) {
    const e = r.id ? at(r.id) : undefined;
    if (!e || !r.id || r.type !== "row" || !rules.word(b, r.id)) continue;
    const hd = Object.assign(el("button", "b-hd"), { type: "button", textContent: "≡" });
    hd.setAttribute("aria-label", `Move ${r.title}`);
    hd.dataset.act = g.action;
    e.append(hd);
    gestured(hd, c, { block: b, gesture: g, rules, grab: r.id, item: r.id, reach: (_, dy) => Math.round(dy / (e.offsetHeight || 1)), show });
  }
  return l;
}
