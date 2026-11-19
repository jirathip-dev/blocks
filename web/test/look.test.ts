import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair, defaultStyle } from "../src/gen/schemes.ts";
import { css, tiles } from "../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const still = read("../../fixtures/styles/still-tiles.css");
const PAGE = (own) =>
  `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair.light)}</style>${own ? `<style>${own}</style>` : ""}` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;

const rows = (n, at = "") => Array.from({ length: n }, (_, i) => ({ type: "row", id: `${at}r${i}`, title: `Row ${i}` }));
const queue = {
  type: "screen",
  id: "queue",
  title: "Queue",
  blocks: [{ type: "stat", id: "s", items: [{ label: "open", value: 3 }, { label: "done", value: 9 }] }, { type: "list", id: "rows", rows: rows(30) }],
};
const done = { type: "screen", id: "done", title: "Done", blocks: [{ type: "list", id: "drows", rows: rows(2, "d") }] };
const at = (place) => ({ compact: place, wide: place });
const tab = (id, label) => ({ type: "screen", id, source: "core", path: `/screens/${id}`, label, place: at("strip"), transition: "push" });
const layout = { format: 1, root: { type: "nav", id: "root", place: at("inline"), transition: "push", slots: { main: [tab("queue", "Queue"), tab("done", "Done")] } } };

function fake() {
  const w = window;
  w.answers = [];
  w.EventSource = class {
    on = {};
    constructor() {
      w.src = this;
    }
    addEventListener(t, f) {
      this.on[t] = f;
    }
    close() {}
  };
  w.fetch = async () => {
    const body = w.answers.shift() ?? { keys: [] };
    return { ok: true, status: 200, json: async () => body };
  };
  w.emit = (t, data) => w.src.on[t]({ data: JSON.stringify(data) });
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  w.settled = async () => {
    await new Promise((r) => setTimeout(r, 0));
    await frames();
    const runs = document.getAnimations().map((a) => ({ name: a.animationName, id: a.effect.target.dataset.id, ...a.effect.getComputedTiming() }));
    document.getAnimations().forEach((a) => a.finish());
    await frames();
    return runs;
  };
}

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open({ own = "", motion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.addInitScript(fake);
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    if (p === "") return r.fulfill({ body: PAGE(own), contentType: "text/html" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.B);
  const load = (screen) =>
    page.evaluate(async ([l, s]) => {
      window.answers.push({ keys: [{ k: `/screens/${s.id}`, rev: 1, screen: s }] });
      window.shell ??= window.B.mount({ root: document.getElementById("root"), layout: l, url: (src, p) => `${src}${p}`, store: { get: () => null, put: () => {} } });
      window.emit("hello", { v: 1, sid: "s1", epoch: `e${Math.random()}`, keys: 16 });
      return window.settled();
    }, [layout, screen]);
  return { page, load, close: () => ctx.close() };
}

const settles = (runs) => runs.filter((r) => r.name === "b-settle");

test("a screen's first load settles its first screen of tiles in reading order within 360 ms, once: not on an update, a tab switch back or a resync", async () => {
  const { page, load, close } = await open();
  const first = settles(await load(queue));
  const shown = await page.evaluate(() =>
    [...document.querySelectorAll(".st, .list>.row")].filter((e) => e.getBoundingClientRect().top < innerHeight).map((e) => e.dataset.id ?? e.className),
  );
  strictEqual(first.length, shown.length);
  ok(first.length > 8 && first.length < 30, `${first.length} tiles`);
  deepStrictEqual(
    first.map((r) => r.delay),
    [...first.map((r) => r.delay)].sort((a, b) => a - b),
  );
  ok(Math.max(...first.map((r) => r.delay)) <= parseFloat(defaultStyle["--build"]) + 0.5);
  ok(Math.max(...first.map((r) => r.endTime)) <= 360.5, `${Math.max(...first.map((r) => r.endTime))} ms`);
  ok(first.every((r) => r.duration === parseFloat(defaultStyle["--settle"])));
  strictEqual(await page.evaluate(() => getComputedStyle(document.querySelector(".list>.row")).borderTopLeftRadius), "0px");

  const ops = [{ op: "merge", id: "r0", fields: { title: "patched" } }, { op: "insert", into: "rows", after: "r0", block: { type: "row", id: "late", title: "late" } }];
  const update = await page.evaluate((o) => (window.emit("message", { k: "/screens/queue", from: 1, rev: 2, ops: o }), window.settled()), ops);
  deepStrictEqual(settles(update), []);
  deepStrictEqual(
    update.map((r) => [r.name, r.id, r.duration]),
    [["b-enter", "late", parseFloat(defaultStyle["--enter"])]],
  );

  const other = await page.evaluate((s) => {
    window.answers.push({ keys: [{ k: "/screens/done", rev: 1, screen: s }] });
    document.querySelectorAll(".b-tab")[1].click();
    return window.settled();
  }, done);
  strictEqual(settles(other).length, 2, "the other tab's own first load builds up");
  await page.evaluate(() => document.querySelectorAll(".b-tab")[0].click());
  deepStrictEqual(settles(await page.evaluate(() => window.settled())), []);

  deepStrictEqual(settles(await load(queue)), []);
  await close();
});

test("under reduced motion nothing moves or fades", async () => {
  const { load, close } = await open({ motion: "reduce" });
  deepStrictEqual(await load(queue), []);
  await close();
});

test("an app's style that sets its own corners and turns the build-up off draws its tiles in place, square no more", async () => {
  const { page, load, close } = await open({ own: still });
  const runs = await load(queue);
  ok(runs.every((r) => r.endTime === 0), JSON.stringify(runs.slice(0, 2)));
  strictEqual(await page.evaluate(() => getComputedStyle(document.querySelector(".list>.row")).borderTopLeftRadius), "6px");
  await close();
});

test("the tile style reaches the page as overridable CSS variables", () => {
  ok(tiles.startsWith(":where(:root){"));
  for (const [k, v] of Object.entries(defaultStyle)) ok(tiles.includes(`${k}:${v}`), k);
});

test("blocks-shot draws the kinds page as the tree blocks-snap draws, at 390 and 1440", () => {
  const out = mkdtempSync(join(process.env.DROVER_SCRATCH_TARGET ?? tmpdir(), "kinds-"));
  const file = (p) => fileURLToPath(new URL(p, import.meta.url));
  for (const size of ["390x844", "1440x900"]) {
    const args = ["--screen", file("../../fixtures/look/kinds.json"), "--expect", file("../../fixtures/look/kinds.tree.json"), "--check", "--size", size, "--out", join(out, size)];
    const r = spawnSync(process.execPath, ["--no-warnings", file("../shot/cli.ts"), ...args], { encoding: "utf8" });
    strictEqual(r.status, 0, `${size}: ${r.stderr}`);
  }
});
