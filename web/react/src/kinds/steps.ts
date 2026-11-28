import { createElement, useContext } from "react";
import type { Bar, Stage, Steps } from "../../../src/core/index.ts";
import { type Ctx, Cx } from "../act.ts";
import { Fallen } from "../block.ts";
import { out, press, sends, urlOf, type V } from "../draw.ts";
import { h } from "../h.ts";

const WORD = { done: "done", now: "current", todo: "to do" } as const;

function stage(s: Stage, i: number, n: number, at: number, cx: Ctx) {
  const state = (["done", "now", "todo"] as const)[Math.sign(i - at) + 1] ?? "todo";
  const tap = state === "done" ? (s.tap ?? null) : null;
  const url = urlOf(tap);
  const own = { "aria-label": `${s.label}, step ${i + 1} of ${n}, ${WORD[state]}`, title: s.label };
  const mark = h("span", "spr", { "aria-hidden": "true" }, i < at ? h("i", "spm as-mark as-tint", { "data-mark": "done" }, "✓") : h("i", "spm", null, String(i + 1)), h("span", "spk", null));
  const sub = s.sub || (i === at ? `step ${i + 1} of ${n}` : "");
  const kids = [mark, h("span", "spn", null, s.label), sub ? h("span", "sps", null, sub) : null];
  const pressed = tap && !url ? { "data-action": sends(tap), ...press(() => cx.tap(tap)) } : null;
  const cls = tap ? "spc tap" : "spc";
  const x = url ? h("a", cls, { ...own, ...out(url) }, ...kids) : h("div", cls, { ...own, ...pressed }, ...kids);
  return h("li", `spi ${state}`, { "aria-current": i === at ? "step" : undefined }, x);
}

function bar(r: Bar) {
  const v = Math.max(0, Math.min(100, Math.round(r.value)));
  const aria = { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(v), "aria-label": r.label, "aria-valuetext": r.sub ? `${v}%, ${r.sub}` : undefined };
  const t = h("span", "pgt", null, h("b", "", { style: { "--v": v } }));
  return h("div", `pgr${r.tone ? ` ${r.tone}` : ""}${v === 0 ? " zero" : ""}`, aria, h("span", "pgn", null, r.label), h("span", "pgv", null, `${v}%`), t, r.sub ? h("span", "pgs", null, r.sub) : null);
}

export function steps({ b, hooks }: V<Steps>) {
  const cx = useContext(Cx);
  const list = b.steps ?? [];
  const bars = b.bars ?? [];
  const n = list.length;
  const end = b.done ? n : -1;
  const at = b.current != null ? list.findIndex((s) => s.id === b.current) : end;
  if (n ? at < 0 : !bars.length) return createElement(Fallen, { b });
  const title = b.title ? h("div", "sh as-section-label", null, b.title) : null;
  if (!n) return h("div", "pg", hooks, title, h("div", bars.length > 1 ? "pgl rows" : "pgl", null, ...bars.map(bar)));
  const cur: Stage | undefined = list[at];
  const tail = cur?.sub ? ` · ${cur.sub}` : "";
  const x = cur ? [h("b", "", null, cur.label), h("span", "m", null, `step ${at + 1} of ${n}${tail}`)] : [h("b", "", null, "All done"), h("span", "m", null, `${n} of ${n}`)];
  return h("div", "sp", hooks, title, h("ol", "spl", null, ...list.map((s, i) => stage(s, i, n, at, cx))), h("div", "spx", { "aria-hidden": "true" }, ...x));
}
