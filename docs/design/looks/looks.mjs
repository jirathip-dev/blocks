const K = ["--bg", "--card", "--edge", "--line", "--scrim", "--fg", "--mute", "--l", "--link", "--g", "--a", "--r", "--p", "--c", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a"];
const tok = (a) => Object.fromEntries(K.map((k, i) => [k, a[i]]));

export const looks = {
  default: {
    label: "Default",
    style: { type: "default", space: 1, radius: 0, motion: 1, ease: "standard", surface: "solid", fills: "tint", marks: "symbols", sections: "title", labels: {} },
    light: tok(["#f6f6f6", "#ffffff", "#d0d0d0", "#e4e4e4", "#0000004d", "#1c1c1c", "#5e5e5e", "#3d3d3d", "#3d3d3d", "#547850", "#927236", "#a75953", "#74678e", "#3c797d", "#3d3d3d", "#64597c", "#31666a", "#456642", "#775d2c"]),
    dark: tok(["#161616", "#1f1f1f", "#3a3a3a", "#2a2a2a", "#00000099", "#ececec", "#a3a3a3", "#d6d6d6", "#d6d6d6", "#769672", "#c5a370", "#bb776e", "#a295bb", "#6da1a5", "#d6d6d6", "#b8abce", "#8ab9bc", "#9bb996", "#d1b184"]),
  },
  paper: {
    label: "Paper",
    style: { type: "serif", space: 1.5, radius: 1, motion: 1.75, ease: "calm", surface: "solid", fills: "tint", marks: "text", sections: "quiet", labels: { section: { case: "upper" } } },
    light: tok(["#f3eee4", "#fcfaf5", "#d3c9b6", "#e5ddce", "#2a22144d", "#1f1c17", "#5a5347", "#24406b", "#24406b", "#547850", "#8a6a2f", "#9f5049", "#74678e", "#3c797d", "#24406b", "#64597c", "#31666a", "#456642", "#775d2c"]),
    dark: tok(["#1b1915", "#24211c", "#423c32", "#302b24", "#00000099", "#ede6d8", "#b0a693", "#a9bfe3", "#a9bfe3", "#86a37f", "#c9a66a", "#cf8a7f", "#a99bc4", "#7fb0b3", "#a9bfe3", "#bcb0d3", "#93c0c2", "#a3c09c", "#d4b483"]),
  },
  console: {
    label: "Console",
    style: { type: "mono", space: 0.75, radius: 0, motion: 0, ease: "standard", surface: "dashed", fills: "outline", marks: "text", sections: "title", labels: { section: { prefix: "// ", case: "lower" }, button: { prefix: "[", suffix: "]", case: "lower" } } },
    light: tok(["#eef1ee", "#f9fbf9", "#b9c4bb", "#d9e0da", "#0a140c4d", "#121a14", "#4d5a50", "#1c5d86", "#1c5d86", "#3f7f45", "#8c6a1c", "#b0453c", "#6a5a94", "#2c7480", "#1c5d86", "#5a4b85", "#225f69", "#336a39", "#6f5414"]),
    dark: tok(["#0c0f0d", "#121614", "#2e3a31", "#1c231e", "#000000b3", "#d7e5d9", "#8fa394", "#8cc8f0", "#8cc8f0", "#62b46c", "#d6b35a", "#e2796c", "#ab9be0", "#5fb8c4", "#8cc8f0", "#bcaef0", "#7fcbd5", "#86d090", "#e3c477"]),
  },
  playful: {
    label: "Playful",
    style: { type: "default", space: 1.25, radius: 3, motion: 1.25, ease: "bouncy", surface: "glass", fills: "solid", marks: "symbols", sections: "title", labels: { picked: { prefix: "• " } } },
    light: tok(["#fbf6ff", "#ffffff", "#e2d4f2", "#efe6f8", "#2a10404d", "#22142f", "#5e4d70", "#6b2fc4", "#6b2fc4", "#2f8a4e", "#b5740d", "#d2394e", "#8a46c8", "#0f8291", "#6b2fc4", "#7a3cb8", "#0b6d79", "#227040", "#8a5806"]),
    dark: tok(["#160f22", "#20172f", "#3d2f55", "#2b2140", "#00000099", "#f3ebff", "#b9a8d2", "#c4a2ff", "#c4a2ff", "#5fcf86", "#f2b54a", "#ff7a8c", "#d39cff", "#4fd0e0", "#c4a2ff", "#dcb3ff", "#7fdeea", "#86dca3", "#f5c56c"]),
  },
};

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (c, b, p) => c.map((x, i) => x * p + b[i] * (1 - p));
function lab(c) {
  const [r, g, b] = c.map(lin);
  const [x, y, z] = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]].map(([p, q, s]) => p * r + q * g + s * b);
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x / 0.95047), f(y), f(z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function de(c1, c2) {
  const [[l1, a1, b1], [l2, a2, b2]] = [lab(c1), lab(c2)];
  const rad = Math.PI / 180, c = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7)));
  const [ap1, ap2] = [a1 * (1 + g), a2 * (1 + g)], [cp1, cp2] = [Math.hypot(ap1, b1), Math.hypot(ap2, b2)];
  const h = (b, a) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const [h1, h2, dl, dc] = [h(b1, ap1), h(b2, ap2), l2 - l1, cp2 - cp1];
  const dh = cp1 * cp2 === 0 ? 0 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 < -180 ? h2 - h1 + 360 : h2 - h1;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh * rad) / 2);
  const [lm, cm] = [(l1 + l2) / 2, (cp1 + cp2) / 2];
  const hm = cp1 * cp2 === 0 ? h1 + h2 : Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : (h1 + h2) / 2;
  const t = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const sl = 1 + (0.015 * (lm - 50) ** 2) / Math.sqrt(20 + (lm - 50) ** 2), sc = 1 + 0.045 * cm, sh = 1 + 0.015 * cm * t;
  const rt = -2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * (dc / sc) * (dH / sh));
}

export function gate(t) {
  const c = (k) => rgb(t[k]), out = [], bg = c("--bg");
  const needs = over(c("--r"), bg, 0.15);
  for (const b of ["--bg", "--card"]) {
    for (const k of ["--fg", "--mute", "--l", "--link", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a"]) out.push([`${k} on ${b}`, ratio(c(k), c(b)), 4.5]);
    for (const k of ["--g", "--a", "--r"]) out.push([`${k} on ${b}`, ratio(c(k), c(b)), 3]);
  }
  out.push(["--bg on --l", ratio(bg, c("--l")), 4.5]);
  for (const k of ["--fg", "--mute", "--l"]) out.push([`${k} on needs`, ratio(c(k), needs), 4.5]);
  out.push(["--r on needs", ratio(c("--r"), needs), 3], ["--r on red header", ratio(c("--r"), over(c("--r"), bg, 0.12)), 3], ["--a on amber header", ratio(c("--a"), over(c("--a"), bg, 0.12)), 3]);
  const pairs = [["--g", "--a"], ["--a", "--r"], ["--g", "--r"], ...["--l", "--link"].flatMap((x) => ["--g", "--a", "--r"].map((y) => [x, y]))];
  for (const [x, y] of pairs) out.push([`ΔE ${x}↔${y}`, de(c(x), c(y)), 20]);
  return out;
}
