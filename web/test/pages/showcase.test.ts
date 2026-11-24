import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { shot } from "../../shot/shot.ts";

const SITE = process.env.SITE ?? "";
const BASE = "http://site.test/blocks/";
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
let browser;
before(async () => {
  ok(SITE && existsSync(join(SITE, "index.html")), "SITE names no built site: cargo run -p blocks-site -- <dir>");
  browser = await webkit.launch();
});
after(() => browser?.close());

async function open(file, { js = true, still = false, width = 390 } = {}) {
  const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const stray = [];
  const warned = [];
  page.on("console", (m) => m.type() === "warning" && warned.push(m.text()));
  await page.route("**/*", (r) => {
    const url = r.request().url();
    if (!url.startsWith("http://site.test/")) return r.abort();
    const path = url.slice(BASE.length).split(/[?#]/)[0] || "index.html";
    if (!url.startsWith(BASE) || !existsSync(join(SITE, path))) {
      stray.push(url);
      return r.fulfill({ status: 404 });
    }
    let body = readFileSync(join(SITE, path));
    if (still && path.endsWith(".html")) body = Buffer.from(body.toString().replace(/<script type="module"[^>]*><\/script>/, ""));
    return r.fulfill({ body, contentType: TYPES[extname(path)] ?? "application/octet-stream" });
  });
  await page.goto(BASE + file);
  await page.setViewportSize({ width, height: await page.evaluate(() => document.documentElement.scrollHeight) });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 5000 });
  return { page, stray, warned, close: () => ctx.close() };
}

const tree = (page) =>
  page.evaluate(async () => {
    const B = await import(new URL("blocks.js", location.href).href);
    return B.dump(document.querySelector("main"));
  });

const files = SITE ? readdirSync(SITE).filter((f) => f.endsWith(".html")).sort() : [];

test("every page is the same PNG and tree before and after blocks.js adopts it, all under /blocks/", async () => {
  strictEqual(files.length, 51);
  const warm = await open("index.html", { js: false });
  await warm.page.screenshot({ fullPage: true });
  await warm.close();
  for (const f of files.filter((f) => f !== "playground.html" && f !== "streams.html")) {
    const off = await open(f, { js: false });
    const png = await off.page.screenshot({ fullPage: true });
    deepStrictEqual(off.stray, [], f);
    await off.close();
    const plain = await open(f, { still: true });
    const want = await tree(plain.page);
    await plain.close();
    const on = await open(f);
    const live = await on.page.screenshot({ fullPage: true });
    if (!png.equals(live) && process.env.SHOTS) {
      mkdirSync(process.env.SHOTS, { recursive: true });
      writeFileSync(join(process.env.SHOTS, `${f}-static.png`), png);
      writeFileSync(join(process.env.SHOTS, `${f}-adopted.png`), live);
    }
    ok(png.equals(live), `${f}: the PNG changed when blocks.js adopted it`);
    deepStrictEqual(await tree(on.page), want, f);
    deepStrictEqual(on.warned, [], f);
    deepStrictEqual(on.stray, [], f);
    await on.close();
  }
});

test("streams: JS off shows the fallback; JS on, play.js swaps in the plot in place", async () => {
  const off = await open("streams.html", { js: false });
  ok((await off.page.textContent('[data-id="stream"]')).includes("The stream plays with JS"));
  strictEqual(await off.page.$$eval('[data-id="stream"] .plot', (e) => e.length), 0);
  deepStrictEqual(off.stray, []);
  await off.close();
  const on = await open("streams.html");
  await on.page.waitForSelector('[data-id="stream"] .plot');
  ok((await on.page.textContent('[data-id="stream"] .plot')).includes("Pull"));
  ok(!(await on.page.textContent('[data-id="stream"]')).includes("The stream plays with JS"));
  deepStrictEqual(on.warned, []);
  deepStrictEqual(on.stray, []);
  await on.close();
});

test("with JS off a link bar link goes to its page under the sub-path", async () => {
  const { page, close } = await open("index.html", { js: false });
  await page.click('[data-id="site-nav"] a[href="gallery.html"]');
  await page.waitForURL(`${BASE}gallery.html`);
  await page.click('a[href="kind-stat.html"]');
  await page.waitForURL(`${BASE}kind-stat.html`);
  ok((await page.textContent("main")).includes("Figures: one tile, or a list of tiles."));
  await close();
});

const bg = (page, sel = ":root") => page.evaluate((s) => getComputedStyle(document.querySelector(s)).getPropertyValue("--bg").trim(), sel);

test("JS off: Styles pins each look's colours side by side; JS on: the nav's switcher restyles in place, follows the device and holds across pages", async () => {
  const off = await open("styles.html", { js: false });
  deepStrictEqual(await Promise.all(["default", "paper", "console", "playful"].map((s) => bg(off.page, `[data-id="s-${s}"]`))), ["#f6f6f6", "#f4ecdc", "#fbfaf6", "#ffffff"]);
  await off.close();
  const on = await open("index.html", { width: 1440 });
  const root = (k) => on.page.evaluate((p) => getComputedStyle(document.documentElement).getPropertyValue(p).trim(), k);
  const pressed = () =>
    on.page.$$eval('[data-id="looks"] button', (bs) => {
      const probe = document.body.appendChild(document.createElement("i"));
      probe.style.background = "var(--l)";
      const l = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return bs.filter((b) => getComputedStyle(b).backgroundColor === l).map((b) => b.dataset.id);
    });
  strictEqual(await bg(on.page), "#f6f6f6");
  await on.page.evaluate(() => (window.kept = true));
  await on.page.click('[data-id="look-console"]');
  deepStrictEqual([await bg(on.page), await root("--motion"), await root("--radius")], ["#fbfaf6", "0", "0px"]);
  await on.page.click('[data-id="look-paper"]');
  deepStrictEqual([await bg(on.page), await root("--motion"), await root("--radius")], ["#f4ecdc", "1.75", "0px"]);
  ok(/serif/.test(await on.page.evaluate(() => getComputedStyle(document.body).fontFamily)), "Paper sets serif type");
  ok(await on.page.evaluate(() => window.kept === true), "no reload");
  const rise = (page) => page.evaluate(() => getComputedStyle(document.querySelector('[data-id="hero"]')).animationDuration);
  strictEqual(await rise(on.page), "0s", "none under reduced motion");
  deepStrictEqual(await pressed(), ["look-paper"]);
  await on.page.goto(`${BASE}gallery.html`);
  strictEqual(await bg(on.page), "#f4ecdc");
  deepStrictEqual(await pressed(), ["look-paper"]);
  await on.close();
  const ctx = await browser.newContext({ colorScheme: "dark", reducedMotion: "no-preference" });
  const dark = await ctx.newPage();
  await dark.route("**/*", (r) => {
    const path = r.request().url().slice(BASE.length).split(/[?#]/)[0] || "index.html";
    return r.fulfill({ body: readFileSync(join(SITE, path)), contentType: TYPES[extname(path)] ?? "application/octet-stream" });
  });
  await dark.goto(BASE + "index.html");
  strictEqual(await bg(dark), "#161616");
  await dark.click('[data-id="look-playful"]');
  strictEqual(await bg(dark), "#0e0e11");
  strictEqual(await rise(dark), "0.65s", "Playful's motion 1.25 scales the 520 ms rise");
  await ctx.close();
});

const screenOf = (f) => JSON.parse(readFileSync(join(SITE, f), "utf8").match(/id="blocks-screen"[^>]*>(.*?)<\/script>/s)[1]);
const find = (n, id) => (n.id === id ? n : n.children.map((c) => find(c, id)).find(Boolean));

test("JS off: behaviours shows its start state and islands their fallback", async () => {
  const b = await open("behaviours.html", { js: false });
  deepStrictEqual(await b.page.locator('[data-id="state"] .b-stat__value').allTextContents(), ["ada@example.org", "false", "monthly", ""]);
  ok(await b.page.isHidden('select[name="often"]'));
  ok(await b.page.isVisible('input[name="email"]'));
  await b.close();
  const i = await open("islands.html", { js: false });
  for (const tag of ["x-later", "x-echo"]) {
    strictEqual(await i.page.getAttribute(`${tag}[data-block="island"]`, "data-fallback"), "", tag);
    ok((await i.page.textContent(tag)).includes("An echo of its props"), tag);
  }
  await i.close();
});

test("in blocks-shot, behaviours' toggle shows and hides a field, its check speaks and turns sign up off; islands mount x-echo beside its fallback", async () => {
  const css = [join(SITE, "site.css")];
  const steps = [
    { shot: { name: "start" } },
    { tap: { id: "updates" } },
    { shot: { name: "shown" } },
    { type: { id: "signup", text: "ada@" } },
    { shot: { name: "typed" } },
    { tap: { id: "sign-up" } },
    { type: { id: "signup", text: "ada@example.org" } },
    { tap: { id: "sign-up" } },
    { tap: { id: "updates" } },
    { shot: { name: "hidden" } },
  ];
  const b = await shot({ screen: screenOf("behaviours.html"), steps, css, browser });
  const at = (n, id) => find(b.trees[n], id);
  const tall = (n) => at(n, "signup").rect[3];
  ok(tall("shown") > tall("start"), `${tall("shown")} > ${tall("start")}`);
  strictEqual(tall("hidden"), tall("start"));
  deepStrictEqual(["start", "shown", "typed", "hidden"].map((n) => at(n, "state").text), [
    "ada@example.orgemailfalseupdatesmonthlyoftensigned",
    "ada@example.orgemailtrueupdatesmonthlyoftensigned",
    "ada@emailtrueupdatesmonthlyoftensigned",
    "ada@example.orgemailfalseupdatesmonthlyoftenada@example.orgsigned",
  ]);
  ok(!at("start", "signup").text.includes("needs a domain"));
  ok(at("typed", "signup").text.includes("needs a domain after the @"));
  deepStrictEqual(b.report.dropped, ["tap sign-up"], "sign up is off while the email check fails, on once it holds");
  deepStrictEqual(b.report.sent, [], "nothing goes to a server");
  const i = await shot({ screen: screenOf("islands.html"), css, browser });
  const tree = i.trees.shot;
  deepStrictEqual([find(tree, "echo").drawn, find(tree, "echo").text], ["native", '{"says":"hello"}']);
  deepStrictEqual([find(tree, "later").drawn, find(tree, "later").text], ["fallback", "An echo of its propsx-echo needs JS; until it loads, this row"]);
  deepStrictEqual(i.report.sent, [{ screen: "islands", action: "echo", block: "echo", values: { says: "hello" } }]);
});

test("layout: the switch moves the same screens between compact and wide without a reload; on a phone the file opens on a tap", async () => {
  const { page, close } = await open("layout.html", { width: 1440 });
  const boxes = () =>
    page.$$eval('[data-id="app"]>section', (all) =>
      all.map((s) => {
        const r = s.getBoundingClientRect();
        const p = s.parentElement.getBoundingClientRect();
        return { id: s.dataset.id, blocks: [...s.querySelectorAll("[data-id]")].map((b) => b.dataset.id), x: Math.round(r.left - p.left), y: Math.round(r.top - p.top), w: Math.round(r.width) };
      }),
    );
  const at = (all, id) => all.find((s) => s.id === id);
  const url = page.url();
  const auto = await boxes();
  await page.click('[data-id="to-compact"]');
  const compact = await boxes();
  await page.click('[data-id="to-wide"]');
  const wide = await boxes();
  strictEqual(page.url(), url);
  deepStrictEqual(auto, wide, "at 1440 the page starts wide");
  deepStrictEqual(compact.map((s) => [s.id, s.blocks]), wide.map((s) => [s.id, s.blocks]), "the same screens and blocks");
  ok(at(wide, "plants").x < at(wide, "today").x && at(wide, "today").x < at(wide, "weather").x, "wide: column, panel, cards side by side");
  ok(at(wide, "settings").y > at(wide, "today").y, "wide: settings in the bar below");
  ok(at(compact, "weather").y > at(compact, "today").y && at(compact, "weather").w === at(compact, "today").w, "compact: weather a sheet over today");
  ok(at(compact, "plants").y > at(compact, "weather").y && at(compact, "settings").y === at(compact, "plants").y, "compact: plants and settings in the tab bar");
  ok(await page.isVisible('[data-id="json"]'), "at 1440 the file sits beside the drawing");
  ok(!(await page.isVisible('[data-id="open-file"]')));
  await close();
  const phone = await open("layout.html", { width: 390 });
  ok(!(await phone.page.isVisible('[data-id="json"]')), "at 390 the file starts folded");
  await phone.page.click('[data-id="open-file"]');
  ok(await phone.page.isVisible('[data-id="json"]'));
  ok((await phone.page.textContent('[data-id="json"]')).includes('"place": "menu"'));
  await phone.close();
});

const SHOTS = process.env.SHOTS ?? join(SITE, "..", "shots");
const typed = (page, text) => page.fill(".pg-area", text);
const inFrame = (page, fn, arg) => page.frames()[1].evaluate(fn, arg);

test("playground: a sample draws in the preview, edits redraw it in place, bad JSON and schema faults are marked and keep the last good screen", async () => {
  mkdirSync(SHOTS, { recursive: true });
  for (const width of [390, 1440]) {
    const { page, close, stray } = await open("playground.html#k=stat", { width });
    await page.waitForSelector(".pg-status:not(.bad)");
    await page.waitForFunction(() => document.querySelector(".pg-frame")?.contentDocument?.querySelector('[data-id="week"]'));
    strictEqual(await page.getAttribute('[data-id="pick"] a[href="playground.html#k=stat"]', "aria-current"), "page");
    strictEqual(await page.textContent(".pg-status"), "screen · 1 blocks · drawn");
    await page.screenshot({ path: join(SHOTS, `playground-${width}.png`), fullPage: true });
    await page.evaluate(() => (window.kept = true));
    const text = await page.inputValue(".pg-area");
    await typed(page, text.replace('"open"', '"opened"'));
    ok((await inFrame(page, () => document.querySelector('[data-id="week"]').textContent)).includes("opened"));
    await typed(page, text.replace('"open"', '"shut"').replace('"type": "stat"', '"type": "stats"'));
    const line = text.split("\n").findIndex((l) => l.includes('"type": "stat"')) + 1;
    deepStrictEqual(await page.$$eval(".pg-gut i.err", (is) => is.map((i) => i.textContent)), [String(line)]);
    strictEqual(await page.textContent(".pg-status"), `line ${line} · schema: "stats" is not a kind`);
    ok(await page.isVisible(".pg-note"));
    ok((await inFrame(page, () => document.querySelector('[data-id="week"]').textContent)).includes("opened"), "the last good screen stays");
    await typed(page, text.replace('"open"', '"open",'));
    ok((await page.textContent(".pg-status")).includes("not JSON"));
    await page.screenshot({ path: join(SHOTS, `playground-error-${width}.png`), fullPage: true });
    ok(await page.evaluate(() => window.kept === true), "no reload");
    deepStrictEqual(stray, []);
    await close();
  }
});

test("playground: look, dark and width switch the preview only; share packs the screen into the link and the link brings it back", async () => {
  const { page, close } = await open("playground.html#k=chips", { width: 1440 });
  await page.waitForSelector(".pg-status:not(.bad)");
  const frameBg = () => inFrame(page, () => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
  strictEqual(await frameBg(), "#f6f6f6");
  await page.click('.pg-seg button[value="console"]');
  await page.click('.pg-seg button[value="dark"]');
  await page.click('.pg-seg button[value="1440"]');
  strictEqual(await frameBg(), "#0d0d0c");
  strictEqual(await bg(page), "#f6f6f6");
  strictEqual(await page.evaluate(() => document.documentElement.dataset.look), undefined);
  strictEqual(await page.$eval(".pg-frame", (f) => f.style.width), "1440px");
  const text = (await page.inputValue(".pg-area")).replace('"medium"', '"max"');
  await typed(page, text);
  await page.click(".pg-share");
  await page.waitForSelector(".pg-url");
  const url = await page.inputValue(".pg-url");
  ok(url.startsWith(`${BASE}playground.html#s=`), url);
  strictEqual(page.url(), url);
  await close();
  const back = await open(url.slice(BASE.length), { width: 390 });
  await back.page.waitForSelector(".pg-status:not(.bad)");
  strictEqual(await back.page.inputValue(".pg-area"), text);
  strictEqual(await back.page.textContent(".pg-from"), "From a shared link.");
  await back.close();
});

test("kind pages: the sample's Rust tab is shown first and the JSON tab swaps in place", async () => {
  const { page, close } = await open("kind-stat.html", { width: 1440 });
  ok(await page.isVisible('[data-id="rust"]'));
  ok(await page.isHidden('[data-id="json"]'));
  ok((await page.textContent('[data-id="rust"]')).includes("fn figures() -> Vec<Block> {"));
  await page.click('[data-id="tabs"] a[href="#json"]');
  ok(await page.isHidden('[data-id="rust"]'));
  ok(await page.isVisible('[data-id="json"]'));
  strictEqual(page.url(), `${BASE}kind-stat.html`);
  await close();
});

test("llms.txt resolves and so does every link in it: site pages in the build, repo files in the checkout", async () => {
  const text = readFileSync(join(SITE, "llms.txt"), "utf8");
  const links = [...text.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
  ok(links.length > files.length / 2, `${links.length} links`);
  const repo = "https://github.com/jirathip-dev/blocks/blob/main/";
  const root = join(import.meta.dirname, "..", "..", "..");
  const site = "https://jirathip-dev.github.io/blocks/";
  const where = (l) => {
    if (l.startsWith(site)) return join(SITE, l.slice(site.length));
    if (l.startsWith(repo)) return join(root, l.slice(repo.length));
    return "";
  };
  for (const l of links) ok(where(l) && existsSync(where(l)), `llms.txt: ${l} goes nowhere`);
  for (const f of files.filter((f) => f.startsWith("kind-"))) ok(links.includes(`${site}${f.replace(/html$/, "md")}`), `llms.txt: no ${f}`);
});

test("kind pages: Copy page puts the page's markdown on the clipboard", async () => {
  const { page, close } = await open("kind-stat.html");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => void (window.copied = t) } }));
  await page.click('[data-id="copy-page"]');
  strictEqual(await page.evaluate(() => window.copied), readFileSync(join(SITE, "kind-stat.md"), "utf8"));
  await close();
});
