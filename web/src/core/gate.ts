import type { Scheme, Token } from "../gen/schemes.ts";

type Rgb = [number, number, number];

/// One check a scheme fails: what is measured, its value and the minimum.
export type Miss = { what: string; got: number; min: number };

const RAD = Math.PI / 180;
const mid = (a: number, b: number) => (a + b) / 2;
const lin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const over = ([r, g, b]: Rgb, [br, bg, bb]: Rgb, p: number): Rgb => {
  const mix = (x: number, y: number) => x * p + y * (1 - p);
  return [mix(r, br), mix(g, bg), mix(b, bb)];
};
const rgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1, 7), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
};

function lab(c: Rgb): Rgb {
  const [r, g, b] = c.map(lin);
  const [cx, cy, cz] = [
    [0.4124, 0.3576, 0.1805],
    [0.2126, 0.7152, 0.0722],
    [0.0193, 0.1192, 0.9505],
  ].map(([x, y, z]) => x * r + y * g + z * b);
  const curve = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [curve(cx / 0.95047), curve(cy), curve(cz / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function de(c1: Rgb, c2: Rgb): number {
  const [[l1, a1, b1], [l2, a2, b2]] = [lab(c1), lab(c2)];
  const c = mid(Math.hypot(a1, b1), Math.hypot(a2, b2));
  const g = 0.5 * (1 - Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7)));
  const [ap1, ap2] = [a1 * (1 + g), a2 * (1 + g)];
  const [cp1, cp2] = [Math.hypot(ap1, b1), Math.hypot(ap2, b2)];
  const h = (b: number, a: number) => {
    const v = Math.atan2(b, a) / RAD;
    return v < 0 ? v + 360 : v;
  };
  const [h1, h2, dl, dc] = [h(b1, ap1), h(b2, ap2), l2 - l1, cp2 - cp1];
  const dh = cp1 * cp2 === 0 ? 0 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 < -180 ? h2 - h1 + 360 : h2 - h1;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh * RAD) / 2);
  const [lm, cm] = [mid(l1, l2), mid(cp1, cp2)];
  const hm = cp1 * cp2 === 0 ? h1 + h2 : Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : mid(h1, h2);
  const t =
    1 - 0.17 * Math.cos((hm - 30) * RAD) + 0.24 * Math.cos(2 * hm * RAD) + 0.32 * Math.cos((3 * hm + 6) * RAD) - 0.2 * Math.cos((4 * hm - 63) * RAD);
  const sl = 1 + (0.015 * (lm - 50) ** 2) / Math.sqrt(20 + (lm - 50) ** 2);
  const [sc, sh] = [1 + 0.045 * cm, 1 + 0.015 * cm * t];
  const rt = -2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * RAD);
  return Math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * (dc / sc) * (dH / sh));
}

/// The contrast gate (text 4.5:1, state colours 3:1, ΔE2000 20 apart), as the crate's `theme::gate`: empty when it passes.
export function gate(s: Scheme): Miss[] {
  const c = (k: Token) => rgb(s.tokens[k]);
  const checks: Miss[] = [];
  const [bg, r, a] = [c("--bg"), c("--r"), c("--a")];
  const needs: [string, Rgb] = ["the needs-you card", over(r, bg, 0.15)];
  const tints: [string, Rgb][] = [needs, ["a red group header", over(r, bg, 0.12)], ["an amber group header", over(a, bg, 0.12)]];
  const text: Token[] = ["--fg", "--mute", "--l", "--link", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a"];
  const states: Token[] = ["--g", "--a", "--r"];
  for (const b of ["--bg", "--card"] as const) {
    for (const k of text) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 4.5 });
    for (const k of states) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 3 });
  }
  checks.push({ what: "--bg on --l", got: ratio(bg, c("--l")), min: 4.5 });
  for (const k of ["--fg", "--mute", "--l"] as const) checks.push({ what: `${k} on ${needs[0]}`, got: ratio(c(k), needs[1]), min: 4.5 });
  (["--r", "--r", "--a"] as const).forEach((k, i) => {
    const [on, tint] = tints[i];
    checks.push({ what: `${k} on ${on}`, got: ratio(c(k), tint), min: 3 });
  });
  const pairs: [Token, Token][] = [["--g", "--a"], ["--a", "--r"], ["--g", "--r"]];
  for (const x of ["--l", "--link"] as const) pairs.push(...states.map((y): [Token, Token] => [x, y]));
  for (const [x, y] of pairs) checks.push({ what: `ΔE2000 ${x} ↔ ${y}`, got: de(c(x), c(y)), min: 20 });
  return checks.filter((m) => m.got < m.min);
}
