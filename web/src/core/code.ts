import { cases, curves, rules, type Scale } from "../gen/schemes.ts";

type Case = keyof typeof cases;
const TYPES = ["default", "mono", "serif"] as const satisfies readonly (keyof typeof rules.type)[];
const EASINGS = ["standard", "calm", "bouncy"] as const satisfies readonly (keyof typeof curves)[];
const SURFACES = ["glass", "dashed", "solid"] as const satisfies readonly (keyof typeof rules.surface)[];
const FILLS = ["tint", "outline", "solid"] as const satisfies readonly (keyof typeof rules.fills)[];
const BUTTONS = ["plain", "filled"] as const satisfies readonly (keyof typeof rules.buttons)[];
const MARKS = ["symbols", "text"] as const satisfies readonly (keyof typeof rules.marks)[];
const SECTIONS = ["title", "quiet"] as const satisfies readonly (keyof typeof rules.sections)[];
const CASES = ["as-is", "lower", "upper"] as const satisfies readonly Case[];
const ROLES = ["kind", "header", "group", "section", "title", "button", "chip", "back", "said", "picked", "screen"];
const STEPS = Array.from({ length: 17 }, (_, i) => i / 4);
const SPAN = 3 * 17 ** 3 * 3 ** 3 * 2 ** 3;
const MARK = /^[!-/:-@[-`{-~ ‹›·•]{0,4}$/u;

/// A look code's style and the scheme pair it names (null: blocks' own pair).
export type Decoded = { style: Scale; scheme: string | null };

const b64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (t: string) => Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function step(x: number, axis: string): number {
  const i = STEPS.indexOf(x);
  if (i < 0) throw new Error(`${axis} is off the code's quarter steps`);
  return i;
}

/// The code of `style` worn on `scheme` (null: blocks' own pair); throws naming an axis off a quarter step.
export function encode(style: Scale, scheme: string | null = null): string {
  const digits: [number, number][] = [
    [TYPES.indexOf(style.type ?? "default"), 3],
    [step(style.space ?? 1, "space"), 17],
    [step(style.radius ?? 0, "radius"), 17],
    [step(style.motion ?? 1, "motion"), 17],
    [EASINGS.indexOf(style.easing ?? "standard"), 3],
    [SURFACES.indexOf(style.surface ?? "glass"), 3],
    [FILLS.indexOf(style.fills ?? "tint"), 3],
    [BUTTONS.indexOf(style.buttons ?? "plain"), 2],
    [MARKS.indexOf(style.marks ?? "symbols"), 2],
    [SECTIONS.indexOf(style.sections ?? "title"), 2],
  ];
  let out = "1" + digits.reduceRight((n, [d, radix]) => n * radix + d, 0).toString(36).padStart(5, "0");
  const bytes: number[] = [];
  const utf8 = new TextEncoder();
  for (const [r, role] of ROLES.entries()) {
    const l = style.labels?.[role];
    if (!l) continue;
    bytes.push(r * 3 + CASES.indexOf(l.case ?? "as-is"));
    for (const t of [l.prefix ?? "", l.suffix ?? ""]) bytes.push(utf8.encode(t).length, ...utf8.encode(t));
  }
  if (bytes.length) out += "~" + b64(bytes);
  return scheme === null ? out : `${out}.${scheme}`;
}

function labels(bytes: number[]): NonNullable<Scale["labels"]> {
  const out: Record<string, { prefix: string; suffix: string; case: Case }> = {};
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  let at = 0;
  const take = () => {
    const len = bytes[at++];
    if (len === undefined || at + len > bytes.length) throw new Error();
    const t = utf8.decode(new Uint8Array(bytes.slice(at, at + len)));
    at += len;
    if (!MARK.test(t)) throw new Error();
    return t;
  };
  while (at < bytes.length) {
    const rc = bytes[at++] ?? 0;
    const role = ROLES[Math.floor(rc / 3)];
    const c = CASES[rc % 3];
    if (!role || !c) throw new Error();
    out[role] = { prefix: take(), suffix: take(), case: c };
  }
  return out;
}

/// The style and scheme a code carries; throws saying why for a bad one.
export function decode(code: string): Decoded {
  const m = /^([0-9a-z])([0-9a-z]{5})(?:~([A-Za-z0-9_-]+))?(?:\.(.*))?$/.exec(code);
  if (!m || m[1] === undefined || m[2] === undefined) throw new Error("not a look code");
  if (m[1] !== "1") throw new Error(`version ${m[1]}: this reader takes 1`);
  const scheme = m[4] ?? null;
  if (scheme !== null && (scheme === "default" || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(scheme)))
    throw new Error("a scheme name is a-z, 0-9 and -, at most 32, and never default");
  let n = parseInt(m[2], 36);
  if (n >= SPAN) throw new Error("an axis value this reader does not know: made by a newer blocks");
  const take = <T>(all: readonly T[]): T => {
    const v = all[n % all.length];
    n = Math.floor(n / all.length);
    if (v === undefined) throw new Error("not a look code");
    return v;
  };
  const style: Scale = { type: take(TYPES), space: take(STEPS), radius: take(STEPS), motion: take(STEPS), easing: take(EASINGS), surface: take(SURFACES), fills: take(FILLS), buttons: take(BUTTONS), marks: take(MARKS), sections: take(SECTIONS), labels: {} };
  const bad = new Error("the labels part does not decode");
  try {
    if (m[3]) style.labels = labels(unb64(m[3]));
  } catch {
    throw bad;
  }
  if (encode(style, scheme) !== code) throw bad;
  return { style, scheme };
}
