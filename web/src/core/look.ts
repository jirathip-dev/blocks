import { defaultPair, defaultStyle, type Mode, type Scheme } from "../gen/schemes.ts";

export type Pair = Record<Mode, Scheme>;
export type Scale = { space?: number; motion?: number };

const vars = (t: Record<string, string>) => Object.entries(t).map(([k, v]) => `${k}:${v}`);

/// One scheme's tokens on `:root` with its `color-scheme`; a light and dark pair as the crate's `theme::css` writes it.
export function css(look: Scheme | Pair, style: Scale = {}): string {
  if ("tokens" in look) return `:root{${vars(look.tokens).join(";")};color-scheme:${look["color-scheme"]}}`;
  const all = (t: Record<string, string>) => vars(t).map((d) => `${d};`).join("");
  const head = `color-scheme:light dark;--space:${style.space ?? 1};--motion:${style.motion ?? 1};`;
  return `:root{${head}${all(defaultStyle)}${all(look.light.tokens)}}@media (prefers-color-scheme: dark){:root{${all(look.dark.tokens)}}}`;
}

/// The default tile style as CSS variables that any `:root` rule of the app's overrides.
export const tiles = `:where(:root){${vars(defaultStyle).join(";")}}`;

/// The scheme to wear: the owner's named one (null follows the device) when it is on offer, else the device's default.
export const choose = (setting: string | null, dark: boolean, schemes: Record<string, Scheme> = {}): Scheme =>
  (setting !== null && Object.prototype.hasOwnProperty.call(schemes, setting) ? schemes[setting] : undefined) ?? defaultPair[dark ? "dark" : "light"];
