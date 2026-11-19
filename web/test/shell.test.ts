import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { install } from "./dom.ts";

install();
const g = globalThis;
const posts = [];
const answers = [];
const sources = [];
const kept = new Map();
class Source {
  on = new Map();
  constructor(url) {
    this.url = url;
    sources.push(this);
  }
  addEventListener(t, f) {
    this.on.set(t, f);
  }
  emit(t, data) {
    this.on.get(t)?.({ data: JSON.stringify(data) });
  }
  close() {
    this.closed = true;
  }
}
g.EventSource = Source;
g.fetch = async (url, init) => {
  posts.push({ url, body: JSON.parse(init.body) });
  const a = answers.shift() ?? { status: 200, body: { keys: [] } };
  return { ok: a.status < 400, status: a.status, json: async () => a.body };
};
g.localStorage = { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, v), removeItem: (k) => kept.delete(k) };
g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
g.location = { hash: "" };
g.history = { replaceState: (_, __, h) => (g.location.hash = h) };
g.requestAnimationFrame = (f) => f();
g.setInterval = () => 0;
g.clearInterval = () => {};
document.head = document.createElement("head");

const { mount, resolved } = await import("../src/shell.ts");
const { defaultPair } = await import("../src/gen/schemes.ts");

const at = (place) => ({ compact: place, wide: place });
const screen = (id, path, place, label) => ({ type: "screen", id, source: "core", path, label, place: at(place), transition: "push" });
const layout = {
  format: 1,
  root: {
    type: "nav",
    id: "root",
    place: at("inline"),
    transition: "push",
    slots: {
      main: [screen("queue", "/screens/queue", "strip", "Queue"), screen("done", "/screens/done", "strip", "Done")],
      menu: [screen("about", "/screens/about", "menu", "About"), screen("gone", "/screens/gone", "hidden", "Gone")],
    },
  },
};
const queue = { type: "screen", id: "queue", title: "Queue", blocks: [{ type: "row", id: "r1", title: "first" }, { type: "button", id: "go", label: "Go", action: "go" }] };
const done = { type: "screen", id: "done", title: "Done", blocks: [{ type: "row", id: "d1", title: "shipped" }] };
const all = (e) => [e, ...e.children.flatMap(all)];
const find = (e, f) => all(e).find(f);
const byId = (e, id) => find(e, (x) => x.dataset.id === id && x.dataset.block);
const tick = () => new Promise((r) => setTimeout(r, 5));
const url = (source, path) => `http://app.test/${source}${path}`;

function fresh() {
  posts.length = answers.length = sources.length = 0;
  kept.clear();
  g.location.hash = "";
  return document.createElement("div");
}

test("resolved keeps the place the file gave each size class", () => {
  const n = { ...screen("q", "/q", "strip"), place: { compact: "menu", wide: "column" } };
  strictEqual(resolved(n, false).place, "menu");
  strictEqual(resolved(n, true).place, "column");
});

test("a two-tab layout draws its tabs, opens the first tab's key on one stream and follows its frames", async () => {
  const root = fresh();
  const shell = mount({ root, layout, url });
  const tabs = all(root).filter((e) => e.classList.contains("b-tab"));
  deepStrictEqual(tabs.map((t) => t.textContent), ["Queue", "Done", "menu"]);
  strictEqual(sources.length, 1);
  strictEqual(sources[0].url, "http://app.test/core/stream?v=1");
  answers.push({ status: 200, body: { keys: [{ k: "/screens/queue", rev: 3, screen: queue }] } });
  sources[0].emit("hello", { v: 1, sid: "s1", epoch: "e1", keys: 16 });
  await tick();
  deepStrictEqual(posts[0], { url: "http://app.test/core/stream/s1", body: { open: [{ k: "/screens/queue" }], close: [] } });
  strictEqual(find(byId(root, "r1"), (x) => x.classList.contains("b-row__title"))?.textContent, "first");
  strictEqual(g.location.hash, "#queue");
  sources[0].emit("message", { k: "/screens/queue", from: 3, rev: 4, ops: [{ op: "merge", id: "r1", fields: { title: "patched" } }] });
  await tick();
  strictEqual(find(byId(root, "r1"), (x) => x.classList.contains("b-row__title"))?.textContent, "patched");
  strictEqual(JSON.parse(kept.get("b:core/screens/queue")).blocks[0].title, "patched");

  answers.push({ status: 200, body: { keys: [{ k: "/screens/done", rev: 1, screen: done }] } }, { status: 200, body: { keys: [] } });
  tabs[1].onclick();
  await tick();
  strictEqual(sources.length, 1);
  deepStrictEqual(posts.slice(1).map((p) => p.body), [{ open: [{ k: "/screens/done" }], close: [] }, { open: [], close: ["/screens/queue"] }]);
  ok(byId(root, "d1"));
  ok(tabs[1].classList.contains("on") && !tabs[0].classList.contains("on"));
  shell.close();
});

test("a kept copy paints before the stream answers", () => {
  const root = fresh();
  kept.set("b:core/screens/queue", JSON.stringify(queue));
  const shell = mount({ root, layout, url });
  ok(byId(root, "r1"));
  strictEqual(posts.length, 0);
  shell.close();
});

test("an action posts to its source; its answer's ops patch the screen and its toast shows", async () => {
  const root = fresh();
  kept.set("b:core/screens/queue", JSON.stringify(queue));
  const shell = mount({ root, layout, url });
  answers.push({ status: 200, body: { ops: [{ op: "merge", id: "r1", fields: { title: "acted" } }], toast: "went" } });
  byId(root, "go").onclick();
  await tick();
  deepStrictEqual(posts[0], { url: "http://app.test/core/action", body: { action: "go", block: "go", values: {}, screen: "queue" } });
  strictEqual(find(byId(root, "r1"), (x) => x.classList.contains("b-row__title"))?.textContent, "acted");
  const toast = find(root, (x) => x.classList.contains("b-toast"));
  strictEqual(toast.textContent, "went");
  ok(!toast.hidden);
  answers.push({ status: 500, body: {} });
  byId(root, "go").onclick();
  await tick();
  strictEqual(toast.textContent, "action failed: 500");
  ok(toast.classList.contains("bad"));
  shell.close();
});

test("the menu lists the menu's screens but hidden ones, and the look sheet wears a scheme the app gave", () => {
  const root = fresh();
  const schemes = { "app-dark": { ...defaultPair.dark, label: "App dark", tokens: { ...defaultPair.dark.tokens, "--bg": "#102030" } } };
  const shell = mount({ root, layout, url, css: ["./app.css"], schemes });
  ok(document.head.children.some((e) => e.tagName === "LINK" && e.href === "./app.css"));
  find(root, (x) => x.classList.contains("b-menu")).onclick();
  const sheet = find(root, (x) => x.classList.contains("b-sheet"));
  ok(!sheet.hidden);
  const rows = all(sheet).filter((e) => e.classList.contains("rt"));
  deepStrictEqual(rows.map((r) => r.textContent), ["About", "look"]);
  rows[1].parentNode.parentNode.onclick();
  const [name, scheme] = Object.entries(schemes)[0];
  find(sheet, (x) => x.classList.contains("rt") && x.textContent === scheme.label).parentNode.parentNode.onclick();
  strictEqual(kept.get("b:look"), name);
  ok(document.head.children.findLast((e) => e.id === "b-look").textContent.startsWith(`:root{--bg:${scheme.tokens["--bg"]};`));
  shell.close();
});
