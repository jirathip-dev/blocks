import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { webkit } from "playwright";
import { buildSync } from "esbuild";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
test("prof", { timeout: 120000 }, async () => {
  const js = buildSync({ entryPoints: [at("../src/scan/page.ts")], bundle: true, format: "esm", write: false }).outputFiles[0].text;
  const b = await webkit.launch(), p = await b.newPage();
  await p.route("**/*", (r) => (r.request().url().endsWith("page.js") ? r.fulfill({ body: js, contentType: "text/javascript" }) : r.request().url().endsWith("w.js") ? r.fulfill({ body: "onmessage=(e)=>postMessage(e.data.width)", contentType: "text/javascript" }) : r.fulfill({ body: "<html></html>", contentType: "text/html" })));
  await p.goto("http://x.test/");
  const out = await p.evaluate(async (png) => {
    const m = await import("./page.js");
    const blob = new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], { type: "image/png" });
    const photo = await createImageBitmap(blob, { resizeWidth: 3024, resizeHeight: 4032 });
    const w = new Worker("./w.js");
    const rows = [];
    for (let i = 0; i < 4; i++) {
      const t = [performance.now()], lap = () => t.push(performance.now());
      await new Promise((done) => { w.onmessage = done; w.postMessage(photo); }); lap();
      const c = new OffscreenCanvas(640, 853), x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(photo, 0, 0, 640, 853); lap();
      const id = x.getImageData(0, 0, 640, 853); lap();
      const q = m.corners(id); lap();
      const k = 1754 / 4032, Q = q.map(([a, b]) => [(a * 4032) / 853 * k, (b * 4032) / 853 * k]);
      const f = new OffscreenCanvas(1316, 1754), fx = f.getContext("2d", { willReadFrequently: true }); fx.drawImage(photo, 0, 0, 1316, 1754); lap();
      const img = fx.getImageData(0, 0, 1316, 1754); lap();
      const wp = m.warp(img, Q); lap();
      const o = new OffscreenCanvas(1240, 1754); o.getContext("2d").putImageData(new ImageData(wp.data, 1240, 1754), 0, 0); const bm = o.transferToImageBitmap(); lap();
      const cv = Object.assign(document.createElement("canvas"), { width: 1240, height: 1754 }); cv.getContext("bitmaprenderer").transferFromImageBitmap(bm);
      await new Promise((done) => cv.toBlob(done, "image/jpeg", 0.8)); lap();
      rows.push(t.slice(1).map((v, j) => (v - t[j]).toFixed(0)).join(" "));
    }
    return rows.join(" | ");
  }, readFileSync(at("../../fixtures/scan/note.png")).toString("base64"));
  process.stdout.write(`PROF clone down read640 corners crop read warp put jpeg: ${out}\n`);
  await b.close();
});
