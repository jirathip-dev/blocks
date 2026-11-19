import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { after, before, test } from "node:test";
import { webkit } from "playwright";

const SITE = process.env.SITE ?? "";
const BASE = "http://site.test/blocks/";
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
let browser;
before(async () => {
  ok(SITE && existsSync(join(SITE, "index.html")), "SITE names no built site: cargo run -p blocks-site -- <dir>");
  browser = await webkit.launch();
});
after(() => browser?.close());

async function open(file, { js = true, still = false, width = 390 } = {}) {
  const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const stray = [];
  const warned = [];
  page.on("console", (m) => m.type() === "warning" && warned.push(m.text()));
  await page.route("**/*", (r) => {
    const url = r.request().url();
    if (!url.startsWith("http://site.test/")) return r.abort();
    const path = url.slice(BASE.length).split(/[?#]/)[0] || "index.html";
    if (!url.startsWith(BASE) || !existsSync(join(SITE, path))) {
      stray.push(url);
      return r.fulfill({ status: 404 });
    }
    let body = readFileSync(join(SITE, path));
    if (still && path.endsWith(".html")) body = Buffer.from(body.toString().replace(/<script type="module"[^>]*><\/script>/, ""));
    return r.fulfill({ body, contentType: TYPES[extname(path)] ?? "application/octet-stream" });
  });
  await page.goto(BASE + file);
  await page.setViewportSize({ width, height: await page.evaluate(() => document.documentElement.scrollHeight) });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 5000 });
  return { page, stray, warned, close: () => ctx.close() };
}

const tree = (page) =>
  page.evaluate(async () => {
    const B = await import(new URL("blocks.js", location.href).href);
    return B.dump(document.querySelector("main"));
  });

const files = SITE ? readdirSync(SITE).filter((f) => f.endsWith(".html")).sort() : [];

test("every page is the same PNG and tree before and after blocks.js adopts it, all under /blocks/", async () => {
  strictEqual(files.length, 31);
  for (const f of files) {
    const off = await open(f, { js: false });
    const png = await off.page.screenshot({ fullPage: true });
    deepStrictEqual(off.stray, [], f);
    await off.close();
    const plain = await open(f, { still: true });
    const want = await tree(plain.page);
    await plain.close();
    const on = await open(f);
    ok(png.equals(await on.page.screenshot({ fullPage: true })), `${f}: the PNG changed when blocks.js adopted it`);
    deepStrictEqual(await tree(on.page), want, f);
    deepStrictEqual(on.warned, [], f);
    deepStrictEqual(on.stray, [], f);
    await on.close();
  }
});

test("with JS off a link bar link goes to its page under the sub-path", async () => {
  const { page, close } = await open("index.html", { js: false });
  await page.click('[data-id="site-nav"] a[href="gallery.html"]');
  await page.waitForURL(`${BASE}gallery.html`);
  await page.click('a[href="kind-stat.html"]');
  await page.waitForURL(`${BASE}kind-stat.html`);
  ok((await page.textContent("main")).includes("Figures: one tile, or a list of tiles."));
  await close();
});

const bg = (page, sel = ":root") => page.evaluate((s) => getComputedStyle(document.querySelector(s)).getPropertyValue("--bg").trim(), sel);

test("JS off: the three schemes side by side; JS on: the look sheet switches the whole site and keeps it", async () => {
  const off = await open("schemes.html", { js: false });
  deepStrictEqual(await Promise.all(["light", "dark", "paper"].map((s) => bg(off.page, `[data-id="s-${s}"]`))), ["#f6f6f6", "#161616", "#f3eee4"]);
  await off.close();
  const on = await open("schemes.html");
  strictEqual(await bg(on.page), "#f6f6f6");
  await on.page.click('[data-id="look"]');
  const rows = on.page.locator(".b-sheet .row");
  deepStrictEqual(await rows.allTextContents(), ["✓ the app's own", "Default dark", "Default light", "Paper"]);
  await rows.filter({ hasText: "Paper" }).click();
  strictEqual(await bg(on.page), "#f3eee4");
  strictEqual(await on.page.locator(".b-sheet .row.on").textContent(), "✓ Paper");
  await on.page.goto(`${BASE}gallery.html`);
  strictEqual(await bg(on.page), "#f3eee4");
  await on.close();
});
