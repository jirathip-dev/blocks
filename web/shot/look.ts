import { inflateSync } from "node:zlib";

const TOKENS = ["--seam", "--radius", "--dot-size", "--dot-gap", "--dot"];
const TOLERANCE = 2;

const paeth = (a, b, c) => {
  const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

function pixels(png) {
  const idat = [];
  let width = 0, bpp = 4;
  for (let i = 8; i < png.length; i += 12 + png.readUInt32BE(i)) {
    const type = png.toString("latin1", i + 4, i + 8), body = png.subarray(i + 8, i + 8 + png.readUInt32BE(i));
    if (type === "IHDR") (width = body.readUInt32BE(0)), (bpp = body[9] === 6 ? 4 : 3);
    if (type === "IDAT") idat.push(body);
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * bpp, rows = [];
  let prev = new Uint8Array(stride);
  for (let p = 0; p < raw.length; p += stride + 1) {
    const f = raw[p], line = raw.subarray(p + 1, p + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      line[x] += f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0;
    }
    rows.push((prev = line));
  }
  return (x, y) => [...(rows[Math.floor(y)]?.subarray(Math.floor(x) * bpp, Math.floor(x) * bpp + 3) ?? [])];
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const near = (got, want) => got.length === 3 && got.every((v, i) => Math.abs(v - want[i]) <= TOLERANCE);
const box = (n) => {
  const [x, y, w, h] = n.rect ?? [0, 0, 0, 0];
  return { x, y, w, h, bottom: y + h };
};
const rows = (n) => (n.children.filter((c) => c.kind === "row").length > 1 ? n.children.filter((c) => c.kind === "row") : n.children.map(rows).find(Boolean));

/// The facts a look's tokens promise, measured on a kinds page's rects and its PNG at `scale`: seam, corner, edge, fill, page and dot grid.
export function measure(png, tree, colours, style, scale = 1) {
  const at = pixels(png);
  const [seam, radius, size, gap] = TOKENS.slice(0, 4).map((k) => parseFloat(style[k]));
  const dot = rgb(style["--dot"].replace(/^var\((--[\w-]+)\)$/, (_, k) => colours[k]));
  const [bg, card, edge] = ["--bg", "--card", "--edge"].map((k) => rgb(colours[k]));
  const ground = (x, y) => (x % gap >= gap - size && y % gap >= gap - size ? dot : bg);
  const tiles = rows(tree), [s0, s1] = tree.children.map(box);
  if (!tiles || !s1) return ["look: no two sibling rows and two sections to measure"];
  const [a, b] = tiles.map(box);
  const yd = Math.ceil((s0.bottom + 1 + size) / gap) * gap - size / 2, xd = Math.floor((s0.w * 0.75) / gap) * gap - size / 2;
  const facts = [
    ["the corner", a.x, a.y, radius === 0 ? edge : ground(a.x, a.y)],
    ["the edge", a.x, a.y + a.h / 2, edge],
    ["inside the 1px edge", a.x + 1, a.y + a.h / 2, card],
    ["the fill", a.x + 4, a.y + a.h / 2, card],
    ["the page in the seam", a.x + a.w / 2, a.bottom + seam / 2, ground(a.x + a.w / 2, a.bottom + seam / 2)],
    ["a grid dot", xd, yd, dot],
    ["the page between dots", xd - gap / 2, yd, bg],
  ];
  const out = facts
    .filter(([, x, y, want]) => !near(at(x * scale, y * scale), want))
    .map(([what, x, y, want]) => `look: ${what} at ${x},${y} is rgb(${at(x * scale, y * scale)}), expected rgb(${want})`);
  if (Math.abs(b.y - a.bottom - seam) > 0.5) out.push(`look: the seam is ${b.y - a.bottom}, the token says ${seam}`);
  if ((s1.y - s0.bottom) % gap) out.push(`look: the section gap ${s1.y - s0.bottom} is no multiple of the dot gap ${gap}`);
  return out;
}

/// The page's tile tokens as its root declares them, for `measure`.
export const declared = (page) => page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, getComputedStyle(document.documentElement).getPropertyValue(k).trim()])), TOKENS);
