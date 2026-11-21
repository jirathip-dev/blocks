import { cases, curves, defaultPair, defaultStyle, drawn, rules, type Axes, type Mode, type Scale, type Scheme } from "../gen/schemes.ts";
import { gate } from "./gate.ts";

export type Pair = Record<Mode, Scheme>;
export type { Scale };
const passed: unique symbol = Symbol("look");
/// A light and a dark scheme that passed the gate; the only look a view wears.
export type Look = Readonly<Pair> & { readonly [passed]: true };

/// Runs the gate on both schemes; throws one error listing every miss.
export function gated(pair: Pair): Look {
  const misses = (["light", "dark"] as const).flatMap((m) => gate(pair[m], "tint").map((x) => `${m}: ${x.what} is ${x.got.toFixed(2)}, under ${x.min}`));
  if (misses.length) throw new Error(`the look fails the gate:\n${misses.join("\n")}`);
  return { light: pair.light, dark: pair.dark, [passed]: true };
}
const quote = (t: string) => `"${t.replace(/[\\"]/g, "\\$&")}"`;
const isAxis = (k: string): k is keyof typeof rules => k in rules;
const rule = (s: Axes, k: keyof Axes): string => {
  const t: Record<string, string> = rules[k];
  const v = s[k];
  return v === undefined ? "" : (t[v] ?? "");
};

function axes(s: Scale): string {
  let out = Object.keys(rules).filter(isAxis).map((k) => rule(s, k)).join("");
  for (const [role, at] of Object.entries(drawn)) {
    const l = s.labels?.[role];
    if (!l) continue;
    out += `${at}{text-transform:${cases[l.case ?? "as-is"]}}`;
    if (l.prefix) out += `${at}::before{content:${quote(l.prefix)}}`;
    if (l.suffix) out += `${at}::after{content:${quote(l.suffix)}}`;
  }
  return out;
}

const vars = (t: Record<string, string>) => Object.entries(t).map(([k, v]) => `${k}:${v}`);

/// One scheme's tokens on `:root` with its `color-scheme`; a light and dark pair as the crate's `theme::css` writes it.
export function css(look: Scheme | Pair, style: Scale = {}): string {
  if ("tokens" in look) return `:root{${vars(look.tokens).join(";")};color-scheme:${look["color-scheme"]}}`;
  const all = (t: Record<string, string>) => vars(t).map((d) => `${d};`).join("");
  const head = `color-scheme:light dark;--space:${style.space ?? 1};--motion:${style.motion ?? 1};`;
  const tiles = { ...defaultStyle, "--radius": `${(style.radius ?? 0) * 12}px`, "--ease": curves[style.easing ?? "standard"] };
  return `:root{${head}${all(tiles)}${all(look.light.tokens)}}@media (prefers-color-scheme: dark){:root{${all(look.dark.tokens)}}}${axes(style)}`;
}

/// The default tile style as CSS variables that any `:root` rule of the app's overrides.
export const tiles = `:where(:root){${vars(defaultStyle).join(";")}}`;

/// The scheme to wear: the owner's named one (null follows the device) when it is on offer, else the device's default.
export const choose = (setting: string | null, dark: boolean, schemes: Record<string, Scheme> = {}): Scheme =>
  (setting !== null && Object.prototype.hasOwnProperty.call(schemes, setting) ? schemes[setting] : undefined) ?? defaultPair[dark ? "dark" : "light"];
