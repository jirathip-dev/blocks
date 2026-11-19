import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../../src/gen/schemes.ts";
import { css } from "../../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const table = JSON.parse(read("../../../fixtures/blocks/table.json"));
const PAGE = (lang) =>
  `<!doctype html><html lang=${lang}><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair.light)}</style>` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;

function boot(screen) {
  const B = window.B;
  const root = document.getElementById("root");
  window.sent = [];
  window.tapped = [];
  window.model = screen;
  const ctx = {
    screen: "s",
    act: async (a) => (window.sent.push({ action: a.action, block: a.block, values: a.values }), true),
    tap: (t) => window.tapped.push(t),
    open: new Set(),
    theme: B.plain,
    store: { get: () => null, put: () => {} },
  };
  const p = B.patcher({ root, draw: (b) => B.render(b, ctx), model: () => window.model });
  window.ops = (ops) => ((window.model = B.apply(window.model, ops)), p.queue(ops), p.flush());
  root.replaceChildren(B.render(screen, ctx));
}

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open({ width = 1440, lang = "en" } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    if (p === "") return r.fulfill({ body: PAGE(lang), contentType: "text/html" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.B);
  await page.evaluate(boot, { type: "screen", id: "s", blocks: [table] });
  const ids = () => page.$$eval(".tbl tbody tr", (rs) => rs.map((r) => r.dataset.id));
  const bar = () => page.$eval(".tbh", (e) => e.innerText.replace(/\s+/g, " ").trim());
  const total = () => page.$eval(".tbl tfoot", (e) => e.innerText.replace(/\s+/g, " ").trim());
  return { page, ids, bar, total };
}

test("a header tap sorts up, then down, then back to the order sent, blanks last both ways", async () => {
  const { page, ids } = await open();
  const due = page.locator("thead th").nth(4);
  deepStrictEqual(await ids(), ["INV-0133", "INV-0136", "INV-0138", "INV-0139", "INV-0143"]);
  await due.locator("button").click();
  strictEqual(await due.getAttribute("aria-sort"), "descending");
  deepStrictEqual(await ids(), ["INV-0139", "INV-0138", "INV-0136", "INV-0133", "INV-0143"]);
  await due.locator("button").click();
  strictEqual(await due.getAttribute("aria-sort"), null);
  deepStrictEqual(await ids(), table.rows.map((r) => r.id));
  await page.locator("thead th").nth(6).locator("button").click();
  deepStrictEqual(await ids(), ["INV-0143", "INV-0139", "INV-0138", "INV-0136", "INV-0133"]);
  await page.close();
});

test("the filter keeps rows with every word, counts them, totals only them, and says when none match", async () => {
  const { page, ids, bar, total } = await open();
  await page.fill(".tbq", "orchard 2569");
  deepStrictEqual(await ids(), ["INV-0133"]);
  ok((await bar()).includes("1 of 5 rows"), await bar());
  strictEqual(await total(), "Total 48,750.00");
  strictEqual(await page.evaluate(() => document.activeElement?.className), "tbq");
  await page.fill(".tbq", "nobody");
  strictEqual(await page.$eval("tr.tbe", (e) => e.textContent), "No rows match “nobody”. clear");
  await page.click("tr.tbe button");
  strictEqual((await ids()).length, 5);
  await page.close();
});

test("ticked rows turn the bar into the bulk bar, whose action sends their ids; a filter that hides one unticks it", async () => {
  const { page, bar } = await open();
  await page.check('[aria-label="Select INV-0133"]');
  await page.check('[aria-label="Select INV-0136"]');
  ok((await bar()).startsWith("2 selected send reminder void"), await bar());
  strictEqual(await page.locator(".tbq").count(), 0);
  ok(await page.$eval('thead [aria-label="Select all shown rows"]', (e) => e.indeterminate));
  await page.click("text=send reminder");
  deepStrictEqual(await page.evaluate(() => window.sent), [{ action: "remind", block: "invoices", values: { rows: ["INV-0133", "INV-0136"] } }]);
  strictEqual(await page.evaluate(() => window.tapped.length), 0);
  await page.click(".tbh >> text=clear");
  await page.fill(".tbq", "bluepeak");
  await page.check('thead [aria-label="Select all shown rows"]');
  ok((await bar()).startsWith("1 selected"), await bar());
  await page.click(".tbh >> text=export");
  await page.click(".tbm >> text=CSV");
  deepStrictEqual((await page.evaluate(() => window.sent))[1], {
    action: "export",
    block: "invoices",
    values: { format: "csv", columns: ["inv", "client", "status", "due", "late", "amount"], sort: { by: "due", dir: "asc" }, q: "bluepeak", rows: ["INV-0136"] },
  });
  await page.close();
});

test("the columns menu hides a column but never the first, and a row tap taps the row", async () => {
  const { page } = await open();
  await page.click("text=columns");
  ok(await page.isDisabled('[aria-label="Show Invoice"]'));
  await page.uncheck('[aria-label="Show Status"]');
  deepStrictEqual(await page.$$eval("thead th", (t) => t.map((e) => e.textContent).filter(Boolean)), ["Invoice", "Client", "Due↑", "Overduedays", "Amount฿"]);
  ok(await page.isVisible("text=columns · 1 hidden"));
  await page.click("td >> text=Tidewater Bakery");
  deepStrictEqual(await page.evaluate(() => window.tapped), [{ open: "/invoice/INV-0139" }]);
  await page.close();
});

test("row ops change, add and remove rows in place: the sort and filter stay, a changed or new row gets its edge", async () => {
  const { page, ids, total } = await open();
  await page.fill(".tbq", "INV-01");
  const row = (id, amount) => ({ id, cells: { inv: id, client: "New Co", status: { text: "sent", tone: "done" }, due: "2026-10-01", amount } });
  await page.evaluate(
    (ops) => window.ops(ops),
    [
      { op: "merge", id: "INV-0139", fields: { cells: { ...table.rows[3].cells, amount: 1 } } },
      { op: "insert", into: "invoices", block: row("INV-0150", 2) },
      { op: "remove", id: "INV-0136" },
    ],
  );
  deepStrictEqual(await ids(), ["INV-0150", "INV-0133", "INV-0138", "INV-0139", "INV-0143"]);
  deepStrictEqual(await page.$$eval("tr.chg", (rs) => rs.map((r) => r.dataset.id)), ["INV-0150", "INV-0139"]);
  strictEqual(await page.inputValue(".tbq"), "INV-01");
  strictEqual(await total(), "Total 80,253.00");
  await page.close();
});

test("on a phone each row is a title, its tag and value, then a meta line; the head row is hidden", async () => {
  const { page } = await open({ width: 390 });
  strictEqual(await page.$eval(".tbl thead", (e) => getComputedStyle(e).display), "none");
  const first = await page.$eval(".tbl tbody tr", (r) => [...r.children].filter((c) => getComputedStyle(c).display !== "none").map((c) => c.className.split(" ").find((k) => k.startsWith("p-"))));
  deepStrictEqual(first, [undefined, "p-meta", "p-title", "p-tag", "p-meta", "p-meta", "p-value"]);
  ok(await page.isVisible(".tbh .tbk"));
  ok(await page.isVisible(".tbs"));
  await page.close();
});

test("a Buddhist-Era date has Thai month names on a Thai page, English ones otherwise", async () => {
  const th = await open({ lang: "th" });
  ok((await th.page.$eval(".tbl tbody", (e) => e.innerText)).includes("18 ต.ค. 2569"));
  await th.page.close();
  const en = await open();
  ok((await en.page.$eval(".tbl tbody", (e) => e.innerText)).includes("18 Oct 2569"));
  await en.page.close();
});
