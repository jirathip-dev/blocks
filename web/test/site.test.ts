import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";

const BASE = "http://blocks.test/";
const at = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(at(p), "utf8");
const live = read("../../fixtures/site/live.html");
const still = read("../../fixtures/site/index.html");
let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open({ js = true, page: doc = live } = {}) {
  const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 390, height: 1400 } });
  const page = await ctx.newPage();
  const posts = [];
  await page.route("**/*", (r) => {
    const q = r.request();
    const p = q.url().slice(BASE.length);
    if (!q.url().startsWith(BASE)) return r.abort();
    if (q.method() === "POST") {
      posts.push({ path: p, type: q.headers()["content-type"], body: q.postData() });
      return r.fulfill({ body: q.headers()["content-type"]?.startsWith("application/json") ? "{}" : "posted", contentType: "text/html" });
    }
    if (p === "") return r.fulfill({ body: doc, contentType: "text/html" });
    if (p === "docs") return r.fulfill({ body: "<!doctype html><p>docs", contentType: "text/html" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  return { page, posts, close: () => ctx.close() };
}

const tree = (page) =>
  page.evaluate(async () => {
    const B = await import("/blocks.js");
    return B.dump(document.querySelector("main"));
  });

test("site and render give the same element per kind: tag, classes, hooks and text", async () => {
  const { page, close } = await open({ page: "<!doctype html><body>" });
  const kinds = readdirSync(at("../../fixtures/blocks/")).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 27);
  for (const k of kinds) {
    const [written, drawn] = await page.evaluate(
      async ([html, b]) => {
        const B = await import("/blocks.js");
        const sig = (e) =>
          [e, ...e.querySelectorAll("*")]
            .filter((x) => x.hasAttribute("data-block") || [...x.classList].some((c) => c.startsWith("b-")))
            .map((x) => ({
              tag: x.tagName,
              cls: [...x.classList].sort().join(" "),
              hooks: ["data-block", "data-variant", "data-tone", "data-fallback"].map((a) => x.getAttribute(a)),
              id: x.dataset.id || "",
              text: x.textContent.replace(/\s+/g, " ").trim(),
            }));
        const t = document.createElement("template");
        t.innerHTML = html;
        const ctx = { screen: String(b.id ?? ""), act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} } };
        return [sig(t.content.querySelector("[data-block]")), sig(B.render(b, ctx))];
      },
      [read(`../../fixtures/html/${k}.html`), JSON.parse(read(`../../fixtures/blocks/${k}.json`))],
    );
    ok(written.length > 0, k);
    deepStrictEqual(written, drawn, k);
  }
  await close();
});

test("the fixture site with JS off: a link goes and a form posts", async () => {
  const { page, posts, close } = await open({ js: false });
  await page.click('a[href="/docs"]');
  await page.waitForURL(`${BASE}docs`);
  await page.goBack();
  await page.fill('input[name="email"]', "a@b.test");
  await page.press('input[name="email"]', "Enter");
  await page.waitForURL(`${BASE}act`);
  deepStrictEqual(posts, [{ path: "act", type: "application/x-www-form-urlencoded", body: "email=a%40b.test&_screen=site&_block=signup&_action=sign-up" }]);
  await close();
});

test("the fixture site is the same PNG and tree before and after blocks.js takes it over; then a form posts in place", async () => {
  const off = await open({ js: false });
  const shot = await off.page.screenshot({ fullPage: true });
  await off.close();
  const plain = await open({ page: still });
  const want = await tree(plain.page);
  await plain.close();
  const on = await open();
  ok(shot.equals(await on.page.screenshot({ fullPage: true })), "the PNG changed when blocks.js took the page over");
  deepStrictEqual(await tree(on.page), want);
  strictEqual(want[0].kind, "screen");
  await on.page.fill('input[name="email"]', "a@b.test");
  const sent = on.page.waitForResponse((r) => r.request().method() === "POST");
  await on.page.press('input[name="email"]', "Enter");
  await sent;
  strictEqual(on.page.url(), BASE);
  deepStrictEqual(
    on.posts.map((p) => ({ ...p, body: JSON.parse(p.body) })),
    [{ path: "act", type: "application/json", body: { screen: "site", action: "sign-up", block: "signup", values: { email: "a@b.test" } } }],
  );
  await on.close();
});

test("a page whose element differs from its screen stays static", async () => {
  const { page, posts, close } = await open({ page: live.replace('data-block="hero"', 'data-block="card"') });
  await page.press('input[name="email"]', "Enter");
  await page.waitForURL(`${BASE}act`);
  strictEqual(posts[0].type, "application/x-www-form-urlencoded");
  await close();
});
