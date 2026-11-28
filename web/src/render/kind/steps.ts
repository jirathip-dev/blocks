import type { Bar, Stage, Steps } from "../../gen/types.ts";
import { acts, sends, urlOf } from "../act.ts";
import { fallback } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el, h, href } from "../dom.ts";

function stage(s: Stage, i: number, n: number, at: number, c: Ctx): HTMLElement {
  const state = i < at ? "done" : i === at ? "now" : "todo";
  const tap = state === "done" ? (s.tap ?? null) : null;
  const url = urlOf(tap);
  const x: HTMLElement = url ? href(el("a", "spc tap"), url) : el("div", tap ? "spc tap" : "spc");
  x.setAttribute("aria-label", `${s.label}, step ${i + 1} of ${n}, ${state === "done" ? "done" : state === "now" ? "current" : "to do"}`);
  x.title = s.label;
  if (tap && !url) {
    acts(x, sends(tap)).setAttribute("role", "button");
    x.tabIndex = 0;
    x.onclick = () => c.tap(tap);
    x.onkeydown = (e) => e.key === "Enter" && c.tap(tap);
  }
  const spm = i < at ? h("i", "spm as-mark as-tint", "✓") : h("i", "spm", String(i + 1));
  if (i < at) spm.dataset["mark"] = "done";
  const mark = h("span", "spr", spm, el("span", "spk"));
  mark.setAttribute("aria-hidden", "true");
  x.append(mark, h("span", "spn", s.label));
  const sub = s.sub || (i === at ? `step ${i + 1} of ${n}` : "");
  if (sub) x.append(h("span", "sps", sub));
  const li = h("li", `spi ${state}`, x);
  if (i === at) li.setAttribute("aria-current", "step");
  return li;
}

function bar(r: Bar): HTMLElement {
  const v = Math.max(0, Math.min(100, Math.round(r.value)));
  const row = h("div", `pgr${r.tone ? ` ${r.tone}` : ""}${v === 0 ? " zero" : ""}`, h("span", "pgn", r.label), h("span", "pgv", `${v}%`));
  for (const [k, x] of [["role", "progressbar"], ["aria-valuemin", "0"], ["aria-valuemax", "100"], ["aria-valuenow", String(v)], ["aria-label", r.label]] satisfies [string, string][]) row.setAttribute(k, x);
  if (r.sub) row.setAttribute("aria-valuetext", `${v}%, ${r.sub}`);
  const t = h("span", "pgt", el("b"));
  t.setAttribute("style", `--v:${v}`);
  row.append(t);
  if (r.sub) row.append(h("span", "pgs", r.sub));
  return row;
}

export function steps(b: Steps, c: Ctx): HTMLElement {
  const list = b.steps ?? [];
  const bars = b.bars ?? [];
  const n = list.length;
  const at = b.current != null ? list.findIndex((s) => s.id === b.current) : b.done ? n : -1;
  if (n ? at < 0 : !bars.length) return fallback(b, c);
  const box = el("div", n ? "sp" : "pg");
  if (b.title) box.append(h("div", "sh as-section-label", b.title));
  if (!n) {
    box.append(h("div", bars.length > 1 ? "pgl rows" : "pgl", ...bars.map(bar)));
    return box;
  }
  const cur: Stage | undefined = list[at];
  const x = cur ? [h("b", "", cur.label), h("span", "m", `step ${at + 1} of ${n}${cur.sub ? ` · ${cur.sub}` : ""}`)] : [h("b", "", "All done"), h("span", "m", `${n} of ${n}`)];
  const sum = h("div", "spx", ...x);
  sum.setAttribute("aria-hidden", "true");
  box.append(h("ol", "spl", ...list.map((s, i) => stage(s, i, n, at, c))), sum);
  return box;
}
