import { useContext } from "react";
import { type Block, columns, type Screen } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { kids } from "../block.ts";
import { act, urlOf, type V } from "../draw.ts";
import { h } from "../h.ts";

const stays = (x: Block) => (x.type === "row" && x.sticky === true) || x.type === "composer";

export function screen({ b, hooks }: V<Screen>) {
  const cx = useContext(Cx);
  const go = (m: NonNullable<Screen["actions"]>[number]) => () => (m.tap ? cx.tap(m.tap) : void cx.act({ action: m.action ?? "", values: m.values, confirm: m.confirm }));
  const acts = (b.actions ?? []).flatMap((a) => a.menu ?? [a]).map((m) => act(m, "b-screen__actions", cx, urlOf(m.tap), urlOf(m.tap) ? undefined : go(m)));
  const head = h("p", "tabh", null, h("span", "tw b-screen__title as-screen-label", null, b.title ?? ""), ...acts);
  const attrs = { ...hooks, "data-id": String(b.id) };
  const bs = b.blocks ?? [];
  const split = columns(b);
  if (split)
    return h(
      "div",
      "scr split",
      attrs,
      head,
      h(
        "div",
        "scr-cols",
        null,
        h("div", "scr-main", { "data-kids": "" }, ...kids(split[0])),
        h("aside", "scr-side", { "aria-label": split[1].map((x) => String(x["header"] ?? "")).join(", ") }, ...kids(split[1])),
      ),
    );
  if (!b.focus) return h("div", "scr", attrs, head, ...kids(bs));
  const kept = bs.filter(stays);
  const at = kept.findIndex((x) => x.type === "composer");
  const cut = at < 0 ? kept.length : at;
  return h("div", "scr", attrs, ...kids(kept.slice(0, cut)), h("div", "msgs", null, head, ...kids(bs.filter((x) => !stays(x)))), ...kids(kept.slice(cut)));
}
