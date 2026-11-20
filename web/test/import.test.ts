import { deepStrictEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../src/gen/schemes.ts";
import { css } from "../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const screen = JSON.parse(read("../../fixtures/guard/ok/ok-import.json"));
const PAGE = `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair.light)}</style><body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;
const S = await import("../src/sheet/index.ts");

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(), asked = [];
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    asked.push(p);
    if (p === "") return r.fulfill({ body: PAGE, contentType: "text/html" });
    if (["blocks.js", "blocks.css", "sheet.js"].includes(p)) return r.fulfill({ body: read(`../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.B);
  await page.evaluate((s) => {
    window.sent = [];
    const act = async (a) => (window.sent.push(a), true);
    const ctx = { screen: s.id, act, tap: () => {}, open: new Set(), theme: window.B.plain, store: { get: () => null, put: () => {} } };
    document.getElementById("root").append(window.B.render(s, ctx));
  }, screen);
  await page.waitForSelector(".imd");
  return { ctx, page, asked };
}

const downloaded = async (page, click) => {
  const [d] = await Promise.all([page.waitForEvent("download"), page.click(click)]);
  const bytes = new Uint8Array(readFileSync(await d.path()));
  return [d.suggestedFilename(), await S.read(d.suggestedFilename(), bytes), await S.read(d.suggestedFilename(), bytes, 1)];
};

test("download template writes the declared columns and allowed values on the device; a whole table's export excel does too, sending no action", async () => {
  const { ctx, page } = await open(1440);
  const [name, cols, values] = await downloaded(page, "text=download template");
  deepStrictEqual([name, cols.head, cols.rows, values.head, values.rows.length], ["Import products.xlsx", ["SKU", "Name", "Category", "Price ฿", "Stock", "Best before"], [], ["Category"], 4]);
  const [file, table] = await downloaded(page, "text=export excel");
  deepStrictEqual([file, table.head, table.rows.map((r) => r.cells)], ["Products.xlsx", ["SKU", "Name", "Price ฿"], [["BK-0101", "Sourdough loaf", "85"], ["BK-0102", "Butter croissant", "45"]]]);
  deepStrictEqual(await page.evaluate(() => window.sent), []);
  await ctx.close();
});

for (const width of [1440, 390]) {
  test(`at ${width}, sheet.js loads only on the first pick; the file's columns, rows and row errors are drawn, and confirm sends the good rows`, async () => {
    const { ctx, page, asked } = await open(width);
    ok(!asked.includes("sheet.js"), "no reader before a pick");
    await page.setInputFiles(".imd input[type=file]", new URL("../../fixtures/import/bad-rows.csv", import.meta.url).pathname);
    await page.waitForSelector(".imx");
    ok(asked.includes("sheet.js"), "the reader is fetched on the pick");
    deepStrictEqual(await page.$$eval(".imx", (xs) => xs.map((x) => x.textContent)), ["Price ฿: “12,5O” is not a number", "Category: “Dry goods” is not one of Bakery, Dairy, Produce, Pantry", "SKU: required", "SKU: BK-0101 is also on row 2"]);
    await page.click(".ima button");
    await page.click(".ima.ask button:last-child");
    await page.waitForFunction(() => window.sent.length);
    deepStrictEqual(await page.evaluate(() => window.sent), [{ action: "import-products", block: "import-products", values: { rows: [{ sku: "BK-0101", name: "Sourdough loaf", cat: "Bakery", price: 85 }], file: "bad-rows.csv", left: 4 } }]);
    await ctx.close();
  });
}
