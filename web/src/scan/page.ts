/// A point in pixels.
export type Pt = [x: number, y: number];
/// A page's corners: top-left, top-right, bottom-right, bottom-left.
export type Quad = [Pt, Pt, Pt, Pt];
/// RGBA pixels, as `ImageData` holds them.
export type Img = { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> };
/// A corrected page's JPEG and its size in pixels.
export type Jpeg = { bytes: Uint8Array; width: number; height: number };

/// A4 at 150 dpi, the size each page is corrected to.
export const A4: Pt = [1240, 1754];

function grey(img: Img): Uint8Array {
  const n = img.width * img.height, g = new Uint8Array(n), d = img.data;
  for (let i = 0; i < n; i++) g[i] = ((d[i * 4] ?? 0) * 77 + (d[i * 4 + 1] ?? 0) * 150 + (d[i * 4 + 2] ?? 0) * 29) >> 8;
  const b = new Uint8Array(n), w = img.width;
  for (let i = 0; i < n; i++) {
    const x = i % w, l = x ? i - 1 : i, r = x < w - 1 ? i + 1 : i, u = i >= w ? w : 0, o = i + w < n ? w : 0;
    b[i] = ((g[l - u] ?? 0) + (g[i - u] ?? 0) + (g[r - u] ?? 0) + (g[l] ?? 0) + (g[i] ?? 0) + (g[r] ?? 0) + (g[l + o] ?? 0) + (g[i + o] ?? 0) + (g[r + o] ?? 0)) / 9;
  }
  return b;
}

function otsu(g: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of g) hist[v] = (hist[v] ?? 0) + 1;
  const all = hist.reduce((s, c, i) => s + c * i, 0);
  let below = 0, sum = 0, best = 0, cut = 128;
  for (let t = 0; t < 256; t++) {
    below += hist[t] ?? 0;
    sum += t * (hist[t] ?? 0);
    const above = g.length - below;
    if (!below || !above) continue;
    const gap = below * above * (sum / below - (all - sum) / above) ** 2;
    if (gap > best) [best, cut] = [gap, t];
  }
  return cut;
}

/// The page's corners in `img` (best at most 640 px long): the largest bright region's four extremes, or `undefined` when none covers a tenth of it.
export function corners(img: Img): Quad | undefined {
  const { width: w, height: h } = img, g = grey(img), cut = otsu(g), seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
  let best: Quad | undefined, most = (w * h) / 10;
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || (g[s] ?? 0) <= cut) continue;
    let n = 0, top = 0;
    const q: Quad = [[0, 0], [0, 0], [0, 0], [0, 0]], k = [-Infinity, -Infinity, -Infinity, -Infinity];
    stack[top++] = s;
    seen[s] = 1;
    while (top) {
      const i = stack[--top] ?? 0, x = i % w, y = (i - x) / w;
      n++;
      [-x - y, x - y, x + y, y - x].forEach((v, c) => {
        if (v > (k[c] ?? 0)) [k[c], q[c]] = [v, [x, y]];
      });
      for (const j of [x ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || (g[j] ?? 0) <= cut) continue;
        seen[j] = 1;
        stack[top++] = j;
      }
    }
    if (n > most) [most, best] = [n, q];
  }
  if (!best) return undefined;
  const [a, b, c, d] = best.map(([x, y]): Pt => [x + 0.5, y + 0.5]);
  return a && b && c && d ? [a, b, c, d] : undefined;
}

function square(q: Quad) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h };
}

/// The page inside `q` in `img`, straightened to `size` (A4 by default) with bilinear sampling.
export function warp(img: Img, q: Quad, [width, height]: Pt = A4): Img {
  const { a, b, c, d, e, f, g, h } = square(q), src = img.data, sw = img.width, data = new Uint8ClampedArray(width * height * 4);
  const mx = img.width - 1.001, my = img.height - 1.001;
  for (let j = 0; j < height; j++) {
    const v = (j + 0.5) / height;
    for (let i = 0; i < width; i++) {
      const u = (i + 0.5) / width, z = g * u + h * v + 1;
      const x = Math.min(mx, Math.max(0, (a * u + b * v + c) / z - 0.5)), y = Math.min(my, Math.max(0, (d * u + e * v + f) / z - 0.5));
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, p = (y0 * sw + x0) * 4, o = (j * width + i) * 4;
      for (let k = 0; k < 3; k++) {
        const top = (src[p + k] ?? 0) * (1 - fx) + (src[p + 4 + k] ?? 0) * fx, low = (src[p + sw * 4 + k] ?? 0) * (1 - fx) + (src[p + sw * 4 + 4 + k] ?? 0) * fx;
        data[o + k] = top * (1 - fy) + low * fy;
      }
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

/// The corners turned a quarter clockwise: the page warped from them comes out rotated.
export const turn = ([a, b, c, d]: Quad): Quad => [d, a, b, c];

/// The corners a frame starts with when no edge is found: its own, inset by a tenth.
export const inset = (w: number, h: number): Quad => [[w * 0.1, h * 0.1], [w * 0.9, h * 0.1], [w * 0.9, h * 0.9], [w * 0.1, h * 0.9]];

/// A PDF of `pages`, each a JPEG filling one A4 sheet, in order.
export function pdf(pages: Jpeg[]): Blob {
  const parts: (string | Uint8Array<ArrayBuffer>)[] = [], at: number[] = [];
  let n = 0;
  const put = (x: string | Uint8Array) => {
    const b = typeof x === "string" ? new TextEncoder().encode(x) : new Uint8Array(x);
    parts.push(b);
    n += b.length;
  };
  const obj = (id: number, ...body: (string | Uint8Array)[]) => {
    at[id] = n;
    put(`${id} 0 obj\n`);
    body.forEach(put);
    put("\nendobj\n");
  };
  put("%PDF-1.4\n%\u00e2\u00e3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const id = 3 + i * 3, draw = "q 595.28 0 0 841.89 0 0 cm /I Do Q";
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /I ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    obj(id + 1, `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`, p.bytes, "\nendstream");
    obj(id + 2, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  });
  const size = 3 + pages.length * 3, xref = n;
  put(`xref\n0 ${size}\n0000000000 65535 f \n${at.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  put(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}
