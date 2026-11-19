import { defaultPair, defaultStyle, type Mode, type Scheme } from "../gen/schemes.ts";

export type Pair = Record<Mode, Scheme>;
type Label = { prefix?: string; suffix?: string; case?: "as-is" | "lower" | "upper" };
export type Scale = {
  space?: number;
  motion?: number;
  radius?: number;
  type?: "default" | "mono";
  surface?: "glass" | "dashed" | "solid";
  fills?: "tint" | "outline" | "solid";
  marks?: "symbols" | "text";
  sections?: "title" | "quiet";
  labels?: Record<string, Label>;
};

const TILES = ":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl)";
const DRAWN = {
  header: ".sec>.sh",
  section: ":is(.sp,.pg,.scn)>.sh",
  title: ":is(.ch>b,.rt)",
  button: ".b-button>span",
  chip: ".chips button>span",
  picked: ".dgn.picked .dgl",
};
const CASE = { "as-is": "none", lower: "lowercase", upper: "uppercase" };
const quote = (t: string) => `"${t.replace(/[\\"]/g, "\\$&")}"`;

function axes(s: Scale): string {
  let out = s.type === "default" ? ':root{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' : "";
  if (s.surface === "dashed") out += `${TILES}{border-style:dashed}`;
  if (s.surface === "solid") out += `${TILES}{border-width:2px}`;
  if (s.fills === "outline") out += ".chips button.on,.spi.done .spm{background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)}";
  if (s.marks === "text") out += '.spi.done .spm{width:auto;font-size:0}.spi.done .spm::after{content:"done";font-size:var(--fs-meta)}';
  if (s.sections === "quiet") out += ".sh{font-size:var(--fs-meta);font-weight:400}";
  for (const [role, at] of Object.entries(DRAWN)) {
    const l = s.labels?.[role];
    if (!l) continue;
    out += `${at}{text-transform:${CASE[l.case ?? "as-is"]}}`;
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
  const tiles = { ...defaultStyle, "--radius": `${(style.radius ?? 0) * 12}px` };
  return `:root{${head}${all(tiles)}${all(look.light.tokens)}}@media (prefers-color-scheme: dark){:root{${all(look.dark.tokens)}}}${axes(style)}`;
}

/// The default tile style as CSS variables that any `:root` rule of the app's overrides.
export const tiles = `:where(:root){${vars(defaultStyle).join(";")}}`;

/// The scheme to wear: the owner's named one (null follows the device) when it is on offer, else the device's default.
export const choose = (setting: string | null, dark: boolean, schemes: Record<string, Scheme> = {}): Scheme =>
  (setting !== null && Object.prototype.hasOwnProperty.call(schemes, setting) ? schemes[setting] : undefined) ?? defaultPair[dark ? "dark" : "light"];
