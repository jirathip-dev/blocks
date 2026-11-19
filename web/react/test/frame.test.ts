import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = mkdtempSync(join(process.env.DROVER_SCRATCH_TARGET ?? tmpdir(), "react-"));
const blocks = at("../../../fixtures/blocks/");
const trees = at("../../../fixtures/trees/react/");
const shot = (...args) => spawnSync(process.execPath, ["--no-warnings", at("../../shot/cli.ts"), "--adapter", "react", ...args], { encoding: "utf8" });

test("every fixtures/blocks file passes blocks-shot --adapter react --check against fixtures/trees/react at 390 and 1440", () => {
  const kinds = readdirSync(blocks).map((f) => f.replace(/\.json$/, ""));
  deepStrictEqual(readdirSync(trees).map((f) => f.replace(/\.json$/, "")), kinds);
  for (const size of ["390x844", "1440x900"])
    for (const k of kinds) {
      const r = shot("--screen", join(blocks, `${k}.json`), "--size", size, "--expect", join(trees, `${k}.json`), "--check", "--out", join(out, size, k));
      strictEqual(r.status, 0, `${k} ${size}: ${r.stderr}`);
    }
});

test("fixtures/ids/screen.json is the ids the React adapter draws for screen.json", () => {
  const r = shot("--screen", join(blocks, "screen.json"), "--ids", at("../../../fixtures/ids/screen.json"), "--check", "--out", join(out, "ids"));
  strictEqual(r.status, 0, r.stderr);
});

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

const APP = `
const e = React.createElement;
window.got = [];
window.blocksKinds = {
  boom: () => { throw new Error("boom"); },
  ask: ({ block, act }) => e("button", { onClick: () => act({ action: "drop", confirm: { title: "Drop it?", ok: "drop" } }).then((r) => got.push(r)) }, block.label),
  save: ({ act }) => e("button", { onClick: () => act({ action: "save", values: { n: 1 } }).then((r) => got.push(r)) }, "Save"),
};
window.blocksIslands = {
  "x-echo": ({ props, emit }) => e("button", { onClick: () => (emit("pick", { at: 1 }), emit("zoom")) }, JSON.stringify(props)),
  "x-boom": () => { throw new Error("island"); },
};`;

async function page(screen, hold = false) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.setContent("<div id=root></div>");
  await p.addScriptTag({ content: reactJs() });
  await p.addScriptTag({ content: APP });
  await p.evaluate(
    ([s, hold]) => {
      window.sent = [];
      window.dropped = [];
      const sent = (a) => (window.sent.push(a), hold ? new Promise((done) => (window.release = done)) : true);
      window.view = window.R.boot(document.getElementById("root"), s, { sent, dropped: (w) => window.dropped.push(w) });
    },
    [screen, hold],
  );
  return p;
}
const read = (p) => p.evaluate(() => ({ sent: window.sent, dropped: window.dropped, got: window.got }));
const screen = (...blocks) => ({ type: "screen", id: "s", title: "S", blocks });

test("a block whose view throws draws its fallback, is reported, and the rest of the screen stays", async () => {
  const p = await page(screen({ type: "boom", id: "b", fallback: { title: "Boom fell back" } }, { type: "card", id: "c", title: "Still here" }));
  const b = p.locator('[data-id="b"]');
  strictEqual(await b.getAttribute("data-fallback"), "");
  strictEqual(await b.textContent(), "Boom fell back");
  strictEqual(await p.locator('[data-id="c"]').textContent(), "Still here");
  deepStrictEqual((await read(p)).dropped, ["threw b"]);
  await p.close();
});

test("a confirm's cancel sends nothing and resolves false; its ok sends the action and resolves true", async () => {
  const p = await page(screen({ type: "ask", id: "a", label: "Drop" }));
  await p.click('[data-id="a"] button');
  strictEqual(await p.locator(".b-confirm b").textContent(), "Drop it?");
  await p.click(".b-confirm button:has-text('cancel')");
  strictEqual(await p.locator(".b-confirm").count(), 0);
  deepStrictEqual(await read(p), { sent: [], dropped: [], got: [false] });
  await p.click('[data-id="a"] button');
  await p.click(".b-confirm button:has-text('drop')");
  await p.waitForFunction(() => window.got.length === 2);
  deepStrictEqual(await read(p), { sent: [{ screen: "s", action: "drop", block: "a", values: null }], dropped: [], got: [false, true] });
  await p.close();
});

test("a pending action makes its sender busy and takes no second press; it settles when the handler resolves", async () => {
  const p = await page(screen({ type: "save", id: "v" }), true);
  await p.click('[data-id="v"] button');
  strictEqual(await p.locator('[data-id="v"]').getAttribute("aria-busy"), "true");
  await p.click('[data-id="v"] button');
  deepStrictEqual((await read(p)).got, [false]);
  await p.evaluate(() => window.release(true));
  await p.waitForFunction(() => window.got.length === 2);
  strictEqual(await p.locator('[data-id="v"]').getAttribute("aria-busy"), null);
  deepStrictEqual(await read(p), { sent: [{ screen: "s", action: "save", block: "v", values: { n: 1 } }], dropped: [], got: [false, true] });
  await p.close();
});

test("a press is ignored while a check of the sender's fields fails", async () => {
  const field = { type: "text", name: "n", checks: [{ ok: { is: { value: { get: "n" }, pattern: "filled" } }, say: "Fill it" }] };
  const p = await page(screen({ type: "save", id: "v", fields: [field] }));
  await p.click('[data-id="v"] button');
  deepStrictEqual(await read(p), { sent: [], dropped: [], got: [false] });
  await p.close();
});

test("a tap's set changes local state: a block its show hides is drawn when the state turns", async () => {
  const p = await page({ ...screen({ type: "card", id: "go", title: "Show it", tap: { set: [{ key: "on", to: true }] } }, { type: "card", id: "x", title: "Shown", show: { get: "on" } }), state: { on: false } });
  ok(await p.locator('[data-id="x"]').isHidden());
  await p.click('[data-id="go"] .row');
  ok(await p.locator('[data-id="x"]').isVisible());
  deepStrictEqual((await read(p)).sent, []);
  await p.close();
});

test("islands: props arrive, a listed event is sent, an unlisted one dropped, no component and one that throws draw the fallback", async () => {
  const isle = (id, name, extra = {}) => ({ type: "island", id, name, fallback: { title: `${id} fallback` }, ...extra });
  const p = await page(screen(isle("map", "x-echo", { props: { zoom: 3 }, events: ["pick"], size: { aspect: "2/1" } }), isle("none", "x-none"), isle("bad", "x-boom")));
  const map = p.locator('[data-id="map"]');
  strictEqual(await map.getAttribute("data-fallback"), null);
  strictEqual(await map.textContent(), '{"zoom":3}');
  deepStrictEqual(await map.evaluate((e) => [getComputedStyle(e).overflow, e.getBoundingClientRect().width / e.getBoundingClientRect().height]), ["hidden", 2]);
  await p.click('[data-id="map"] button');
  for (const id of ["none", "bad"]) {
    strictEqual(await p.locator(`[data-id="${id}"]`).getAttribute("data-fallback"), "", id);
    strictEqual(await p.locator(`[data-id="${id}"]`).textContent(), `${id} fallback`, id);
  }
  deepStrictEqual(await read(p), { sent: [{ screen: "s", action: "pick", block: "map", values: { at: 1 } }], dropped: ["threw bad", "event map zoom"], got: [] });
  await p.close();
});

test("the next screen keeps an island's own state while its id stays", async () => {
  const p = await page(screen({ type: "island", id: "map", name: "x-echo", fallback: { title: "f" }, props: { zoom: 1 }, events: [] }));
  const el = await p.locator('[data-id="map"] button').elementHandle();
  await p.evaluate(() => window.view.set({ type: "screen", id: "s", title: "S", blocks: [{ type: "island", id: "map", name: "x-echo", fallback: { title: "f" }, props: { zoom: 2 }, events: [] }] }));
  strictEqual(await p.locator('[data-id="map"]').textContent(), '{"zoom":2}');
  ok(await el.evaluate((e) => e.isConnected));
  await p.close();
});
