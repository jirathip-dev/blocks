import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../../src/gen/schemes.ts";
import { css } from "../../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const block = (p) => JSON.parse(read(`../../../fixtures/${p}.json`));
const PAGE =
  `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair.light)}</style>` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    if (p === "") return r.fulfill({ body: PAGE, contentType: "text/html" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.B);
  return page;
}

function draw([b, html]) {
  const sent = [];
  const ctx = { screen: "s", act: async (a) => (sent.push(a), true), tap: () => {}, open: new Set(), theme: window.B.plain, store: { get: () => null, put: () => {} } };
  const e = window.B.render(b, ctx);
  document.getElementById("root").replaceChildren(e);
  window.sent = sent;
  const sig = (x) =>
    [x, ...x.querySelectorAll("*")].map((y) => ({
      tag: y.tagName.toLowerCase(),
      cls: [...y.classList].sort().join(" "),
      at: ["aria-label", "aria-pressed", "aria-hidden", "style", "role"].map((a) => y.getAttribute(a)),
      text: y.children.length ? "" : y.textContent,
    }));
  const t = document.createElement("template");
  t.innerHTML = html;
  const site = t.content.querySelector("[data-block]");
  return [site && sig(site), sig(e)];
}

const boxes = (page) =>
  page.$$eval(".bx", (bs) =>
    bs.map((b) => {
      const r = (s) => [...b.querySelectorAll(s)].map((e) => e.getBoundingClientRect()).map((x) => ({ top: x.top, bottom: x.bottom, w: x.width }));
      return { box: r(".q")[0], whisker: r(".w")[0], median: r(".m")[0], outliers: r(".o"), caps: r(".cap").length };
    }),
  );

for (const width of [1440, 390]) {
  test(`a box plot at ${width}: site and render write the same marks; each box sits inside its whiskers, its outliers beyond them`, async () => {
    const page = await open(width);
    for (const name of ["boxplot", "boxplot-fingers", "boxplot-sessions"]) {
      const [site, drawn] = await page.evaluate(draw, [block(`blocks/${name}`), read(`../../../fixtures/html/${name}.html`)]);
      deepStrictEqual(drawn, site, name);
      for (const b of await boxes(page)) {
        ok(b.box.w >= 6 && b.box.w <= 48, `${name}: a box ${b.box.w}px wide`);
        ok(b.whisker.top <= b.box.top && b.box.bottom <= b.whisker.bottom, `${name}: whiskers span the box`);
        ok(b.box.top <= b.median.top && b.median.top <= b.box.bottom, `${name}: the median is inside the box`);
        for (const o of b.outliers) ok(o.bottom < b.whisker.top || o.top > b.whisker.bottom, `${name}: an outlier beyond the whiskers`);
        strictEqual(b.caps, 2, name);
      }
    }
    await page.evaluate(draw, [block("blocks/boxplot"), read("../../../fixtures/html/boxplot.html")]);
    const hands = await boxes(page);
    deepStrictEqual(hands.map((b) => b.outliers.length), [2, 1]);
    await page.close();
  });
}

test("a tap on a box's column picks it, sends its name and the readout gives its five numbers and outliers", async () => {
  const page = await open(1440);
  await page.evaluate(draw, [block("blocks/boxplot"), read("../../../fixtures/html/boxplot.html")]);
  const readout = () => page.$$eval(".bxl > span", (s) => s.map((x) => x.textContent));
  deepStrictEqual(await readout(), ["Left", "median33.1 kg", "Q1–Q330.4 – 36.0", "min–max25.8 – 41.2", "outliers18.0, 47.5"]);
  await page.getByRole("button", { name: "Right: median 35.6 kg, quartiles 32.9 to 38.1, range 28.2 to 43.0, 1 outlier: 21.4" }).click();
  deepStrictEqual(await page.evaluate(() => window.sent), [{ action: "force.hand", block: "hands", values: { x: "Right" } }]);
  deepStrictEqual(await page.$$eval(".chc", (cs) => cs.map((c) => c.getAttribute("aria-pressed"))), [null, "true"]);
  strictEqual(await page.textContent(".bxx .sel"), "Right");
  deepStrictEqual(await readout(), ["Right", "median35.6 kg", "Q1–Q332.9 – 38.1", "min–max28.2 – 43.0", "outliers21.4"]);
  await page.close();
});

test("with nothing picked the readout is a key; empty, the plot says its empty text and has no column to tap", async () => {
  const page = await open(390);
  await page.evaluate(draw, [block("blocks/boxplot-fingers"), read("../../../fixtures/html/boxplot-fingers.html")]);
  deepStrictEqual(await page.$$eval(".bxl > span", (s) => s.map((x) => x.textContent)), ["min to max", "Q1 to Q3", "median", "outlier"]);
  const empty = block("stress/boxplot-empty");
  await page.evaluate(draw, [empty, ""]);
  strictEqual(await page.textContent(".che"), empty.empty ?? "No data yet");
  strictEqual(await page.$$eval(".chc", (cs) => cs.length), 0);
  await page.close();
});
