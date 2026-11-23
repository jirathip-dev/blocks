import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { apply } from "../../src/core/apply.ts";
import { drawn } from "../../src/core/kind/plot.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const at = new URL("../../../fixtures/plot/", import.meta.url);
const cases = (prefix) => readdirSync(at).filter((f) => f.startsWith(prefix)).sort().map((f) => [f, JSON.parse(readFileSync(new URL(f, at), "utf8"))]);
const stream = JSON.parse(readFileSync(new URL("stream.json", at), "utf8"));
const screen = (blocks) => ({ type: "screen", id: "s", blocks });

test("apply runs every fixtures/plot op case: the crate's series, or undefined when it does not fit", () => {
  const all = cases("op-");
  ok(all.length >= 7);
  for (const [name, c] of all) {
    const got = apply(screen([c.plot]), [c.op]);
    deepStrictEqual(got, c.want === null ? undefined : screen([{ ...c.plot, series: c.want }]), name);
  }
});

test("drawn gives every fixtures/plot case the crate's ranges, ticks, lines and readouts", () => {
  const all = cases("drawn-");
  ok(all.length >= 7);
  for (const [name, c] of all) deepStrictEqual(drawn(c.plot), c.drawn, name);
});

test("the stream applies frame by frame to the crate's end screen", () => {
  let s = stream.start;
  for (const f of stream.frames) s = apply(s, f.ops);
  deepStrictEqual(s, stream.end);
});

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

test("the static writer and render write the same marks for each plot fixture", async () => {
  for (const k of ["plot", "plot-target"]) {
    const [written, now] = await page.evaluate(
      ([html, b]) => {
        const sig = (e) =>
          [e, ...e.querySelectorAll("*")].map((x) => ({
            tag: x.tagName.toLowerCase(),
            cls: x.getAttribute("class"),
            at: ["style", "d", "x", "y", "width", "height", "x1", "x2", "y1", "y2", "viewBox", "role", "aria-label", "aria-hidden"].map((a) => x.getAttribute(a)),
            text: x.children.length ? "" : x.textContent,
          }));
        const t = { content: new DOMParser().parseFromString(html, "text/html") };
        const ctx = { screen: "s", act: async () => true, tap: () => {}, open: new Set(), theme: window.B.plain, store: { get: () => null, put: () => {} } };
        return [sig(t.content.querySelector("[data-block]")), sig(window.B.render(b, ctx))];
      },
      [read(`../../../fixtures/html/${k}.html`), JSON.parse(read(`../../../fixtures/blocks/${k}.json`))],
    );
    ok(written.some((m) => m.tag === "path" && m.at[1]?.startsWith("M")), k);
    deepStrictEqual(written, now, k);
  }
});

test("the patcher draws the stream once per pass into the same elements, and ends equal to a fresh draw of the end screen", async () => {
  const got = await page.evaluate(
    ([start, frames]) => {
      const B = window.B;
      const root = document.getElementById("root");
      const ctx = { screen: "s", act: async () => true, tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} }, held: new Map() };
      let model = start;
      const draw = (b) => B.render(b, ctx);
      const p = B.patcher({ root, draw, grow: B.grow, sync: { plot: B.plotSync }, model: () => model });
      root.replaceChildren(draw(start));
      const step = (f) => ((model = B.apply(model, f.ops)), p.queue(f.ops), p.flush());
      step(frames[0]);
      const el = root.querySelector('[data-id="pull"]');
      const line = el.querySelector("path.s");
      frames.slice(1).forEach(step);
      const now = root.querySelector('[data-id="pull"]');
      const fresh = draw(model).querySelector('[data-id="pull"]');
      return { kept: now === el && now.querySelector("path.s") === line, same: now.isEqualNode(fresh), d: line.getAttribute("d").length };
    },
    [stream.start, stream.frames],
  );
  deepStrictEqual(got.kept, true);
  ok(got.d > 1000, `${got.d}`);
  strictEqual(got.same, true);
});

