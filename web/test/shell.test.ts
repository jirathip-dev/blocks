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
const { tiles } = await import("../src/theme.ts");

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
  strictEqual(sources[0].url, "http://app.test/core/stream?v=2");
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

test("an action posts to its source; its answer's ops patch the screen, its toast shows and its undo posts the undo first", async () => {
  const root = fresh();
  kept.set("b:core/screens/queue", JSON.stringify(queue));
  const shell = mount({ root, layout, url });
  const toast = { title: "went", tone: "ok", undo: { action: "ungo", values: { n: 1 } } };
  answers.push({ status: 200, body: { ops: [{ op: "merge", id: "r1", fields: { title: "acted" } }], toast } });
  byId(root, "go").onclick();
  await tick();
  deepStrictEqual(posts[0], { url: "http://app.test/core/action", body: { action: "go", block: "go", values: {}, screen: "queue" } });
  strictEqual(find(byId(root, "r1"), (x) => x.classList.contains("b-row__title"))?.textContent, "acted");
  const shown = () => find(root, (x) => x.classList.contains("tst"));
  const text = (cls) => find(shown(), (x) => x.classList.contains(cls))?.textContent;
  deepStrictEqual([shown().className, shown().getAttribute("role"), shown().getAttribute("aria-label"), text("tsx")], ["tst ok", "status", "went", "went"]);
  strictEqual(find(root, (x) => x.classList.contains("tsts")).getAttribute("aria-live"), "polite");
  const undo = find(shown(), (x) => x.tagName === "BUTTON" && x.textContent === "undo");
  answers.push({ status: 200, body: { toast: { title: "back" } } });
  undo.onclick();
  await tick();
  deepStrictEqual(posts[1], { url: "http://app.test/core/action", body: { action: "ungo", values: { n: 1 }, screen: "queue" } });
  deepStrictEqual([text("tsx"), shown().className], ["back", "tst"]);
  answers.push({ status: 500, body: {} });
  byId(root, "go").onclick();
  await tick();
  deepStrictEqual([text("tsx"), text("tsn")], ["back", "+1"]);
  find(shown(), (x) => x.getAttribute("aria-label") === "dismiss").onclick();
  strictEqual(shown(), undefined);
  await new Promise((r) => setTimeout(r, 200));
  deepStrictEqual([text("tsx"), shown().getAttribute("role"), shown().className], ["action failed: 500", "alert", "tst bad"]);
  strictEqual(find(shown(), (x) => x.classList.contains("tsk")), undefined);
  shell.close();
  strictEqual(find(root, (x) => x.classList.contains("tsts")), undefined);
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
  ok(document.head.children.findLast((e) => e.id === "b-look").textContent.startsWith(`${tiles}:root{--bg:${scheme.tokens["--bg"]};`));
  shell.close();
});

test("mount's look code is the app's own look, worn until the owner picks a scheme and again on the app's own", () => {
  const root = fresh();
  kept.delete("b:look");
  const schemes = { "app-dark": { ...defaultPair.dark, label: "App dark" } };
  const shell = mount({ root, layout, url, schemes, look: "108bd0" });
  const worn = () => document.head.children.findLast((e) => e.id === "b-look").textContent;
  ok(worn().includes("--radius:24px;"), worn());
  strictEqual(document.documentElement.dataset.look, "default");
  find(root, (x) => x.classList.contains("b-menu")).onclick();
  const sheet = find(root, (x) => x.classList.contains("b-sheet"));
  all(sheet).filter((e) => e.classList.contains("rt"))[1].parentNode.parentNode.onclick();
  find(sheet, (x) => x.classList.contains("rt") && x.textContent === "App dark").parentNode.parentNode.onclick();
  ok(!worn().includes("--radius:24px;"), worn());
  find(sheet, (x) => x.classList.contains("rt") && x.textContent === "the app's own").parentNode.parentNode.onclick();
  deepStrictEqual([kept.get("b:look"), worn().includes("--radius:24px;")], [undefined, true]);
  shell.close();
});

const fire = (e, type, ev = {}) => e.listeners.filter(([t]) => t === type).forEach(([, f]) => f({ preventDefault() {}, ...ev }));
const editable = () => {
  const saved = [];
  const replies = [];
  const edit = { slots: { nav: ["side", "main", "menu"] }, save: async (e) => (saved.push(e), replies.shift() ?? true) };
  const root = fresh();
  kept.set("b:core/screens/queue", JSON.stringify(queue));
  const shell = mount({ root, layout, url, edit });
  find(root, (x) => x.textContent === "edit layout" && x.classList.contains("b-tab")).onclick();
  const sheet = find(root, (x) => x.classList.contains("b-sheet") && !x.hidden);
  const order = () => all(sheet).filter((x) => x.classList.contains("row") && x.dataset.id).map((x) => x.dataset.id);
  const handle = (label) => find(sheet, (x) => x.getAttribute("aria-label") === `Move ${label}`);
  return { saved, replies, root, shell, sheet, order, handle };
};
const later = { edit: "move", id: "queue", into: "root", slot: "main", before: null };

test("edit mode sends one edit for a node moved by pointer, by keys and by a named action", async () => {
  const { saved, shell, sheet, order, handle } = editable();
  deepStrictEqual(order(), ["root", "queue", "done", "about", "gone"]);
  strictEqual(handle("root"), undefined);
  const hd = handle("Queue");
  hd.setPointerCapture = () => {};
  hd.parentNode.offsetHeight = 40;
  fire(hd, "pointerdown", { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
  fire(hd, "pointermove", { clientX: 0, clientY: 40 });
  fire(hd, "pointerup");
  await tick();
  for (const key of [" ", "ArrowDown", "Enter"]) fire(handle("Queue"), "keydown", { key });
  await tick();
  find(sheet, (x) => x.tagName === "BUTTON" && x.textContent === "Move later" && x.parentNode === handle("Queue").parentNode).onclick();
  await tick();
  deepStrictEqual(saved, [later, later, later]);
  shell.close();
});

test("a refused edit leaves the layout as it was and shows why; a saved one is drawn once the host hands it in", async () => {
  const { saved, replies, root, shell, sheet, order, handle } = editable();
  replies.push("not yours");
  find(sheet, (x) => x.tagName === "BUTTON" && x.textContent === "Swap with the next" && x.parentNode === handle("Queue").parentNode).onclick();
  await tick();
  deepStrictEqual(saved, [{ edit: "swap", a: "queue", b: "done" }]);
  deepStrictEqual(order(), ["root", "queue", "done", "about", "gone"]);
  strictEqual(find(sheet, (x) => x.getAttribute("role") === "alert")?.textContent, "not yours");
  const pick = find(sheet, (x) => x.getAttribute("aria-label") === "About shows on compact as");
  replies.push(false);
  pick.value = "hidden";
  pick.onchange();
  await tick();
  deepStrictEqual(saved[1], { edit: "show", id: "about", size: "compact", place: "hidden" });
  strictEqual(pick.value, "menu");
  const [queueNode, doneNode] = layout.root.slots.main;
  shell.layout({ ...layout, root: { ...layout.root, slots: { ...layout.root.slots, main: [doneNode, queueNode] } } });
  const again = find(root, (x) => x.classList.contains("b-sheet") && !x.hidden);
  deepStrictEqual(all(again).filter((x) => x.classList.contains("row") && x.dataset.id).map((x) => x.dataset.id), ["root", "done", "queue", "about", "gone"]);
  fire(find(again, (x) => x.classList.contains("b-arrange")), "keydown", { key: "Escape" });
  ok(again.hidden);
  shell.close();
});

const chain = (titles) =>
  titles.forEach((title, i) => kept.set(`b:core/screens/${i ? `s${i}` : "queue"}`, JSON.stringify({ type: "screen", id: `s${i}`, title, blocks: [{ type: "button", id: `next${i}`, label: "next", tap: { open: `/screens/s${i + 1}` } }] })));
const deep = (root, n) => {
  for (let i = 0; i < n; i++) byId(root, `next${i}`).onclick();
};
const trailOf = (root) => find(root, (x) => x.tagName === "NAV" && x.getAttribute("aria-label") === "Breadcrumb");
const crumbs = (nav) => find(nav, (x) => x.tagName === "OL").children.map((li) => li.children[0]);
const backOf = (e) => find(e, (x) => x.classList.contains("b-back"));

test("a screen three deep draws its trail: earlier screens are links, the current one is the page, and back names the screen before", () => {
  const root = fresh();
  chain(["Queue", "Fleets", "cooee", "rev"]);
  const shell = mount({ root, layout, url });
  strictEqual(trailOf(root), undefined);
  strictEqual(backOf(root), undefined);
  deep(root, 3);
  const nav = trailOf(root);
  const items = crumbs(nav);
  deepStrictEqual(items.map((e) => [e.tagName, e.textContent, e.getAttribute("aria-current")]), [["A", "Queue", null], ["A", "Fleets", null], ["A", "cooee", null], ["SPAN", "rev", "page"]]);
  strictEqual(backOf(nav).textContent, "‹ cooee");
  items[1].onclick({ preventDefault() {} });
  ok(byId(root, "next1"));
  deepStrictEqual(crumbs(trailOf(root)).map((e) => e.textContent), ["Queue", "Fleets"]);
  backOf(root).onclick();
  ok(byId(root, "next0"));
  strictEqual(trailOf(root), undefined);
  shell.close();
});

test("six deep, the trail keeps the first, a menu of the hidden screens and the last two; a long title ends in … and keeps its full name", () => {
  const root = fresh();
  chain(["Queue", "Fleets", "cooee", "roles", "herdsman-staging-mirror-west", "accounts"]);
  const shell = mount({ root, layout, url });
  deep(root, 5);
  const items = crumbs(trailOf(root));
  deepStrictEqual(items.map((e) => e.textContent), ["Queue", "…", "herdsman-staging-mi…", "accounts"]);
  deepStrictEqual([items[2].getAttribute("aria-label"), items[0].getAttribute("aria-label")], ["herdsman-staging-mirror-west", null]);
  strictEqual(backOf(root).textContent, "‹ herdsman-staging-mirror-west");
  const more = items[1];
  const menu = find(more.parentNode, (x) => x.getAttribute("role") === "menu");
  deepStrictEqual([more.getAttribute("aria-label"), more.getAttribute("aria-expanded"), menu.hidden], ["3 more screens", "false", true]);
  more.onclick();
  deepStrictEqual([more.getAttribute("aria-expanded"), menu.hidden], ["true", false]);
  const hidden = menu.children;
  deepStrictEqual(hidden.map((a) => [a.textContent, a.getAttribute("role")]), [["Fleets", "menuitem"], ["cooee", "menuitem"], ["roles", "menuitem"]]);
  hidden[1].onclick({ preventDefault() {} });
  ok(byId(root, "next2"));
  deepStrictEqual(crumbs(trailOf(root)).map((e) => e.textContent), ["Queue", "Fleets", "cooee"]);
  shell.close();
});

test("in a sheet there is no trail and back names the screen before; the look sheet's back names the menu", () => {
  const root = fresh();
  kept.set("b:core/screens/about", JSON.stringify({ type: "screen", id: "about", title: "About", blocks: [{ type: "button", id: "more", label: "more", tap: { open: "/screens/credits" } }] }));
  kept.set("b:core/screens/credits", JSON.stringify({ type: "screen", id: "credits", title: "Credits", blocks: [] }));
  const shell = mount({ root, layout, url });
  find(root, (x) => x.classList.contains("b-menu")).onclick();
  const sheet = find(root, (x) => x.classList.contains("b-sheet"));
  find(sheet, (x) => x.classList.contains("rt") && x.textContent === "About").parentNode.parentNode.onclick();
  strictEqual(backOf(sheet), undefined);
  byId(sheet, "more").onclick();
  deepStrictEqual([backOf(sheet).textContent, trailOf(sheet)], ["‹ About", undefined]);
  backOf(sheet).onclick();
  ok(byId(sheet, "more"));
  find(root, (x) => x.classList.contains("b-menu")).onclick();
  find(sheet, (x) => x.classList.contains("rt") && x.textContent === "look").parentNode.parentNode.onclick();
  strictEqual(backOf(sheet).textContent, "‹ menu");
  shell.close();
});
