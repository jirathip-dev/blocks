import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const web = fileURLToPath(new URL("../../", import.meta.url));
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/block.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;
const quote = JSON.parse(read("../../../fixtures/blocks/pages.json"));
const screen = { type: "screen", id: "s", title: "Quote", blocks: [quote] };

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(adapter) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.setContent(`<!doctype html><style>${read("../../../fixtures/css/default.css")}</style><style>${read("../../dist/blocks.css")}</style><body><main></main>`);
  await page.addScriptTag({ content: adapter === "react" ? reactJs() : html });
  await page.evaluate(
    ([s, react]) => {
      window.sent = [];
      const root = document.querySelector("main");
      const ctx = { screen: "s", act: async (a) => (window.sent.push(a), true), tap: () => {}, open: new Set(), theme: window.H?.plain, store: { get: () => null, put: () => {} } };
      const view = react ? window.R.boot(root, s, { sent: (a) => (window.sent.push(a), true), dropped: () => {} }) : null;
      window.draw = (next) => (view ? view.set(next) : root.replaceChildren(window.H.render(next, ctx)));
      if (!view) window.draw(s);
    },
    [screen, adapter === "react"],
  );
  await page.waitForFunction(() => document.querySelector(".b-pages .dcx"));
  return page;
}

const seen = (page) =>
  page.evaluate(() => {
    const s = document.querySelector(".b-pages");
    const b = (n) => s.querySelector(`[aria-label="${n}"]`);
    return {
      root: [s.tagName, [...s.classList].sort().join(" "), s.getAttribute("role"), s.getAttribute("aria-label")],
      count: s.querySelector(".dcc").textContent,
      fit: b("fit to width").textContent,
      off: ["previous page", "next page", "zoom out", "fit to width", "zoom in"].filter((n) => b(n).disabled),
      z: s.querySelector(".dck").style.getPropertyValue("--z"),
      focus: document.activeElement?.getAttribute("aria-label") ?? null,
      sent: window.sent,
    };
  });

const pics = (page) => page.evaluate(() => [...document.querySelectorAll(".dc>img, .dc>.dcx")].map((x) => [x.tagName, x.className, x.getAttribute("role"), x.getAttribute("alt") ?? x.getAttribute("aria-label"), x.textContent]));

async function run(adapter) {
  const page = await open(adapter);
  const states = [{ ...(await seen(page)), pics: await pics(page) }];
  const steps = [
    () => page.focus(".dcw"),
    () => page.keyboard.press("+"),
    () => page.keyboard.press("PageDown"),
    () => page.evaluate((s) => window.draw({ ...s, blocks: [{ ...s.blocks[0], note: "Redrawn by the app." }] }), screen),
    () => page.evaluate(() => new Promise((r) => queueMicrotask(r))),
    () => page.click('[aria-label="next page"]'),
    () => page.click('[aria-label="previous page"]'),
    () => page.click('[aria-label="zoom in"]'),
    () => page.click('[aria-label="zoom out"]'),
    () => page.click('[aria-label="fit to width"]'),
    () => page.evaluate(() => document.querySelector(".dcw").dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -50, cancelable: true }))),
    () => page.clock.runFor(200),
    () => page.focus(".dcw"),
    () => page.keyboard.press("0"),
  ];
  for (const step of steps) {
    await step();
    states.push(await seen(page));
  }
  await page.close();
  return states;
}

test("a React pages view pages and zooms as the web view does by keys, the named buttons and a Ctrl-wheel pinch, names a page that didn't load, keeps its place over a redraw and sends nothing", async () => {
  const [web, react] = [await run("html"), await run("react")];
  deepStrictEqual(react, web);
  deepStrictEqual(web[0].pics[0].slice(0, 3), ["DIV", "dcx bad", "img"]);
  deepStrictEqual(web[0].root, ["SECTION", "b b-pages dcs", "group", "Q-2026-0418 rev 3"]);
  deepStrictEqual([web[3].count, web[3].fit], ["page 2 of 3", "125%"]);
  deepStrictEqual([web[5].count, web[5].fit, web[5].focus], ["page 2 of 3", "125%", "Q-2026-0418 rev 3, 3 pages"]);
  strictEqual(web[12].fit, `${Math.round(100 * Math.exp(0.5))}%`);
  deepStrictEqual([web.at(-1).fit, web.at(-1).z], ["fit", "1"]);
  deepStrictEqual(web.at(-1).sent, []);
});
