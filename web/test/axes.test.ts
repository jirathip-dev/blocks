import { notStrictEqual, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../src/gen/schemes.ts";
import { css } from "../src/core/index.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const body = ["card", "section", "steps", "button", "screen"].map((k) => read(`../../fixtures/html/${k}.html`)).join("") + '<i class="b-late"></i><button class="b b-button primary"><span>Drive now</span></button>';
const sheet = read("../dist/blocks.css");

const rows = [
  ["type", { type: "default" }, ":root", "", "fontFamily", (v) => v.startsWith("system-ui")],
  ["radius", { radius: 1 }, ".card", "", "borderTopLeftRadius", (v) => v === "12px"],
  ["surface dashed", { surface: "dashed" }, ".card", "", "borderTopStyle", (v) => v === "dashed"],
  ["surface solid", { surface: "solid" }, ".card", "", "borderTopWidth", (v) => v === "2px"],
  ["fills", { fills: "outline" }, ".spi.done .spm", "", "backgroundColor", (v) => v === "rgba(0, 0, 0, 0)"],
  ["buttons unbracketed", { buttons: "filled" }, ".b-button", "::before", "content", (v) => v === "none"],
  ["buttons filled primary", { buttons: "filled" }, ".primary", "", "backgroundColor", (v) => v !== "rgba(0, 0, 0, 0)"],
  ["button label case", { labels: { button: { case: "as-is" } } }, ".b-button>span", "", "textTransform", (v) => v === "none"],
  ["marks", { marks: "text" }, ".spi.done .spm", "::after", "content", (v) => v === '"done"'],
  ["sections", { sections: "quiet" }, ".sec>.sh", "", "fontSize", (v) => v === "11px"],
  ["easing calm", { easing: "calm" }, ".b-late", "", "animationTimingFunction", (v) => v === "cubic-bezier(0.4, 0, 0.2, 1)"],
  ["easing bouncy", { easing: "bouncy" }, ".b-late", "", "animationTimingFunction", (v) => v === "cubic-bezier(0.34, 1.3, 0.64, 1)"],
  ["label case", { labels: { header: { case: "upper" } } }, ".sec>.sh", "", "textTransform", (v) => v === "uppercase"],
  ["screen title case", { labels: { screen: { case: "as-is" } } }, ".b-screen__title", "", "textTransform", (v) => v === "none"],
  ["label prefix", { labels: { header: { prefix: "[" } } }, ".sec>.sh", "::before", "content", (v) => v === '"["'],
  ["label suffix", { labels: { button: { suffix: ' "' } } }, ".b-button>span", "::after", "content", (v) => v === '" \\""'],
];

let browser;
let page;
before(async () => {
  browser = await webkit.launch();
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(`<!doctype html><meta charset=utf-8><style>${sheet}</style><style id=look></style><body>${body}`);
});
after(() => browser.close());

const drawn = (look, [, , at, pseudo, prop]) =>
  page.evaluate(
    ([l, a, ps, pr]) => {
      document.getElementById("look").textContent = l;
      return getComputedStyle(document.querySelector(a), ps || null)[pr];
    },
    [look, at, pseudo, prop],
  );

test("each style axis changes what the tiles draw, from the default look", async () => {
  for (const row of rows) {
    const [name, change, , , , ok] = row;
    const was = await drawn(css(defaultPair), row);
    const now = await drawn(css(defaultPair, change), row);
    notStrictEqual(now, was, name);
    strictEqual(ok(now), true, `${name}: ${now}`);
  }
});

test("an axis adds no animation or transition: motion stays the --motion scaled transforms and fades", () => {
  const all = { easing: "bouncy", type: "default", radius: 2, surface: "dashed", fills: "outline", buttons: "filled", marks: "text", sections: "quiet", labels: { header: { prefix: "[" } } };
  const text = css(defaultPair, all);
  strictEqual(/animation|transition|(?<!-)transform/.test(text), false, text);
});
