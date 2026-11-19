import { deepStrictEqual, match, strictEqual, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../src/gen/schemes.ts";
import { css, gated } from "../src/core/index.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const button = (id) => `<button id=${id} class="b b-button" data-block="button"><span>${id}</span></button>`;
const view =
  `<div class=b-view>${button("in")}` +
  `<x-map class="b b-island" data-block="island">${button("island")}</x-map>` +
  `<div class="b b-app" data-block="clock">${button("app")}</div>` +
  `<x-map class="b b-island" data-block="island" data-fallback="">${button("fallback")}</x-map></div>${button("beside")}`;

let browser;
let page;
before(async () => {
  browser = await webkit.launch();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(`<!doctype html><meta charset=utf-8><style>${read("../dist/blocks.scoped.css")}</style><body>${view}`);
});
after(() => browser.close());

const drawn = (id) =>
  page.evaluate((i) => {
    const b = document.getElementById(i);
    return { bracket: getComputedStyle(b, "::before").content, height: getComputedStyle(b).height };
  }, id);

test("blocks.scoped.css draws a button inside the view and a fallback, never one beside it or inside an island or app kind", async () => {
  const look = { bracket: '"["', height: "28px" };
  deepStrictEqual(await drawn("in"), look);
  deepStrictEqual(await drawn("fallback"), look);
  for (const id of ["beside", "island", "app"]) strictEqual((await drawn(id)).bracket, "none", id);
  for (const id of ["beside", "island", "app"]) strictEqual((await drawn(id)).height === look.height, false, id);
});

test("gated passes the default pair and its CSS is the pair's", () => {
  const look = gated(defaultPair);
  deepStrictEqual([look.light, look.dark], [defaultPair.light, defaultPair.dark]);
  strictEqual(css(look), css(defaultPair));
});

test("gated throws one error listing every miss of both schemes", () => {
  const blind = (s) => ({ ...s, tokens: { ...s.tokens, "--fg": s.tokens["--bg"] } });
  throws(
    () => gated({ light: blind(defaultPair.light), dark: blind(defaultPair.dark) }),
    (e) => {
      match(e.message, /light: --fg on --bg is 1\.00, under 4\.5/);
      match(e.message, /dark: --fg on --bg is 1\.00, under 4\.5/);
      return true;
    },
  );
});
