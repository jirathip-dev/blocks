import { type MouseEvent, useContext, useState } from "react";
import type { Card } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { kids } from "../block.ts";
import { btn, ticked, type V } from "../draw.ts";
import { h } from "../h.ts";

export function card({ b, hooks }: V<Card>) {
  const cx = useContext(Cx);
  const [open, setOpen] = useState(false);
  const cls = `card ${b.tone ?? ""} k-${b.kind ?? ""}`;
  const attrs = { ...hooks, "data-id": b.id ?? "" };
  const fold = b.fold ?? null;
  const main = fold?.main ?? null;
  const shut = fold !== null && !open;
  const send = main && (() => void cx.act({ action: main.action, block: main.block, values: { ...main.values, choice: main.value } }));
  const flip = (e: MouseEvent) => (e.target instanceof Element && e.target.closest("button")) || setOpen((o) => !o);
  const mainBtn = main && shut ? btn(main.label, "main", undefined, main.action, { onClick: send }) : null;
  const line = fold ? h("div", "fold", { tabIndex: 0, role: "button", "aria-expanded": String(!shut), onClick: flip }, h("span", "fl", null, fold.line), mainBtn) : null;
  if (shut) return h("div", cls, attrs, line);
  const badge = b.badge ? [" ", h("span", `tag b-card__badge ${b.badge.tone ?? ""}`, null, ticked(b.badge.text, cx))] : [];
  const meta = b.meta ? [" ", h("span", "m", null, ticked(b.meta, cx))] : [];
  const head = b.title || b.badge ? h("div", "ch", null, h("b", "b-card__title", null, b.title ?? ""), ...badge, ...meta) : null;
  const buttons = b.buttons ?? [];
  const bar = buttons.length ? h("div", "bar b-card__actions", null, ...kids(buttons)) : null;
  const s = !b.subtitle ? null : typeof b.subtitle === "string" ? { text: b.subtitle, tone: null } : b.subtitle;
  const sub = s ? h("p", `m b-card__subtitle ${s.tone ?? ""}`.trimEnd(), null, ticked(s.text, cx)) : null;
  return h("div", cls, attrs, line, head, sub, ...kids(b.blocks), bar);
}
