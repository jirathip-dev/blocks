import { deepStrictEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";
import { native } from "../src/view.ts";

const web = fileURLToPath(new URL("../../", import.meta.url));
const fixture = (k) => JSON.parse(readFileSync(new URL(`../../../fixtures/blocks/${k}.json`, import.meta.url), "utf8"));
const html = buildSync({ stdin: { contents: 'export { render } from "./src/render/index.ts"; export { plain } from "./src/theme.ts";', resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "H", write: false }).outputFiles[0].text;

const more = [
  { type: "screen", id: "thread-1", title: "Talk", focus: true, actions: [{ label: "Add", action: "add" }, { label: "Docs", tap: { url: "https://x.test/d" } }, { label: "More", menu: [{ label: "Mute", action: "mute", enabled: false }] }], blocks: [{ type: "row", id: "top", title: "Pinned", sticky: true }, { type: "text", id: "m", markdown: "see t12 and `a **b**`\n[docs](https://x.test/a) or https://x.test/b.\n```sh\nls\n```" }] },
  { type: "row", id: "r", title: "Lane", style: "link", indent: 5, figure: { state: "working" }, badge: { text: "new", tone: "g" }, subtitle: { text: "busy", tone: "r" }, value: { since: "2026-11-09T09:35:00Z" }, tap: { action: "go" } },
  { type: "row", id: "u", title: "Out", tap: { url: "https://x.test/u" } },
  { type: "row", id: "w", title: "Swiped", swipe: [{ label: "Drop", action: "drop", tone: "bad" }, { label: "Keep", action: "keep" }] },
  { type: "row", id: "q", title: "Quiet", rounds: [{ id: "a", name: "impl", state: "done", since: "2026-11-09T09:35:00Z", tap: { action: "see" } }, { id: "b", name: "rev", state: "working", lane: { name: "rev-1", harness: "claude", lines: ["one", "two"] } }] },
  { type: "card", id: "f", title: "Folded", fold: { line: "3 waiting", main: { label: "Yes", action: "pick", value: "yes" } } },
  { type: "card", id: "k", title: "Ask", tone: "r", buttons: [{ type: "button", id: "ok", label: "OK", action: "ok", style: "primary" }, { type: "button", id: "web", label: "Site", tap: { url: "https://x.test/s" } }] },
  { type: "section", id: "s", header: "waiting on you", footer: "that is all", blocks: [{ type: "stat", id: "t", items: [{ label: "cpu", value: 4, unit: "%", tone: "g", spark: [1, 3, 2] }, { label: "mem", value: { get: "m" } }] }] },
];

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function markup(p, b) {
  return p.evaluate((b) => {
    const ctx = { screen: String(b.id ?? ""), act: async () => true, tap: () => {}, open: new Set(), theme: window.H.plain, store: { get: () => null, put: () => {} }, held: new Map() };
    const a = document.getElementById("html"), r = document.getElementById("react");
    a.replaceChildren(window.H.render(b, ctx));
    if (window.view) window.view.set(b);
    else window.view = window.R.boot(r, b, { sent: () => true, dropped: () => {} });
    const kept = (n) => n === "role" || n.startsWith("data-") || n.startsWith("aria-");
    const seen = (e) => [e.tagName, [...e.classList].sort().join(" "), e.getAttributeNames().filter(kept).sort().map((n) => `${n}=${e.getAttribute(n)}`), [...e.childNodes].filter((t) => t.nodeType === 3).map((t) => t.textContent).join("")];
    const all = (root) => (root ? [root, ...root.querySelectorAll("*")].map(seen) : []);
    return [all(a.firstElementChild), all(r.querySelector(".b-view").firstElementChild)];
  }, b);
}

test("each kind React draws natively writes the HTML renderer's markup: tags, classes, data-*, role, aria-* and own text, in order", async () => {
  deepStrictEqual([...native].sort(), ["button", "card", "list", "row", "screen", "section", "sheet", "stat", "text"]);
  const p = await browser.newPage();
  await p.setContent("<div id=html></div><div id=react></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: html });
  for (const b of [...native.map(fixture), ...more]) {
    const [want, got] = await markup(p, b);
    ok(want.length > 1, `${b.type} ${b.id}: drew nothing`);
    deepStrictEqual(got, want, `${b.type} ${b.id}`);
  }
  await p.close();
});
