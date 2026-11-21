import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";
import { defaultPair } from "../../src/gen/schemes.ts";
import { css } from "../../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const side = JSON.parse(read("../../../fixtures/blocks/sidebar.json"));
const PAGE =
  `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair.light)}</style>` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script><script src=react.js></script>`;
const SCREEN = { type: "screen", id: "s", title: "Inbox", blocks: [side, { type: "list", id: "l", rows: [{ type: "row", id: "r", title: "Quarterly numbers" }] }] };

function boot([screen, adapter]) {
  const B = window.B;
  const store = { get: (k) => localStorage.getItem(k), put: (k, v) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)) };
  const ctx = { screen: "s", act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store, held: new Map() };
  document.addEventListener("click", (e) => e.target.closest?.("a[href]") && e.preventDefault());
  const root = document.getElementById("root");
  if (adapter === "react") window.R.boot(root, screen, { sent: () => true, dropped: () => {}, file: () => {} });
  else root.replaceChildren(B.render(screen, ctx));
}

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(width, adapter) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    if (p === "") return r.fulfill({ body: PAGE, contentType: "text/html" });
    if (p === "react.js") return r.fulfill({ body: reactJs(), contentType: "text/javascript" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.B);
  await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
  await page.evaluate(boot, [SCREEN, adapter]);
  return page;
}

const state = (page) => page.$eval(".sd", (e) => e.dataset.side);
const left = (page, sel) => page.$eval(sel, (e) => Math.round(e.getBoundingClientRect().left));
const width = (page) => page.$eval(".sdp", (e) => Math.round(e.getBoundingClientRect().width));

for (const adapter of ["html", "react"]) {
  test(`${adapter}: at 1440 the rail opens over the page on hover after a beat and shuts after leaving; the page never moves`, async () => {
    const page = await open(1440, adapter);
    deepStrictEqual([await state(page), await width(page), await left(page, ".list")], ["rail", 64, 72]);
    await page.mouse.move(30, 300);
    await page.clock.runFor(100);
    strictEqual(await state(page), "rail", "a pointer passing by does nothing");
    await page.clock.runFor(100);
    deepStrictEqual([await state(page), await width(page), await left(page, ".list")], ["open", 224, 72]);
    ok(await page.isVisible(".sdp .sdgt"), "group titles show when open");
    await page.mouse.move(900, 300);
    await page.clock.runFor(200);
    strictEqual(await state(page), "open");
    await page.clock.runFor(200);
    deepStrictEqual([await state(page), await width(page)], ["rail", 64]);
    await page.locator(".sdb").focus();
    await page.clock.runFor(200);
    strictEqual(await state(page), "open", "focus inside opens it");
    await page.keyboard.press("Escape");
    strictEqual(await state(page), "rail");
    await page.close();
  });

  test(`${adapter}: pin pushes the page aside, is remembered across a reload, and unpin goes back to the rail`, async () => {
    const page = await open(1440, adapter);
    await page.mouse.move(30, 300);
    await page.clock.runFor(200);
    const pin = page.locator(".sdpin");
    deepStrictEqual([await pin.getAttribute("aria-pressed"), await pin.getAttribute("aria-label")], ["false", "pin sidebar"]);
    await pin.click();
    await page.mouse.move(900, 300);
    await page.clock.runFor(500);
    deepStrictEqual([await state(page), await width(page), await left(page, ".list")], ["pinned", 224, 232]);
    deepStrictEqual([await pin.getAttribute("aria-pressed"), await pin.getAttribute("aria-label")], ["true", "unpin sidebar"]);
    await page.reload();
    await page.waitForFunction(() => window.B);
    await page.evaluate(boot, [SCREEN, adapter]);
    deepStrictEqual([await state(page), await left(page, ".list")], ["pinned", 232], "pinned from the first paint after a reload");
    await page.locator(".sdpin").click();
    deepStrictEqual([await state(page), await left(page, ".list")], ["rail", 72]);
    strictEqual(await page.evaluate(() => localStorage.getItem("sidebar-pin:side")), null);
    await page.close();
  });

  test(`${adapter}: links, badges, groups and the current page are named for a screen reader and reachable by keys`, async () => {
    const page = await open(1440, adapter);
    const nav = page.getByRole("navigation", { name: "main" });
    strictEqual(await nav.count(), 1);
    strictEqual(await page.locator('.sdp [aria-current="page"] .sdl').innerText(), "Inbox");
    ok(await page.getByRole("link", { name: "Inbox 12 new" }).count(), "a count badge reads as new");
    ok(await page.getByRole("link", { name: "Alerts 3 need attention" }).count(), "a danger badge reads as needing attention");
    ok(await page.getByRole("link", { name: "Home" }).isVisible(), "a rail link keeps its name");
    await page.mouse.move(30, 300);
    await page.clock.runFor(200);
    const group = page.getByRole("button", { name: "Projects" });
    const sub = page.locator(`#${await group.getAttribute("aria-controls")}`);
    deepStrictEqual([await group.getAttribute("aria-expanded"), await sub.isVisible()], ["true", true]);
    await group.focus();
    await page.keyboard.press("Enter");
    deepStrictEqual([await group.getAttribute("aria-expanded"), await sub.isVisible()], ["false", false]);
    await page.close();
  });

  test(`${adapter}: at 390 the menu button opens the drawer; a tap outside, a link or Escape closes it and focus goes back`, async () => {
    const page = await open(390, adapter);
    const menu = page.getByRole("button", { name: "menu", exact: true });
    ok(await page.locator(".sdp").isHidden(), "the closed drawer is out of reach");
    await menu.click();
    deepStrictEqual([await state(page), await menu.getAttribute("aria-expanded"), await left(page, ".sdp")], ["drawer", "true", 0]);
    strictEqual(await page.evaluate(() => document.activeElement.textContent), "◈Workspace", "focus moves into the drawer");
    await page.mouse.click(370, 400);
    deepStrictEqual([await state(page), await menu.getAttribute("aria-expanded")], ["rail", "false"]);
    strictEqual(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "menu");
    await menu.click();
    await page.getByRole("link", { name: "Home" }).click();
    strictEqual(await state(page), "rail", "a link closes it");
    await menu.click();
    await page.keyboard.press("Escape");
    strictEqual(await state(page), "rail");
    await menu.click();
    await page.keyboard.press("Shift+Tab");
    ok(await page.evaluate(() => document.querySelector(".sdp").contains(document.activeElement)), "focus stays inside the open drawer");
    await page.close();
  });

  test(`${adapter}: at 390 a swipe from the left edge follows the finger and opens past a third or on a flick; a swipe left shuts it`, async () => {
    const page = await open(390, adapter);
    const drag = async (sel, xs, ms) => {
      const at = ([type, x]) => {
        const e = new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: x, clientY: 400, bubbles: true });
        (type === "pointerdown" ? document.querySelector(window.grip) : window).dispatchEvent(e);
        return document.querySelector(".sd").style.getPropertyValue("--pull");
      };
      await page.evaluate((s) => (window.grip = s), sel);
      await page.evaluate(at, ["pointerdown", xs[0]]);
      const pulls = [];
      for (const x of xs.slice(1)) {
        await page.clock.runFor(ms);
        pulls.push(await page.evaluate(at, ["pointermove", x]));
      }
      await page.evaluate(at, ["pointerup", xs[xs.length - 1]]);
      return pulls;
    };
    deepStrictEqual(await drag(".sdedge", [4, 30, 60], 100), ["0.09", "0.19"], "the drawer follows the finger");
    strictEqual(await state(page), "rail", "a slow, short pull springs back");
    await drag(".sdedge", [4, 60, 120, 200], 100);
    strictEqual(await state(page), "drawer", "a pull past a third opens it");
    await drag(".sdp .sdg", [250, 200, 60], 100);
    strictEqual(await state(page), "rail", "a swipe left past a third shuts it");
    await drag(".sdedge", [4, 60], 16);
    strictEqual(await state(page), "drawer", "a fast flick opens it short of a third");
    await page.close();
  });
}
