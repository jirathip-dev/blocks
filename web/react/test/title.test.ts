import { deepStrictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";
import { css } from "../../src/core/index.ts";
import { defaultPair } from "../../src/gen/schemes.ts";

const web = fileURLToPath(new URL("../../", import.meta.url));
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/block.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;
const sheet = readFileSync(new URL("../../dist/blocks.css", import.meta.url), "utf8");

test("a screen title keeps its case in the markup and the look sets it: lowercase by default, as written with labels.screen as-is", async () => {
  const browser = await webkit.launch();
  const p = await browser.newPage();
  await p.setContent("<style id=sheet></style><style id=look></style><div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
  await p.evaluate(async (s) => {
    document.getElementById("sheet").textContent = s;
    const b = { type: "screen", id: "s", title: "Delivery · Trips", blocks: [] };
    const ctx = { screen: "s", act: async () => true, tap: () => {}, open: new Set(), theme: window.H.plain, store: { get: () => null, put: () => {} }, held: new Map() };
    document.getElementById("html").replaceChildren(window.H.render(b, ctx));
    window.R.boot(document.getElementById("react"), b, { sent: () => true, dropped: () => {} });
    await new Promise((t) => setTimeout(t));
  }, sheet);
  const titles = (look) =>
    p.evaluate((l) => {
      document.getElementById("look").textContent = l;
      return ["#html", "#react"].map((r) => document.querySelector(`${r} .b-screen__title`).innerText);
    }, look);
  deepStrictEqual(await titles(css(defaultPair)), ["delivery · trips", "delivery · trips"]);
  deepStrictEqual(await titles(css(defaultPair, { labels: { screen: { case: "as-is" } } })), ["Delivery · Trips", "Delivery · Trips"]);
  await browser.close();
});
