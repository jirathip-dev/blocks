import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { apply } from "../../src/core/apply.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const at = new URL("../../../fixtures/append/", import.meta.url);
const cases = readdirSync(at).filter((f) => !f.startsWith("thread.")).map((f) => [f, JSON.parse(readFileSync(new URL(f, at), "utf8"))]);
const thread = (blocks) => ({ type: "screen", id: "s", blocks: [{ type: "message", id: "t7", role: "agent", name: "Scout", blocks }] });

test("apply grows a prose block by every fixtures/append case, or is undefined when it does not fit", () => {
  ok(cases.length >= 8);
  for (const [name, c] of cases) {
    const got = apply(thread([{ type: "prose", id: "p", parts: c.parts }]), [c.op]);
    deepStrictEqual(got, c.want === null ? undefined : thread([{ type: "prose", id: "p", parts: c.want }]), name);
  }
  strictEqual(apply(thread([]), [{ op: "append", id: "t7", text: "x" }]), undefined);
});

function boot(screen) {
  const B = window.B;
  const root = document.getElementById("root");
  const ctx = { screen: "s", act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} }, held: new Map() };
  window.model = screen;
  window.draw = (b) => B.render(b, ctx);
  const p = B.patcher({ root, draw: window.draw, grow: B.grow, model: () => window.model });
  window.ops = (ops) => ((window.model = B.apply(window.model, ops)), p.queue(ops), p.flush());
  root.replaceChildren(window.draw(screen));
}

let browser, page;
before(async () => {
  browser = await webkit.launch();
  page = await browser.newPage();
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    if (p === "") return r.fulfill({ body: '<!doctype html><meta charset=utf-8><body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>', contentType: "text/html" });
    if (p === "blocks.js") return r.fulfill({ body: read("../../dist/blocks.js"), contentType: "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.B);
});
after(() => browser.close());

const grown = (screen, batches) =>
  page.evaluate(
    ([screen, batches]) => {
      window.B && boot(screen);
      const el = () => document.querySelector('[data-id="p"]');
      const first = el()?.firstChild;
      for (const ops of batches) window.ops(ops);
      const fresh = window.draw(window.model).querySelector('[data-id="p"]');
      return { same: el().isEqualNode(fresh), kept: el().firstChild === first, html: el().outerHTML, busy: el().getAttribute("aria-busy") };
    },
    [screen, batches],
  );

test("the patcher grows a drawn prose in place: the result is a fresh draw, and the parts before it are the same nodes", async () => {
  await page.evaluate(`window.boot = ${boot}`);
  const para = (text) => ({ part: "para", spans: [{ text }] });
  const start = thread([{ type: "prose", id: "p", parts: [para("one"), para("tw")], streaming: true }]);
  const r = await grown(start, [
    [{ op: "append", id: "p", text: "o" }],
    [{ op: "append", id: "p", keep: 2, parts: [{ part: "code", text: "fn a() {" }] }],
    [{ op: "append", id: "p", text: "\n}" }],
  ]);
  ok(r.same, r.html);
  ok(r.kept, "the first part was drawn again");
  strictEqual(r.busy, "true");
  ok(r.html.includes("<p>two</p>") && r.html.includes("fn a() {\n}"), r.html);
});

test("an append after a merge or an insert in one batch is drawn once, not twice", async () => {
  const para = (text) => ({ part: "para", spans: [{ text }] });
  const start = thread([{ type: "prose", id: "p", parts: [para("one")], streaming: true }]);
  const merged = await grown(start, [[{ op: "merge", id: "p", fields: { streaming: null } }, { op: "append", id: "p", text: " two" }]]);
  ok(merged.same && merged.html.includes("<p>one two</p>"), merged.html);
  strictEqual(merged.busy, null);
  const inserted = await grown(thread([]), [[{ op: "insert", into: "t7", block: { type: "prose", id: "p", parts: [para("a")] } }, { op: "append", id: "p", text: "b" }]]);
  ok(inserted.html.includes("><p>ab</p></div>"), inserted.html);
  const odd = await grown(start, [[{ op: "append", id: "p", parts: [{ part: "rule" }] }]]);
  ok(odd.same, odd.html);
});
