import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";

const BASE = "http://blocks.test/";
const at = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(at(p), "utf8");
const live = read("../../fixtures/site/live.html");
const still = read("../../fixtures/site/index.html");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
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
    if (p.startsWith("media/")) return r.fulfill({ body: PNG, contentType: "image/png" });
    if (p === "docs") return r.fulfill({ body: "<!doctype html><p>docs", contentType: "text/html" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  if (js) await settled(page);
  return { page, posts, close: () => ctx.close() };
}

const settled = (page) =>
  page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 5000 });

const tree = (page) =>
  page.evaluate(async () => {
    const B = await import("/blocks.js");
    return B.dump(document.querySelector("main"));
  });

test("the static page draws a table with more as the rows it has: no loading row, its count and total as for a whole table", () => {
  const html = read("../../fixtures/html/table-ot.html");
  ok(html.includes(">4 rows<") && html.includes(">Total<"), html);
  ok(!html.includes("tbmo") && !html.includes("loaded"), html);
});

test("site and render give the same element per kind: tag, classes, hooks, role, name and text", async () => {
  const { page, close } = await open({ page: "<!doctype html><body>" });
  const kinds = readdirSync(at("../../fixtures/blocks/")).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 36);
  for (const k of kinds) {
    const [written, drawn] = await page.evaluate(
      async ([html, b]) => {
        const B = await import("/blocks.js");
        const bare = (x) => {
          const c = x.cloneNode(true);
          c.querySelectorAll(".tbh :is(select, button), .tbm, .tbg, .tbo, .dcc, .dcb, .tmz, .b-sr").forEach((e) => e.remove());
          return c;
        };
        const sig = (e) =>
          [e, ...e.querySelectorAll("*")]
            .filter((x) => !x.classList.contains("b-sr"))
            .filter((x) => !x.closest(".tbg") && (x.hasAttribute("data-block") || x.hasAttribute("data-action") || [...x.classList].some((c) => c.startsWith("b-"))))
            .map((x) => ({
              tag: x.tagName,
              cls: [...x.classList].sort().join(" "),
              hooks: ["data-block", "data-variant", "data-tone", "data-fallback", "data-action", "role", "aria-label"].map((a) => x.getAttribute(a)),
              id: x.dataset.id || "",
              text: bare(x).textContent.replace(/\s+/g, " ").trim(),
            }));
        const t = document.createElement("template");
        t.innerHTML = html;
        const ctx = { screen: String(b.id ?? ""), act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} } };
        const still = (e) => (e.querySelectorAll("[data-tick]").forEach((x) => (x.textContent = JSON.stringify(Object.entries(JSON.parse(x.dataset.tick)).sort()))), e);
        return [sig(still(t.content.querySelector("[data-block]"))), sig(still(B.render(b, ctx)))];
      },
      [read(`../../fixtures/html/${k}.html`), { ...JSON.parse(read(`../../fixtures/blocks/${k}.json`)), more: undefined }],
    );
    ok(written.length > 0, k);
    deepStrictEqual(written, drawn, k);
  }
  await close();
});

test("the site's workflow diagram is the one render lays out: every element, its place and its lines", async () => {
  const { page, close } = await open();
  const [written, drawn] = await page.evaluate(async () => {
    const B = await import("/blocks.js");
    const round = (d) => (d ?? "").replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (n) => String(Math.round(Number(n) * 100) / 100));
    const sig = (e) =>
      [e, ...e.querySelectorAll("*")].map((x) => ({
        tag: x.tagName.toLowerCase(),
        cls: [...x.classList].sort().join(" "),
        at: ["aria-label", "aria-hidden", "role", "tabindex", "title", "width", "height", "cx", "cy", "r"].map((a) => x.getAttribute(a)),
        style: x.style?.cssText ?? "",
        d: round(x.getAttribute("d")),
        text: x.children.length ? "" : x.textContent,
      }));
    const screen = JSON.parse(document.getElementById("blocks-screen").textContent);
    const b = screen.blocks.find((x) => x.type === "diagram");
    const ctx = { screen: "site", act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} } };
    return [sig(document.querySelector('[data-id="workflow"]')), sig(B.render(b, ctx))];
  });
  ok(written.filter((x) => x.cls.includes("dgn")).length >= 16, `${written.length} elements`);
  ok(written.some((x) => x.cls.includes("timer")) && written.some((x) => x.text === "optional") && written.some((x) => x.cls.includes("picked")));
  deepStrictEqual(written, drawn);
  await close();
});

test("a chart: site and render write the same marks, labels and table; a tap sends its month and picks it, a hover moves the legend", async () => {
  const { page, close } = await open({ page: '<!doctype html><link rel="stylesheet" href="/blocks.css"><body>' });
  const b = JSON.parse(read("../../fixtures/blocks/chart.json"));
  const got = await page.evaluate(
    async ([html, b]) => {
      const B = await import("/blocks.js");
      const sig = (e) =>
        [e, ...e.querySelectorAll("*")].map((x) => ({
          tag: x.tagName.toLowerCase(),
          cls: [...x.classList].sort().join(" "),
          at: ["aria-label", "aria-pressed", "style", "d", "x", "y", "width", "height", "viewBox"].map((a) => x.getAttribute(a)),
          text: x.children.length ? "" : x.textContent,
        }));
      const t = document.createElement("template");
      t.innerHTML = html;
      const sent = [];
      const ctx = { screen: "s", act: async (a) => (sent.push(a), true), tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} } };
      const e = B.render(b, ctx);
      document.body.append(e);
      window.sent = sent;
      return [sig(t.content.querySelector("[data-block]")), sig(e)];
    },
    [read("../../fixtures/html/chart.html"), b],
  );
  deepStrictEqual(got[0], got[1]);
  ok(got[1].filter((x) => x.tag === "rect").length === 6 && got[1].some((x) => x.tag === "path"), "six bars and the target line");
  const legend = () => page.textContent(".chl .chx");
  const pressed = () => page.$$eval(".chc", (cs) => cs.map((c) => c.getAttribute("aria-pressed")));
  strictEqual(await legend(), "Mar 2567");
  await page.click(".chc >> nth=0");
  deepStrictEqual(await page.evaluate(() => window.sent), [{ action: "sales.month", block: "revenue", values: { x: "2024-01" } }]);
  deepStrictEqual(await pressed(), ["true", null, null, null, null, null]);
  strictEqual(await page.textContent(".chx2 .sel"), "Jan 67");
  await page.hover(".chc >> nth=5");
  strictEqual(await legend(), "Jun 2567");
  await page.mouse.move(0, 0);
  strictEqual(await legend(), "Jan 2567");
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

test("an upload with JS off is the browser's own file input: the page's form posts the picked file as multipart", async () => {
  const doc = `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><body>${read("../../fixtures/fields/html/upload.html")}`;
  const { page, posts, close } = await open({ js: false, page: doc });
  await page.setInputFiles('input[name="photos"]', { name: "door.jpg", mimeType: "image/jpeg", buffer: Buffer.from("JPEG-BYTES") });
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}act`);
  strictEqual(posts.length, 1);
  ok(posts[0].type.startsWith("multipart/form-data; boundary="), posts[0].type);
  ok(/name="photos"; filename="door\.jpg"\r\nContent-Type: image\/jpeg\r\n/.test(posts[0].body), posts[0].body);
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
  deepStrictEqual(await on.page.evaluate(() => document.getAnimations().map((a) => a.animationName)), []);
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
