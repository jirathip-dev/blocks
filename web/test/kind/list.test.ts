import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../../src/gen/schemes.ts";
import { css } from "../../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const PAGE = `<!doctype html><html lang=en><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair.light)}</style><body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;
const LONG = "No threads yet. Your first message starts the thread and its orchestrator, and titles it with its first line. Nothing is logged until you send.";

const screen = {
  type: "screen",
  id: "s",
  blocks: [
    { type: "section", id: "sm", header: "sendmeter", blocks: [{ type: "list", id: "threads", rows: [], empty: LONG }] },
    { type: "list", id: "bare", rows: [] },
    { type: "list", id: "full", rows: [{ type: "row", id: "a", title: "Search worker split" }], empty: "never drawn" },
    { type: "lines", id: "order", name: "items", columns: [{ type: "text", name: "sku" }], items: [], empty: "No lines yet." },
    { type: "table", id: "findings", columns: [{ id: "f", label: "Finding" }], rows: [], empty: "No rows yet." },
    { type: "card", id: "c", title: "archived", blocks: [{ type: "list", id: "inner", rows: [], empty: "No archived threads." }] },
  ],
};

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
  await page.evaluate((s) => {
    const B = window.B;
    const ctx = { screen: "s", act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} }, held: new Map() };
    document.getElementById("root").replaceChildren(B.render(s, ctx));
  }, screen);
  return page;
}

const looks = (page) =>
  page.$$eval(".empty", (es) =>
    es.map((e) => {
      const s = getComputedStyle(e);
      const b = e.closest("[data-block]:not(section)");
      return { in: b.dataset.id, text: e.textContent, tag: e.tagName, bg: s.backgroundColor, border: s.borderTopWidth, edge: s.borderTopColor, radius: s.borderTopLeftRadius, color: s.color, h: e.getBoundingClientRect().height, ellipsis: s.textOverflow };
    }),
  );

for (const width of [1440, 390]) {
  test(`at ${width}, a list, lines and table with no rows draw their empty text as one tile; a list with no text draws nothing; in a card there is no tile`, async () => {
    const page = await open(width);
    const got = await looks(page);
    deepStrictEqual(
      got.map((g) => [g.in, g.tag, g.text]),
      [
        ["threads", "P", LONG],
        ["order", "P", "No lines yet."],
        ["findings", "P", "No rows yet."],
        ["inner", "P", "No archived threads."],
      ],
    );
    const vars = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement("i"));
      const v = (n) => ((probe.style.color = `var(${n})`), getComputedStyle(probe).color);
      probe.style.borderRadius = "var(--radius)";
      const out = { card: v("--card"), edge: v("--edge"), mute: v("--mute"), radius: getComputedStyle(probe).borderTopLeftRadius };
      probe.remove();
      return out;
    });
    for (const g of got.filter((g) => g.in !== "inner")) {
      deepStrictEqual([g.bg, g.border, g.edge, g.radius, g.color], [vars.card, "1px", vars.edge, vars.radius, vars.mute], g.in);
      strictEqual(g.h >= 44, true, `${g.in} is ${g.h}px, under one row`);
      strictEqual(g.ellipsis, "clip", g.in);
    }
    const inner = got.find((g) => g.in === "inner");
    deepStrictEqual([inner.bg, inner.border], ["rgba(0, 0, 0, 0)", "0px"]);
    strictEqual(await page.$eval('[data-id="bare"]', (e) => e.getBoundingClientRect().height), 0);
    strictEqual(await page.$$eval('[data-id="full"] p', (ps) => ps.length), 0);
    const tall = got.find((g) => g.in === "threads");
    if (width === 390) strictEqual(tall.h > 60, true, `the long text wraps and the tile grows: ${tall.h}px`);
    await page.close();
  });
}
