import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";

const web = fileURLToPath(new URL("../../", import.meta.url));
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/block.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;
const css = readFileSync(new URL("../../dist/blocks.css", import.meta.url), "utf8");

test("a checkbox toggle's row is a tap target at least 44 px tall in HTML and React: a tap on its label ticks it and the form sends true", async () => {
  const browser = await webkit.launch();
  const p = await browser.newPage();
  await p.setContent("<base href=https://x.test/><div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
  await p.addStyleTag({ content: css });
  const f = { type: "form", id: "f", submit: { action: "go", label: "Go" }, fields: [{ type: "toggle", name: "full", label: "Received in full", as: "check" }] };
  await p.evaluate((b) => {
    window.posts = [];
    window.sent = [];
    const ctx = { screen: "s", act: async (a) => (window.posts.push(a), true), tap: () => {}, open: new Set(), theme: window.H.plain, store: { get: () => null, put: () => {} }, held: new Map() };
    document.getElementById("html").replaceChildren(window.H.render(b, ctx));
    window.R.boot(document.getElementById("react"), b, { sent: (a) => (window.sent.push(a), true), dropped: () => {} });
  }, { type: "screen", id: "s", title: "S", blocks: [f] });
  for (const root of ["#html", "#react"]) {
    const box = p.locator(`${root} input[name="full"]`);
    ok((await p.locator(`${root} label.fd`).boundingBox()).height >= 44, `${root} row height`);
    strictEqual(await box.getAttribute("role"), null);
    await p.click(`${root} label.fd .fk`);
    strictEqual(await box.isChecked(), true);
    await p.click(`${root} [data-submit]`);
  }
  await p.waitForFunction(() => window.sent.length === 1);
  const [posts, sent] = await p.evaluate(() => [window.posts, window.sent]);
  deepStrictEqual(posts, [{ action: "go", block: "f", values: { full: true } }]);
  deepStrictEqual(sent, [{ screen: "s", ...posts[0] }]);
  await browser.close();
});
