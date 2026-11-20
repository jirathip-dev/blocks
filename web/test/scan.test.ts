import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { webkit } from "playwright";
import { A4, corners, inset, pdf, turn, warp } from "../src/scan/page.ts";
import { buildSync } from "esbuild";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const want = JSON.parse(readFileSync(at("../../fixtures/scan/corners.json"), "utf8"));

function png(file) {
  const b = readFileSync(file), idat = [];
  const [width, height, depth, kind] = [b.readUInt32BE(16), b.readUInt32BE(20), b[24], b[25]];
  strictEqual(depth, 8, file);
  for (let i = 8; i < b.length; i += b.readUInt32BE(i) + 12) if (b.toString("ascii", i + 4, i + 8) === "IDAT") idat.push(b.subarray(i + 8, i + 8 + b.readUInt32BE(i)));
  const raw = inflateSync(Buffer.concat(idat)), bpp = kind === 6 ? 4 : 3, stride = width * bpp, px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], a = x >= bpp ? px[y * stride + x - bpp] : 0, u = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c);
      px[y * stride + x] = v + [0, a, u, (a + u) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? u : c][f];
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([px[i * bpp], px[i * bpp + 1], px[i * bpp + 2], 255], i * 4);
  return { width, height, data };
}

const edges = (img) => {
  const luma = (x, y) => {
    const i = (y * img.width + x) * 4;
    return (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
  };
  const band = (pick) => {
    let s = 0;
    for (let t = 0; t < 200; t++) s += luma(...pick(t / 200));
    return s / 200;
  };
  const [w, h] = [img.width - 1, img.height - 1], m = 0.015;
  return [band((t) => [Math.round(t * w), Math.round(m * h)]), band((t) => [Math.round((1 - m) * w), Math.round(t * h)]), band((t) => [Math.round(t * w), Math.round((1 - m) * h)]), band((t) => [Math.round(m * w), Math.round(t * h)])];
};

for (const name of Object.keys(want.corners)) {
  test(`fixtures/scan/${name}.png: the corners found are the page's within 1 % of the width, and the warp is an A4 page edge to edge`, () => {
    const img = png(at(`../../fixtures/scan/${name}.png`));
    deepStrictEqual([img.width, img.height], want.size);
    const found = corners(img);
    ok(found, name);
    found.forEach(([x, y], i) => {
      const [ex, ey] = want.corners[name][i];
      ok(Math.hypot(x - ex, y - ey) <= want.tolerance * img.width, `${name} corner ${i}: found ${x},${y}, the page's is ${ex},${ey}`);
    });
    const page = warp(img, found);
    deepStrictEqual([page.width, page.height, page.data.length], [...A4, A4[0] * A4[1] * 4]);
    for (const l of edges(page)) ok(l > 200, `${name}: an edge of the corrected page is ${l.toFixed(0)} bright, not paper: ${edges(page)}`);
    ok(Math.min(...edges(warp(img, inset(img.width, img.height)))) < 200, `${name}: the frame's inset takes in the desk, so the edge check can fail`);
    const turned = warp(img, turn(found), [40, 56]), flat = warp(img, found, [56, 40]);
    ok(turned.data.length === flat.data.length && turned.data.some((v, i) => v !== flat.data[i]), "turning the corners turns the page");
  });
}

test("a blank frame has no page, and the inset stands in", () => {
  const data = new Uint8ClampedArray(64 * 48 * 4).fill(90);
  strictEqual(corners({ width: 64, height: 48, data }), undefined);
  deepStrictEqual(inset(100, 200), [[10, 20], [90, 20], [90, 180], [10, 180]]);
});

test("the PDF holds each JPEG on its own A4 page, in order, with an xref that points at each object", async () => {
  const jpeg = (n) => ({ bytes: new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9]), width: 1240, height: 1754 });
  const bytes = Buffer.from(await pdf([jpeg(1), jpeg(2)]).arrayBuffer()), text = bytes.toString("latin1");
  ok(text.startsWith("%PDF-1.4\n"));
  ok(text.endsWith("%%EOF\n"));
  ok(text.includes("/Count 2"), text);
  strictEqual(text.match(/\/MediaBox \[0 0 595\.28 841\.89\]/g)?.length, 2);
  ok(bytes.indexOf(Buffer.from([0xff, 0xd8, 1])) < bytes.indexOf(Buffer.from([0xff, 0xd8, 2])), "page 1 comes first");
  const xref = Number(text.match(/startxref\n(\d+)/)[1]), offsets = text.slice(xref).match(/^\d{10} 00000 n $/gm).map((l) => Number(l.slice(0, 10)));
  strictEqual(offsets.length, 8);
  offsets.forEach((o, i) => ok(text.startsWith(`${i + 1} 0 obj`, o), `object ${i + 1} at ${o}`));
});

const BASE = "http://scan.test/";
const SCREEN = { type: "screen", id: "s", blocks: [{ type: "form", id: "f", submit: { action: "send", label: "send" }, fields: [{ type: "scan", name: "note", label: "Delivery note", max: 3 }] }] };
const PAGE = `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><body><div id=root></div>
<script type=module>
import * as B from "./blocks.js";
const h = (window.h = { sent: [], files: [] });
const file = async (blob, a) => {
  const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());
  h.files.push({ name: a.name, mime: a.mime, type: blob.type, head: text.slice(0, 8), pages: (text.match(/\\/Type \\/Page\\b/g) ?? []).length, size: blob.size });
  return { id: "pdf-" + h.files.length, name: a.name };
};
const root = document.getElementById("root"), screen = ${JSON.stringify(SCREEN)};
if (location.search === "?react") {
  const R = await import("./react.js");
  R.boot(root, screen, { sent: (a) => (h.sent.push(a), true), dropped: () => {}, file });
} else {
  const ctx = { file, screen: "s", act: async (a) => (h.sent.push(a), true), open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} }, drop: () => {}, held: new Map() };
  root.replaceChildren(B.render(screen, ctx));
  B.behave(root, () => screen);
}
h.ready = true;
</script>`;
const dist = (f) => readFileSync(at(`../dist/${f}`));
let react;
const reactJs = () => (react ??= buildSync({ entryPoints: [at("../shot/react.ts")], bundle: true, format: "esm", write: false, define: { "process.env.NODE_ENV": '"production"' } }).outputFiles[0].text);

async function scanner(adapter) {
  const browser = await webkit.launch(), page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route((u) => u.href.startsWith(BASE), (r) => {
    const p = r.request().url().slice(BASE.length).replace(/\?.*/, "");
    if (p === "") return r.fulfill({ body: PAGE, contentType: "text/html" });
    if (p === "react.js") return r.fulfill({ body: reactJs(), contentType: "text/javascript" });
    if (["blocks.js", "blocks.css", "scan.js"].includes(p)) return r.fulfill({ body: dist(p), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(`${BASE}?${adapter}`);
  await page.waitForFunction(() => window.h?.ready);
  return { browser, page, errors };
}

test("the scan field in WebKit, HTML and React: no camera, pick a skewed photo, move a corner, use it, done: one A4 PDF goes to the handler and the form sends its id", { timeout: 60000 }, async () => {
  for (const adapter of ["html", "react"]) {
    const { browser, page, errors } = await scanner(adapter);
    try {
      const field = page.locator('[data-field="note"]');
      await field.getByRole("button", { name: "scan pages: Delivery note" }).click();
      const dlg = page.getByRole("dialog", { name: "Delivery note" });
      await dlg.getByText(/^(no camera here|the camera is blocked for this site)$/).waitFor();
      await dlg.locator("input[type=file]").setInputFiles(at("../../fixtures/scan/note.png"));
      const tl = dlg.getByRole("slider", { name: "top-left corner" });
      await tl.waitFor();
      strictEqual(await dlg.getByRole("slider").count(), 4, adapter);
      const before = await tl.getAttribute("aria-valuetext");
      for (const k of ["Space", "ArrowRight", "Enter"]) await tl.press(k);
      ok((await tl.getAttribute("aria-valuetext")) !== before, `${adapter}: the arrow key moves the focused corner from ${before}`);
      await dlg.getByRole("button", { name: "use page" }).click();
      await dlg.getByRole("img", { name: "page 1" }).waitFor();
      ok(await dlg.getByRole("button", { name: "move later" }).isDisabled(), adapter);
      await dlg.getByRole("button", { name: "done · 1 page" }).click();
      await dlg.waitFor({ state: "detached" });
      await field.getByText(/^1 page · A4 · \d+ KB$/).waitFor();
      const files = await page.evaluate(() => window.h.files);
      deepStrictEqual(files.map((f) => [f.name, f.mime, f.type, f.head, f.pages]), [["delivery-note.pdf", "application/pdf", "application/pdf", "%PDF-1.4", 1]], adapter);
      await page.getByRole("button", { name: "send" }).click();
      await page.waitForFunction(() => window.h.sent.length);
      deepStrictEqual((await page.evaluate(() => window.h.sent))[0].values, { note: ["pdf-1"] }, `${adapter}: ids, never bytes`);
      deepStrictEqual(errors, [], adapter);
    } finally {
      await browser.close();
    }
  }
});

test("one page, shutter to corrected image (corners on 640 px, then the warp and JPEG of a 1920 × 2560 camera JPEG), stays within the budget at p95 in WebKit's worker (400 ms in the release perf job, 1200 ms per PR); a larger photo is scaled to 2560 px long once", { timeout: 60000 }, async () => {
  const { browser, page, errors } = await scanner("html");
  try {
    const { scaled, runs } = await page.evaluate(async (png) => {
      const blob = new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: "image/png" });
      const m = await import("./scan.js"), took = [];
      const jpeg = async (w, h) => {
        const c = new OffscreenCanvas(w, h);
        c.getContext("2d").drawImage(await createImageBitmap(blob), 0, 0, w, h);
        return c.convertToBlob({ type: "image/jpeg", quality: 0.92 });
      };
      const big = await m.quadOf(await jpeg(3024, 4032));
      const scaled = [big.photo.width, big.photo.height, big.quad[2][0] <= 1920, big.quad[2][1] <= 2560];
      for (let i = 0; i < 6; i++) {
        const taken = await jpeg(1920, 2560);
        const t0 = performance.now(), shot = await m.quadOf(taken), page = await m.pageOf(shot, shot.quad, shot.quad);
        took.push({ ms: performance.now() - t0, found: shot.quad[0][0] > 1920 * 0.15, jpeg: [page.jpeg[0], page.jpeg[1]] });
      }
      return { scaled, runs: took.slice(1) };
    }, readFileSync(at("../../fixtures/scan/note.png")).toString("base64"));
    deepStrictEqual(scaled, [1920, 2560, true, true], "a 3024 × 4032 photo is 1920 × 2560 on the page and in the worker, whose corners are in that size");
    for (const r of runs) deepStrictEqual([r.found, r.jpeg], [true, [0xff, 0xd8]], "the corners are the page's, not the inset, and the page is a JPEG");
    const p95 = runs.map((r) => r.ms).sort((a, b) => a - b)[Math.ceil(runs.length * 0.95) - 1];
    const budget = Number(process.env.BLOCKS_SCAN_BUDGET_MS ?? 1200);
    process.stdout.write(`scan page p95 ${p95.toFixed(0)} ms, budget ${budget} ms: ${runs.map((r) => r.ms.toFixed(0))}\n`);
    ok(p95 <= budget, `p95 ${p95.toFixed(0)} ms over the ${budget} ms budget: ${runs.map((r) => r.ms.toFixed(0))}`);
    deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
});
