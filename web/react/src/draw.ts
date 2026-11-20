import type { ReactNode } from "react";
import { type Act, actionOf, type Figure, figured, linkable, type Tap, value } from "../../src/core/index.ts";
import type { Ctx } from "./act.ts";
import { type Attrs, h } from "./h.ts";

/// A kind's view props: its block and the hooks for its root.
export type V<T> = { b: T; hooks: Attrs };

export const urlOf = (t?: Tap | null): string | undefined => (t?.url != null && linkable(t.url) ? t.url : undefined);
/// The action a tap sends: the tap's own when it goes nowhere else, else `action`.
export const sends = (t?: Tap | null, action?: unknown): string | undefined => {
  const a = t ? (t.url != null || t.open != null || t.sheet != null ? null : t.action) : action;
  return typeof a === "string" && a ? a : undefined;
};
export const out = (url: string) => ({ href: url, target: "_blank", rel: "noopener" });
/// What makes a non-button element pressable, by click or Enter.
export const press = (go: () => void) => ({ role: "button", tabIndex: 0, onClick: go, onKeyDown: (e: { key: string }) => e.key === "Enter" && go() });

/// A button as the HTML renderer's `btn` draws one: a link when it has a url, its label in a span; `off` disables a button.
export const btn = (label: unknown, cls: string, url: string | undefined, action: unknown, attrs: Attrs, off = false) => {
  const own = { "data-action": typeof action === "string" && action ? action : undefined, ...attrs };
  const span = h("span", "", null, String(label ?? ""));
  return url ? h("a", `btn ${cls}`, { ...own, ...out(url) }, span) : h("button", cls, { type: "button", ...own, disabled: off || undefined }, span);
};

/// An act's button, marked with the action its `enabled` turns off and off while it does.
export const act = (a: Act, cls: string, cx: Ctx, url: string | undefined, go: (() => void) | undefined) => {
  const k = actionOf(a);
  return btn(a.label, cls, url, sends(a.tap, a.action), { "data-act": k || undefined, onClick: go }, k !== undefined && cx.v.acts.has(k));
};

const rec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/// A value as `ticked` draws it: a `get` from local state, an age in a span the shell redraws, else its text.
export function ticked(v: unknown, cx: Ctx): ReactNode {
  if (rec(v) && typeof v.get === "string") return h("span", "", { "data-get": v.get }, cx.v.values[v.get] ?? "");
  return rec(v) && ("since" in v || "until" in v) ? h("span", "", { "data-tick": JSON.stringify(v) }, value(v)) : value(v);
}

/// A figure as the plain theme draws it: the state's glyph, named by its word.
export const figure = (f: Figure, cls: string) => {
  const s = String(f.state);
  const { glyph, word, tone } = figured(s);
  return h("span", `rsg ${s} ${cls}`, { role: "img", "aria-label": word, title: word }, h("i", `gl ${tone}`, null, glyph));
};

type Stage = [RegExp, (m: RegExpMatchArray, next: (s: string) => ReactNode[]) => ReactNode];

function inline(s: string, stages: Stage[]): ReactNode[] {
  const [stage, ...rest] = stages;
  if (!stage) return s ? [s] : [];
  const next = (t: string) => inline(t, rest);
  const got: ReactNode[] = [];
  let at = 0;
  for (const m of s.matchAll(stage[0])) {
    got.push(...next(s.slice(at, m.index)), stage[1](m, next));
    at = (m.index ?? 0) + m[0].length;
  }
  return [...got, ...next(s.slice(at))];
}

/// Markdown as the HTML renderer's `md` writes it, drawn as elements: code blocks, `code`, **bold**, links and, with `refs`, thread refs.
export function md(s: unknown, refs: boolean): ReactNode[] {
  const link = new RegExp(String.raw`\[([^\]]+)\]\((https?:[^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)])|\b(${refs ? "t\\d+" : "(?!)"})\b`, "g");
  const stages: Stage[] = [
    [/`([^`]+)`/g, (m, n) => h("code", "", null, ...n(m[1]))],
    [/\*\*([^*]+)\*\*/g, (m, n) => h("b", "", null, ...n(m[1]))],
    [link, (m, n) => (m[4] ? h("a", "", { href: "#", "data-thread": m[4] }, m[4]) : h("a", "", out(m[2] ?? m[3]), ...n(m[1] ?? m[3])))],
    [/\n/g, () => h("br", "", null)],
  ];
  const cb = (part: string) => h("div", "cb", null, h("pre", "", null, part.replace(/\n$/, "")), h("button", "cpy", { type: "button" }, h("span", "", null, "copy")));
  return String(s ?? "")
    .split(/```(?:[a-z]*)\n?/)
    .flatMap((part, i) => (i % 2 ? [cb(part)] : inline(part, stages)));
}
