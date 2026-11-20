import { type TouchEvent, useContext, useRef, useState } from "react";
import type { Round, Row } from "../../../src/core/index.ts";
import { type Ctx, Cx } from "../act.ts";
import { kids } from "../block.ts";
import { act, btn, figure, out, press, sends, ticked, urlOf, type V } from "../draw.ts";
import { h } from "../h.ts";

function round(d: Round, now: boolean, cx: Ctx) {
  const tap = now ? null : (d.tap ?? null);
  const url = urlOf(tap);
  const parts = [h("span", "rdn", null, d.name), h("span", "rdu", null, d.summary ?? ""), d.since ? h("span", "rdt", null, ticked({ since: d.since }, cx)) : null, tap ? h("span", "rc", null, "›") : null];
  const pressed = tap && { "data-action": sends(tap), ...press(() => cx.tap(tap)) };
  const l = url ? h("a", "rdl tap", out(url), ...parts) : h("div", tap ? "rdl tap" : "rdl", pressed || null, ...parts);
  const links = d.links ?? [];
  const lines = d.lane?.lines ?? [];
  const line = (t: string, i: number) => (d.state === "working" && i === lines.length - 1 ? h("div", "live", null, `▍ ${t}`) : h("div", "", null, t));
  const lane = d.lane ? [h("div", "rdh", null, [d.lane.name, d.lane.harness, d.lane.model, d.lane.host].filter(Boolean).join(" · ")), h("div", "rdo", null, ...lines.map(line))] : [];
  const link = links.map((k) => btn(k.label, "", urlOf(k.tap), sends(k.tap), { onClick: urlOf(k.tap) ? undefined : () => cx.tap(k.tap) }));
  const body = now && (d.lane || d.blocks?.length || links.length) ? h("div", "rdb", null, ...lane, ...kids(d.blocks), links.length ? h("div", "rdk", null, ...link) : null) : null;
  return h("li", `rd ${d.state}${now ? " now" : ""}`, null, h("i", "rdm", { "aria-label": d.state }), h("div", "rdx", null, l, body));
}

export function row({ b, hooks }: V<Row>) {
  const cx = useContext(Cx);
  const [flip, setFlip] = useState(false);
  const x0 = useRef(0);
  const toggle = () => setFlip((f) => !f);
  const cls = `row${b.style === "link" ? " link" : ""}${b.sticky ? " sticky" : ""}${b.indent ? " in" + Math.min(b.indent, 3) : ""}`;
  const rounds = b.rounds ?? [];
  const last = rounds[rounds.length - 1];
  const open = last !== undefined && (last.state === "needs") !== flip;
  const sub = b.subtitle == null || open ? null : typeof b.subtitle === "string" ? { text: b.subtitle, tone: null } : b.subtitle;
  const badge = b.badge ? [" ", h("span", `tag b-row__badge ${b.badge.tone ?? ""}`, null, ticked(b.badge.text, cx))] : [];
  const main = h("span", "rm", null, h("span", "rt b-row__title", null, b.title ?? ""), ...badge, sub ? h("span", `rs b-row__subtitle ${sub.tone ?? ""}`, null, ticked(sub.text, cx)) : null);
  const parts = [b.figure ? figure(b.figure, "b-row__figure") : null, main, b.value != null ? h("span", "rv b-row__value", null, ticked(b.value, cx)) : null];
  const id = { "data-id": b.id ?? "" };
  if (last) {
    const r = h("div", `${cls} tap`, { ...id, "aria-expanded": String(open), ...press(toggle) }, ...parts, h("span", "rc", null, "›"));
    return h("div", `rr${open ? " open" : ""}`, hooks, r, open ? h("ol", "rds", null, ...rounds.map((d) => round(d, d === last, cx))) : null);
  }
  const url = urlOf(b.tap);
  const swipe = b.swipe ?? [];
  const tapped = !url && (b.tap != null || swipe.length > 0);
  const own = { ...id, ...(tapped ? { "data-action": sends(b.tap), ...press(() => (b.tap ? cx.tap(b.tap) : toggle())) } : null) };
  const rc = url || tapped ? `${cls} tap` : cls;
  if (!swipe.length) return url ? h("a", rc, { ...hooks, ...own, ...out(url) }, ...parts) : h("div", rc, { ...hooks, ...own }, ...parts);
  const touch = { onTouchStart: (e: TouchEvent) => (x0.current = e.touches[0]?.clientX ?? x0.current), onTouchEnd: (e: TouchEvent) => x0.current - (e.changedTouches[0]?.clientX ?? x0.current) > 40 && !flip && toggle() };
  const go = (s: (typeof swipe)[number]) => () => void cx.act({ action: s.action ?? "", block: b.id, values: s.values ?? {}, confirm: s.confirm });
  const bar = h("div", "ra b-row__actions", { hidden: !flip }, ...swipe.map((s) => act(s, s.tone === "bad" ? "bad" : "", cx, undefined, go(s))));
  return h("div", "rw", hooks, h("div", rc, { ...own, ...touch }, ...parts), bar);
}
