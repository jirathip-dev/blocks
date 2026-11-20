import { deepStrictEqual, ok } from "node:assert/strict";
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
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/index.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;

const more = [
  { type: "screen", id: "thread-1", title: "Talk", focus: true, actions: [{ label: "Add", action: "add" }, { label: "Docs", tap: { url: "https://x.test/d" } }, { label: "More", menu: [{ label: "Mute", action: "mute", enabled: false }] }], blocks: [{ type: "row", id: "top", title: "Pinned", sticky: true }, { type: "text", id: "m", markdown: "see t12 and `a **b**`\n[docs](https://x.test/a) or https://x.test/b.\n```sh\nls\n```" }] },
  { type: "row", id: "r", title: "Lane", style: "link", indent: 5, figure: { state: "working" }, badge: { text: "new", tone: "g" }, subtitle: { text: "busy", tone: "r" }, value: { since: "2026-11-09T09:35:00Z" }, tap: { action: "go" } },
  { type: "row", id: "u", title: "Out", tap: { url: "https://x.test/u" } },
  { type: "row", id: "w", title: "Swiped", swipe: [{ label: "Drop", action: "drop", tone: "bad" }, { label: "Keep", action: "keep" }] },
  { type: "row", id: "q", title: "Quiet", rounds: [{ id: "a", name: "impl", state: "done", since: "2026-11-09T09:35:00Z", tap: { action: "see" } }, { id: "b", name: "rev", state: "working", lane: { name: "rev-1", harness: "claude", lines: ["one", "two"] } }] },
  { type: "card", id: "f", title: "Folded", fold: { line: "3 waiting", main: { label: "Yes", action: "pick", value: "yes" } } },
  { type: "card", id: "k", title: "Ask", tone: "r", buttons: [{ type: "button", id: "ok", label: "OK", action: "ok", style: "primary" }, { type: "button", id: "web", label: "Site", tap: { url: "https://x.test/s" } }] },
  { type: "form", id: "f2", submit: { action: "go", label: "Go" }, fields: [{ type: "text", name: "q", keyboard: "number", value: 3 }, { type: "secret", name: "pw", set: true }, { type: "picker", name: "p", options: ["a", "b"] }, { type: "other", name: "o", label: "Other" }] },
  { type: "chips", id: "c", name: "c", action: "pick", multi: true, selected: ["b"], options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] },
  { type: "images", id: "i", size: "large", items: [{ src: "/media/a.png", alt: "a" }, { src: "javascript:x", alt: "bad" }, { src: "https://x.test/b.png" }] },
  { type: "section", id: "s", header: "waiting on you", footer: "that is all", blocks: [{ type: "stat", id: "t", items: [{ label: "cpu", value: 4, unit: "%", tone: "g", spark: [1, 3, 2] }, { label: "mem", value: { get: "m" } }] }] },
];

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function markup(p, b) {
  return p.evaluate((b) => {
    window.posts = [];
    window.sent = [];
    const ctx = { screen: String(b.id ?? ""), act: async (a) => (window.posts.push(a), true), tap: () => {}, open: new Set(), theme: window.H.plain, store: { get: () => null, put: () => {} }, held: new Map() };
    const a = document.getElementById("html"), r = document.getElementById("react");
    a.replaceChildren(window.H.render(b, ctx));
    if (window.view) window.view.set(b);
    else window.view = window.R.boot(r, b, { sent: (a) => (window.sent.push(a), true), dropped: () => {} });
    const kept = (n) => n === "role" || n.startsWith("data-") || n.startsWith("aria-");
    const seen = (e) => [e.tagName, [...e.classList].sort().join(" "), e.getAttributeNames().filter(kept).sort().map((n) => `${n}=${e.getAttribute(n)}`), [...e.childNodes].filter((t) => t.nodeType === 3).map((t) => t.textContent).join("")];
    const all = (root) => (root ? [root, ...root.querySelectorAll("*")].map(seen) : []);
    return [all(a.firstElementChild), all(r.querySelector(".b-view").firstElementChild)];
  }, b);
}

test("each kind React draws natively writes the HTML renderer's markup: tags, classes, data-*, role, aria-* and own text, in order", async () => {
  deepStrictEqual([...native].sort(), ["button", "card", "chips", "form", "images", "list", "row", "screen", "section", "sheet", "stat", "text", "timeline"]);
  const p = await browser.newPage();
  await p.setContent("<base href=https://x.test/><div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
  for (const b of [...native.map(fixture), ...fields, ...more]) {
    const [want, got] = await markup(p, b);
    ok(want.length > 1, `${b.type} ${b.id}: drew nothing`);
    deepStrictEqual(got, want, `${b.type} ${b.id}`);
  }
  await p.close();
});

test("a form filled the same way sends the same action from React as from the HTML renderer", async () => {
  const p = await browser.newPage();
  await p.setContent("<base href=https://x.test/><div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
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
