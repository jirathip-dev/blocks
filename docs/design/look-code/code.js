// Design reference for the look code, version 1: preview only, impl writes the real one in Rust and TS.
export const AXES = [
  ["type", ["default", "mono", "serif"]],
  ["space", "scale"],
  ["radius", "scale"],
  ["motion", "scale"],
  ["easing", ["standard", "calm", "bouncy"]],
  ["surface", ["glass", "dashed", "solid"]],
  ["fills", ["tint", "outline", "solid"]],
  ["buttons", ["plain", "filled"]],
  ["marks", ["symbols", "text"]],
  ["sections", ["title", "quiet"]],
];
export const ROLES = ["kind", "header", "group", "section", "title", "button", "chip", "back", "said", "picked"];
export const CASES = ["as-is", "lower", "upper"];
const DEFAULTS = { space: 1, motion: 1, easing: "standard", buttons: "plain" };
const radix = ([, v]) => (v === "scale" ? 17 : v.length);
const SPAN = AXES.reduce((n, a) => n * radix(a), 1);
const b64 = (bytes) => Buffer.from(bytes).toString("base64url");

export function encode(style, scheme) {
  let n = 0;
  for (const a of [...AXES].reverse()) {
    const [k, v] = a;
    const x = style[k] ?? DEFAULTS[k];
    const i = v === "scale" ? x * 4 : v.indexOf(x);
    if (!Number.isInteger(i) || i < 0 || i >= radix(a)) throw new Error(`${k} ${x}: off the code's steps`);
    n = n * radix(a) + i;
  }
  let out = "1" + n.toString(36).padStart(5, "0");
  const bytes = [];
  for (const role of ROLES) {
    const l = style.labels?.[role];
    if (!l) continue;
    bytes.push(ROLES.indexOf(role) * 3 + CASES.indexOf(l.case ?? "as-is"));
    for (const t of [l.prefix ?? "", l.suffix ?? ""]) {
      const u = [...Buffer.from(t, "utf8")];
      bytes.push(u.length, ...u);
    }
  }
  if (bytes.length) out += "~" + b64(bytes);
  if (scheme && scheme !== "default") out += "." + scheme;
  return out;
}

export function decode(code) {
  const m = /^([0-9a-z])([0-9a-z]{5})(?:~([A-Za-z0-9_-]+))?(?:\.([a-z0-9][a-z0-9-]{0,31}))?$/.exec(code);
  if (!m) throw new Error("not a look code");
  if (m[1] !== "1") throw new Error(`version ${m[1]}: this reader takes 1`);
  if (m[4] === "default") throw new Error("the default pair is written as no scheme");
  let n = parseInt(m[2], 36);
  if (n >= SPAN) throw new Error("an axis value this reader does not know: made by a newer blocks");
  const style = { format: 2, labels: {} };
  for (const a of AXES) {
    const [k, v] = a;
    const i = n % radix(a);
    n = Math.floor(n / radix(a));
    style[k] = v === "scale" ? i / 4 : v[i];
  }
  const bytes = m[3] ? [...Buffer.from(m[3], "base64url")] : [];
  for (let at = 0; at < bytes.length; ) {
    const rc = bytes[at++];
    const take = () => {
      const len = bytes[at++];
      const t = Buffer.from(bytes.slice(at, at + len)).toString("utf8");
      at += len;
      return t;
    };
    style.labels[ROLES[Math.floor(rc / 3)]] = { prefix: take(), suffix: take(), case: CASES[rc % 3] };
  }
  return { style, scheme: m[4] ?? null };
}

export const parts = (code) => {
  const m = /^(.)(.{5})(~[^.]+)?(\..+)?$/.exec(code);
  return { version: m[1], axes: m[2], labels: m[3] ?? "", scheme: m[4] ?? "" };
};
