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
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/block.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;

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

more.push(
  { type: "scene", id: "sc", label: "lanes", lanes: [{ id: "a", title: "impl", state: "working", stage: "build", tool: "cargo", tap: { action: "see" } }, { id: "b", title: "rev", state: "done", tap: { url: "https://x.test/l" } }] },
  { type: "choice", id: "ch", action: "answer", recommended: "b", default: { value: "b", until: "2026-11-09T09:35:00Z", label: "goes to b" }, other: { placeholder: "say", for: "c" }, options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
  { type: "diagram", id: "dg", selected: "b", counts: { a: 2, b: 0 }, nodes: { b: { state: "warn", tap: { action: "b" } }, t: { limit: "ttl", label: "Timeout", value: "5m" } }, source: '[*] --> a\nstate "Bee" as b\na --> b\nb --> a\na --> c\nc --> b\nb --> t' },
  { type: "editor", id: "ed", name: "src", action: "save", first: 3, text: "one\n\nthree", errors: [{ line: 4, message: "blank" }, { line: 1, message: "far" }] },
  { type: "secret", id: "sec", name: "key", action: "set", set: true, values: { k: 1 } },
  { type: "diff", id: "df", file: "a.rs", summary: "+1 -0", hunks: [] },
  { type: "web", id: "wb", src: "javascript:alert(1)", height: 100 },
  { type: "web", id: "wb2", src: "https://x.test/page?q=1", height: 100 },
  { type: "hero", id: "hr", title: "Hi", actions: [{ label: "Site", tap: { url: "https://x.test/h" } }, { label: "Go", action: "go", enabled: false }] },
  { type: "nav", id: "nv", links: [{ label: "Here", href: "/here", current: true }, { label: "Bad", href: "javascript:x" }] },
  { type: "run", id: "rn", action: "ok", command: "ls", sha: "abc", touches: "staging" },
  { type: "config", id: "cf", action: "save", submit: { action: "all", label: "Save all" }, fields: [{ type: "picker", name: "p", options: ["a", "b"], open: true }, { type: "toggle", name: "t", error: "bad" }] },
  { type: "prose", id: "pr", parts: [{ part: "para", spans: [{ text: "x", italic: true, code: true, link: "https://x.test/p" }] }, { part: "heading", level: 9, spans: [{ text: "deep" }] }] },
  { type: "composer", id: "cm", action: "say", label: "Send", acts: { steer: "steer", unqueue: "unq" }, queued: [{ q: 1, text: "later" }], chips: [{ name: "model", all: ["m1", "m2"], cur: "m2" }, { name: "effort", all: ["lo", "hi"] }] },
);
more.push({ ...JSON.parse(readFileSync(new URL("../../../fixtures/gesture/media.json", import.meta.url), "utf8")).block });

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

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
  deepStrictEqual([...native].sort(), ["button", "card", "chips", "choice", "composer", "config", "diagram", "diff", "editor", "form", "hero", "images", "import", "list", "media", "nav", "pages", "prose", "row", "run", "scene", "screen", "secret", "section", "sheet", "stat", "table", "text", "timeline", "web"]);
  const p = await browser.newPage();
  await p.setContent("<base href=https://x.test/><div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
  for (const b of [...native.map(fixture), fixture("table-grid"), ...fields, ...more]) {
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

test("run, choice, secret, composer and config used the same way send the same actions from React as from the HTML renderer", async () => {
  const p = await browser.newPage();
  await p.setContent("<base href=https://x.test/><div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
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
  const [posts, sent] = await p.evaluate(() => [window.posts.map(({ action, block, values }) => ({ action, block, values })), window.sent.map(({ screen, ...a }) => a)]);
  deepStrictEqual(posts.length, 6);
  deepStrictEqual(sent, posts);
  await p.close();
});
