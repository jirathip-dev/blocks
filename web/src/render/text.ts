import type { Label, Toned } from "../gen/types.ts";
import { isBlk } from "../core/tree.ts";
import { el, esc, h } from "./dom.ts";

export const tone = (v: Toned): Label => (typeof v === "string" ? { text: v } : v);

export function md(s: unknown, refs = false): string {
  const link = new RegExp(String.raw`\[([^\]]+)\]\((https?:[^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)])|\b(${refs ? "t\\d+" : "(?!)"})\b`, "g");
  const a = (_: string, t: string, u: string, bare: string, ref: string) =>
    ref ? `<a href="#" data-thread="${ref}">${ref}</a>` : `<a href="${u ?? bare}" target=_blank rel=noopener>${t ?? bare}</a>`;
  return String(s ?? "")
    .split(/```(?:[a-z]*)\n?/)
    .map((part, i) =>
      i % 2
        ? `<div class=cb><pre>${esc(part.replace(/\n$/, ""))}</pre><button type=button class=cpy><span>copy</span></button></div>`
        : esc(part).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(link, a).replace(/\n/g, "<br>"),
    )
    .join("");
}

/// `{since}` as an age, `{since, label}` its label with `{}` the age, `{until, label}` with `{rel}` the minutes left, else the value.
export function value(v: unknown): string {
  if (isBlk(v) && "until" in v) return String(v.label ?? "").replace("{rel}", `${Math.max(0, Math.round((Date.parse(String(v.until)) - Date.now()) / 60000))}m`);
  if (isBlk(v) && "since" in v) {
    const s = Math.max(0, (Date.now() - Date.parse(String(v.since))) / 1000);
    if (v.label != null) return String(v.label).replace("{}", s < 120 ? `${Math.floor(s)}s` : s < 7200 ? `${Math.floor(s / 60)}m` : s < 172800 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`);
    return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d`;
  }
  return String(v ?? "");
}
export const ticked = (v: unknown): Node | string => {
  if (isBlk(v) && typeof v.get === "string") {
    const s = el("span", "");
    s.dataset.get = v.get;
    return s;
  }
  if (!(isBlk(v) && ("since" in v || "until" in v))) return value(v);
  const s = h("span", "", value(v));
  s.dataset.tick = JSON.stringify(v);
  return s;
};
/// Redraws every age under `root`; the shell calls it once a second.
export const tick = (root: ParentNode) =>
  root.querySelectorAll<HTMLElement>("[data-tick]").forEach((e) => {
    const t = value(JSON.parse(e.dataset.tick ?? "null"));
    if (e.textContent !== t) e.textContent = t;
  });
