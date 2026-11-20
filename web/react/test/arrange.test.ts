import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { webkit } from "playwright";

const web = fileURLToPath(new URL("../../", import.meta.url));
const f = JSON.parse(readFileSync(new URL("../../../fixtures/layouts/edits.json", import.meta.url), "utf8"));
const css = readFileSync(new URL("../../dist/blocks.css", import.meta.url), "utf8");
const boot = `
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { editor } from "./src/arrange.ts";
import { Arrange } from "./react/src/index.ts";
const resolved = (n) => ({ ...n, place: n.place?.wide ?? n.place ?? "inline", slots: n.slots && Object.fromEntries(Object.entries(n.slots).map(([k, v]) => [k, v.map(resolved)])) });
export function boot(adapter, layout, slots) {
  window.saved = [];
  window.replies = [];
  const edit = { slots, save: async (e) => (window.saved.push(e), window.replies.shift() ?? true) };
  const root = document.querySelector("main");
  if (adapter === "html") {
    const ed = editor(edit, root);
    ed.tab.onclick();
    return { set: (l) => ed.draw(resolved(l.root), "wide") };
  }
  const r = createRoot(root);
  const set = (l) => flushSync(() => r.render(createElement(Arrange, { tree: resolved(l.root), size: "wide", edit })));
  return { set };
}`;
const js = buildSync({ stdin: { contents: boot, resolveDir: web, loader: "ts" }, bundle: true, format: "iife", globalName: "A", write: false, define: { "process.env.NODE_ENV": '"production"' } }).outputFiles[0].text;
const ids = ["bar", "pane", "inbox", "home", "box1", "box2", "box3", "box4", "about"];
const KEYS = {
  "Move earlier": ["ArrowUp"],
  "Move later": ["ArrowDown"],
  "Swap with the previous": ["ArrowLeft"],
  "Swap with the next": ["ArrowRight"],
  "Move to the previous slot": ["Shift+ArrowUp"],
  "Move to the next slot": ["Shift+ArrowDown"],
};

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(adapter) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.setContent(`<!doctype html><style>${css}</style><body><main></main>`);
  await p.addScriptTag({ content: js });
  await p.evaluate(([a, l, s]) => (window.ui = window.A.boot(a, l, s)).set(l), [adapter, f.layout, f.slots]);
  const handle = (id) => p.locator(`.b-arrange > .row[data-id="${id}"] > .b-hd`);
  const step = (id, name) => p.locator(`.b-arrange > .row[data-id="${id}"] > button.b-sr`, { hasText: name }).dispatchEvent("click");
  const keys = async (id, ks) => {
    await handle(id).focus();
    for (const k of ["Space", ...ks, "Enter"]) await p.keyboard.press(k);
  };
  const drag = async (id, dy) => {
    await p.evaluate(() => document.activeElement?.blur());
    const b = await handle(id).boundingBox();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + dy, { steps: 4 });
    await p.mouse.up();
  };
  const saved = async () => {
    await p.waitForTimeout(0);
    return p.evaluate(() => window.saved.splice(0));
  };
  const markup = () =>
    p.evaluate(() => {
      const walk = (n) =>
        n.nodeType === 3
          ? n.textContent
          : [n.tagName, Object.fromEntries([...n.attributes].map((a) => [a.name, a.value]).sort()), n.tagName === "SELECT" ? n.value : null, [...n.childNodes].map(walk)];
      return walk(document.querySelector(".b-sheet__body"));
    });
  return { p, handle, step, keys, drag, saved, markup };
}

const both = async (run) => {
  const got = {};
  for (const adapter of ["html", "react"]) {
    const ui = await open(adapter);
    got[adapter] = JSON.stringify(await run(ui));
    await ui.p.close();
  }
  strictEqual(got.react, got.html);
  return JSON.parse(got.react);
};

test("the React edit list draws the web sheet's markup and classes, handles and named actions included", async () => {
  const drawn = await both((ui) => ui.markup());
  ok(JSON.stringify(drawn).includes('"b-hd"'));
});

test("each node's keys and named steps send from React the one edit the web view sends, the same by either way", async () => {
  const sent = await both(async (ui) => {
    const out = {};
    for (const id of ids)
      for (const [name, ks] of Object.entries(KEYS)) {
        await ui.keys(id, ks);
        await ui.step(id, name);
        out[`${id} ${name}`] = await ui.saved();
      }
    return out;
  });
  for (const [k, got] of Object.entries(sent)) {
    ok(got.length === 0 || got.length === 2, k);
    deepStrictEqual(got[0], got[1], k);
    const drops = f.drops[k.split(" ")[0]];
    if (got[0] && drops) ok(drops.some((d) => JSON.stringify(d) === JSON.stringify(got[0])), k);
  }
  ok(Object.values(sent).filter((g) => g.length).length >= 30);
});

test("a React drag sends the web view's one edit, the same as the keys and the named step to that place", async () => {
  const sent = await both(async (ui) => {
    const out = { drags: [], home: [] };
    for (const id of ["bar", "pane", "inbox"])
      for (const dy of [-90, -30, 30]) {
        await ui.drag(id, dy);
        out.drags.push(...(await ui.saved()));
      }
    await ui.keys("home", ["ArrowDown"]);
    out.home.push(...(await ui.saved()));
    await ui.step("home", "Move later");
    out.home.push(...(await ui.saved()));
    const row = await ui.p.locator('.row[data-id="home"]').boundingBox();
    await ui.drag("home", row.height);
    out.home.push(...(await ui.saved()));
    return out;
  });
  ok(sent.drags.length >= 6, JSON.stringify(sent.drags));
  for (const e of sent.drags.filter((e) => f.drops[e.id ?? e.a])) ok(f.drops[e.id ?? e.a].some((d) => JSON.stringify(d) === JSON.stringify(e)), JSON.stringify(e));
  deepStrictEqual(sent.home, Array(3).fill({ edit: "move", id: "home", into: "box1", slot: "in", before: "box2" }));
});

test("a refused React edit says why and leaves the list as it was; a saved one is drawn once the host hands the layout in", async () => {
  const ui = await open("react");
  const order = () => ui.p.evaluate(() => [...document.querySelectorAll(".b-arrange > .row")].map((r) => [r.dataset.id, r.querySelectorAll(".b-hd").length, r.style.transform]));
  const was = await order();
  await ui.p.evaluate(() => window.replies.push("not yours"));
  await ui.step("home", "Swap with the next");
  deepStrictEqual(await ui.saved(), [{ edit: "swap", a: "home", b: "box1" }]);
  strictEqual(await ui.p.textContent('[role="alert"]'), "not yours");
  deepStrictEqual(await order(), was);
  await ui.p.evaluate(() => window.replies.push(false));
  await ui.p.selectOption('[aria-label="about shows on wide as"]', "panel");
  deepStrictEqual(await ui.saved(), [{ edit: "show", id: "about", size: "wide", place: "panel" }]);
  strictEqual(await ui.p.inputValue('[aria-label="about shows on wide as"]'), "sheet");
  const [home, box1] = f.layout.root.slots.main;
  await ui.p.evaluate((l) => window.ui.set(l), { ...f.layout, root: { ...f.layout.root, slots: { ...f.layout.root.slots, main: [box1, home] } } });
  const now = await order();
  deepStrictEqual(now.map(([id]) => id).slice(0, 8), ["root", "box1", "box2", "box3", "box4", "home", "about", "bar"]);
  ok(now.every(([id, n]) => n === (id === "root" ? 0 : 1)), "one handle a node");
  await ui.step("home", "Move earlier");
  strictEqual((await ui.saved()).length, 1);
  await ui.p.close();
});
