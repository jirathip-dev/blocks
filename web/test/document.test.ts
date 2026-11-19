import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { buildSync } from "esbuild";
import { webkit } from "playwright";

const at = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(at(p), "utf8");
const code = buildSync({ entryPoints: [at("../src/shell.ts").pathname], bundle: true, format: "iife", globalName: "B", write: false }).outputFiles[0].text;
const quote = read("../../fixtures/blocks/pages.json");
let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(reduced: boolean) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.clock.install();
  await page.setContent(`<!doctype html><style>${read("../../fixtures/css/default.css")}</style><style>${read("../dist/blocks.css")}</style><body><main></main>`);
  await page.addScriptTag({ content: code });
  await page.evaluate((b) => {
    window.sent = [];
    window.ctx = { screen: "s", act: async (a) => (window.sent.push(a), true), tap: () => {}, open: new Set(), theme: window.B.plain, store: { get: () => null, put: () => {} } };
    window.draw = () => {
      const e = window.B.render(JSON.parse(b), window.ctx);
      const was = document.querySelector(".b-pages");
      if (was) was.replaceWith(e);
      else document.querySelector("main").append(e);
    };
    window.draw();
  }, quote);
  return page;
}

const seen = (page) =>
  page.evaluate(() => {
    const s = document.querySelector(".b-pages");
    const b = (n) => s.querySelector(`[aria-label="${n}"]`);
    return {
      count: s.querySelector(".dcc").textContent,
      fit: b("fit to width").textContent,
      off: ["previous page", "next page", "zoom out", "fit to width", "zoom in"].filter((n) => b(n).disabled),
      z: s.querySelector(".dck").style.getPropertyValue("--z"),
      moving: s.querySelector(".dck").style.transform,
    };
  });

test("pages: the head, the region and each page named, a page that fails shows its alt, and the PDF link", async () => {
  const page = await open(true);
  await page.waitForFunction(() => document.querySelector(".dcx"));
  const got = await page.evaluate(() => {
    const s = document.querySelector(".b-pages");
    return {
      root: [s.tagName, s.getAttribute("role"), s.getAttribute("aria-label")],
      region: [s.querySelector(".dcw").getAttribute("role"), s.querySelector(".dcw").getAttribute("aria-label"), s.querySelector(".dcw").tabIndex],
      pdf: [s.querySelector("a.btn").getAttribute("href"), s.querySelector("a.btn").getAttribute("aria-label")],
      note: s.querySelector(".dcn").textContent,
      names: [...s.querySelectorAll(".dc>img, .dc>.dcx")].map((x) => x.getAttribute("alt") ?? x.getAttribute("aria-label")),
      captions: s.querySelectorAll("figcaption").length,
    };
  });
  const failed = await page.evaluate(() => [...document.querySelectorAll(".dcx")].map((x) => [x.getAttribute("role"), x.textContent]));
  deepStrictEqual(got.root, ["SECTION", "group", "Q-2026-0418 rev 3"]);
  deepStrictEqual(got.region, ["region", "Q-2026-0418 rev 3, 3 pages", 0]);
  deepStrictEqual(got.pdf, ["/q/0418.pdf", "download Q-2026-0418 rev 3 as PDF"]);
  strictEqual(got.note, "Out of date: the prices changed after this was drawn.");
  ok(got.names[1].startsWith("Page 2 of 3. Terms and conditions, clauses 1 to 6"), got.names[1]);
  strictEqual(got.captions, 0, "no per-page caption repeats the head's counter");
  deepStrictEqual(failed[0], ["img", "Page 1 didn't load. Cover and priced items: 8 lines, total 51,092.50 including VAT"]);
  deepStrictEqual(await seen(page), { count: "page 1 of 3", fit: "fit", off: ["previous page", "zoom out", "fit to width"], z: "1", moving: "" });
  await page.close();
});

test("pages: keys and buttons zoom and page, a redraw keeps the view and the focus, nothing is sent", async () => {
  const page = await open(true);
  await page.focus(".dcw");
  await page.keyboard.press("+");
  deepStrictEqual(await seen(page), { count: "page 1 of 3", fit: "125%", off: ["previous page"], z: "1.25", moving: "" });
  await page.keyboard.press("PageDown");
  const [count, gap] = await page.evaluate(() => {
    const head = document.querySelector(".dch").getBoundingClientRect();
    return [document.querySelector(".dcc").textContent, document.querySelectorAll(".dc")[1].getBoundingClientRect().top - head.bottom];
  });
  strictEqual(count, "page 2 of 3");
  ok(gap >= 0 && gap <= 16, `page 2 sits under the head: ${gap}`);
  await page.evaluate(() => window.draw());
  await page.evaluate(() => new Promise((r) => queueMicrotask(r)));
  deepStrictEqual(await seen(page), { count: "page 2 of 3", fit: "125%", off: [], z: "1.25", moving: "" });
  strictEqual(await page.evaluate(() => document.activeElement?.className), "dcw", "focus back on the pages");
  await page.click('[aria-label="next page"]');
  deepStrictEqual([(await seen(page)).count, (await seen(page)).off], ["page 3 of 3", ["next page"]]);
  await page.click('[aria-label="previous page"]');
  strictEqual((await seen(page)).count, "page 2 of 3");
  await page.focus(".dcw");
  for (let i = 0; i < 8; i++) await page.keyboard.press("+");
  deepStrictEqual([(await seen(page)).fit, (await seen(page)).off.includes("zoom in")], ["400%", true]);
  await page.click('[aria-label="fit to width"]');
  deepStrictEqual([(await seen(page)).fit, (await seen(page)).z], ["fit", "1"]);
  await page.click('[aria-label="zoom in"]');
  deepStrictEqual([(await seen(page)).fit, (await seen(page)).z], ["125%", "1.25"]);
  deepStrictEqual(await page.evaluate(() => window.sent), []);
  await page.close();
});

test("pages: a step zooms by transform and writes the width once settled; a Ctrl and wheel pinch only when the wheel stops", async () => {
  const page = await open(false);
  await page.focus(".dcw");
  await page.keyboard.press("+");
  const mid = await seen(page);
  deepStrictEqual([mid.z, mid.moving, mid.fit], ["1", "scale(1.25)", "fit"]);
  ok(await page.evaluate(() => document.querySelector(".dck").classList.contains("zs")), "eased over --settle");
  await page.evaluate(() => document.querySelector(".dck").dispatchEvent(new Event("transitionend")));
  deepStrictEqual(await seen(page), { count: "page 1 of 3", fit: "125%", off: ["previous page"], z: "1.25", moving: "" });
  await page.evaluate(() => document.querySelector(".dcw").dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -50, cancelable: true })));
  const live = await seen(page);
  deepStrictEqual([live.z, live.moving.slice(0, 12)], ["1.25", "scale(1.6487"]);
  ok(!(await page.evaluate(() => document.querySelector(".dck").classList.contains("zs"))), "following the fingers is no transition");
  await page.clock.runFor(200);
  const done = await seen(page);
  deepStrictEqual([Number(done.z).toFixed(4), done.moving, done.fit], [(1.25 * Math.exp(0.5)).toFixed(4), "", `${Math.round(125 * Math.exp(0.5))}%`]);
  await page.close();
});
