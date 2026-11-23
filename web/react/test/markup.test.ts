import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";
import { native } from "../src/view.ts";

const web = fileURLToPath(new URL("../../", import.meta.url));
const fixture = (k) => JSON.parse(readFileSync(new URL(`../../../fixtures/blocks/${k}.json`, import.meta.url), "utf8"));
const fields = readdirSync(new URL("../../../fixtures/fields/", import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(`../../../fixtures/fields/${f}`, import.meta.url), "utf8")));
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/block.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;

const cases = new URL("markup/", import.meta.url);
const more = readdirSync(cases).flatMap((f) => JSON.parse(readFileSync(new URL(f, cases), "utf8")));
more.push({ ...JSON.parse(readFileSync(new URL("../../../fixtures/gesture/media.json", import.meta.url), "utf8")).block });
more.push({ ...JSON.parse(readFileSync(new URL("../../../fixtures/append/thread.screen.json", import.meta.url), "utf8")) });

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());
const page = async () => { const p = await browser.newPage(); await p.setContent("<base href=https://x.test/><div id=html></div><div id=react></div>"); await p.addScriptTag({ content: reactJs() }); await p.addScriptTag({ content: html }); return p; };

async function markup(p, b) {
  return p.evaluate(async (b) => {
    window.posts = [];
    window.sent = [];
    const ctx = { screen: String(b.id ?? ""), act: async (a) => (window.posts.push(a), true), tap: () => {}, open: new Set(), theme: window.H.plain, store: { get: () => null, put: () => {} }, held: new Map() };
    const a = document.getElementById("html"), r = document.getElementById("react");
    a.replaceChildren(window.H.render(b, ctx));
    if (window.view) window.view.set(b);
    else window.view = window.R.boot(r, b, { sent: (a) => (window.sent.push(a), true), dropped: () => {} });
    await new Promise((t) => setTimeout(t));
    const kept = (n) => n === "role" || n.startsWith("data-") || n.startsWith("aria-");
    const seen = (e) => [e.tagName, [...e.classList].sort().join(" "), e.getAttributeNames().filter(kept).sort().map((n) => `${n}=${e.getAttribute(n)}`), [...e.childNodes].filter((t) => t.nodeType === 3).map((t) => t.textContent).join("")];
    const all = (root) => (root ? [root, ...root.querySelectorAll("*")].map(seen) : []);
    return [all(a.firstElementChild), all(r.querySelector(".b-view").firstElementChild)];
  }, b);
}

test("each kind React draws natively writes the HTML renderer's markup: tags, classes, data-*, role, aria-* and own text, in order", async () => {
  const p = await page();
  for (const b of [...native.map(fixture), fixture("table-grid"), ...fields, ...more]) {
    const [want, got] = await markup(p, b);
    ok(want.length > 1, `${b.type} ${b.id}: drew nothing`);
    deepStrictEqual(got, want, `${b.type} ${b.id}`);
  }
  await p.close();
});

test("a form filled the same way sends the same action from React as from the HTML renderer", async () => {
  const p = await page();
  const f = { type: "form", id: "f", submit: { action: "go", label: "Go", values: { k: 1 } }, fields: [{ type: "text", name: "q" }, { type: "secret", name: "pw" }, { type: "picker", name: "p", options: ["a", "b"] }, { type: "toggle", name: "t" }, { type: "secret", name: "pin" }] };
  await markup(p, { type: "screen", id: "s", title: "S", blocks: [f] });
  for (const root of ["#html", "#react"]) {
    await p.fill(`${root} input[name="q"]`, "hi");
    await p.fill(`${root} input[name="pw"]`, "x");
    await p.selectOption(`${root} select[name="p"]`, "b");
    await p.click(`${root} [data-submit]`);
  }
  await p.waitForFunction(() => window.sent.length === 1);
  const [posts, sent] = await p.evaluate(() => [window.posts, window.sent]);
  deepStrictEqual(posts, [{ action: "go", block: "f", values: { k: 1, q: "hi", pw: "x", p: "b", t: false } }]);
  deepStrictEqual(sent, [{ screen: "s", ...posts[0] }]);
  await p.close();
});

test("a checkbox toggle's row is a tap target at least 44 px tall in HTML and React: a tap on its label ticks it and the form sends true", async () => {
  const p = await page();
  await p.addStyleTag({ content: readFileSync(new URL("../../dist/blocks.css", import.meta.url), "utf8") });
  const f = { type: "form", id: "f", submit: { action: "go", label: "Go" }, fields: [{ type: "toggle", name: "full", label: "Received in full", as: "check" }] };
  await markup(p, { type: "screen", id: "s", title: "S", blocks: [f] });
  for (const root of ["#html", "#react"]) {
    const row = p.locator(`${root} label.fd`);
    ok((await row.boundingBox()).height >= 44, `${root} row height`);
    strictEqual(await p.locator(`${root} input[name="full"]`).getAttribute("role"), null);
    await p.click(`${root} label.fd .fk`);
    strictEqual(await p.locator(`${root} input[name="full"]`).isChecked(), true);
    await p.click(`${root} [data-submit]`);
  }
  await p.waitForFunction(() => window.sent.length === 1);
  const [posts, sent] = await p.evaluate(() => [window.posts.map(({ action, block, values }) => ({ action, block, values })), window.sent.map(({ screen: _s, ...a }) => a)]);
  deepStrictEqual(posts, [{ action: "go", block: "f", values: { full: true } }]);
  deepStrictEqual(sent, posts);
  await p.close();
});

test("run, choice, secret, composer and config used the same way send the same actions from React as from the HTML renderer", async () => {
  const p = await page();
  const blocks = [
    { type: "run", id: "rn", action: "ok", command: "ls", sha: "abc" },
    { type: "choice", id: "ch", action: "answer", values: { k: 1 }, other: { for: "c" }, options: [{ value: "a", label: "A" }, { value: "b", label: "B", values: { w: 2 } }] },
    { type: "secret", id: "sec", name: "key", action: "set" },
    { type: "composer", id: "cm", action: "say", values: { v: 3 }, chips: [{ name: "model", all: ["m1", "m2"] }] },
    { type: "config", id: "cf", action: "save", fields: [{ type: "picker", name: "p", options: ["a", "b"] }] },
  ];
  await markup(p, { type: "screen", id: "s", title: "S", blocks });
  const steps = async (root) => {
    await p.click(`${root} [data-block=run] button.bad`);
    await p.click(`${root} button[name=choice] >> text=B`);
    await p.fill(`${root} input[name=other]`, "mine");
    await p.click(`${root} form.other button`);
    await p.fill(`${root} input[name=key]`, "s3");
    await p.click(`${root} .secret button`);
    await p.selectOption(`${root} .pk select`, "m2");
    await p.fill(`${root} textarea[name=text]`, "hello");
    await p.click(`${root} .cr button.primary`);
    await p.selectOption(`${root} select[name=p]`, "b");
  };
  await steps("#html");
  await steps("#react");
  await p.waitForFunction(() => window.sent.length === 6);
  const bare = ({ nonce: _nonce, ...v }) => v;
  const [posts, sent] = await p.evaluate(() => [window.posts.map(({ action, block, values }) => ({ action, block, values })), window.sent.map(({ screen, ...a }) => a)]);
  for (const a of [...posts, ...sent]) if (a.action === "say") a.values = bare(a.values);
  deepStrictEqual(posts.length, 6);
  deepStrictEqual(sent, posts);
  await p.close();
});

test("React's composer puts a fresh nonce on each send and repeats it on a retry of a failed send", async () => {
  const p = await page();
  await p.evaluate(() => {
    window.sent = [];
    window.R.boot(document.getElementById("react"), { type: "screen", id: "s", title: "S", blocks: [{ type: "composer", id: "cm", action: "say" }] }, { sent: (a) => (window.sent.push(a), window.sent.length > 1), dropped: () => {} });
  });
  await p.fill("#react textarea[name=text]", "hi");
  await p.click("#react .cr button.primary");
  await p.click("#react .cs button.bad");
  await p.waitForFunction(() => window.sent.length === 2);
  await p.fill("#react textarea[name=text]", "hi");
  await p.click("#react .cr button.primary");
  await p.waitForFunction(() => window.sent.length === 3);
  const [first, retry, next] = await p.evaluate(() => window.sent.map((a) => a.values.nonce));
  ok(/^[0-9a-f]{32}$/.test(first), first);
  deepStrictEqual(retry, first);
  ok(next !== first && /^[0-9a-f]{32}$/.test(next), next);
  await p.close();
});
