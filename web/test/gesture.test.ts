import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { view } from "../src/core/eval.ts";
import { step } from "../src/core/gesture.ts";
import { list } from "../src/core/kind/list.ts";
import { media, named } from "../src/core/kind/media.ts";
import { timeline } from "../src/core/kind/timeline.ts";

const read = (f) => JSON.parse(readFileSync(new URL(`../../fixtures/gesture/${f}`, import.meta.url), "utf8"));
const run = (c) => {
  let p = { at: "idle" };
  return c.events.map((e) => {
    const [next, effect] = step(p, e, c.start);
    p = next;
    return [next, effect];
  });
};

test("step gives every fixtures/gesture machine and sim case the crate's phases and effects", () => {
  for (const f of ["machine.json", "sim.json"]) {
    const { cases } = read(f);
    ok(cases.length >= 10, f);
    cases.forEach((c, i) => deepStrictEqual(run(c), c.want, `${f} ${c.name ?? c.seed ?? i}`));
  }
});

test("list rules give fixtures/gesture/list.json the crate's orders, words and steps", () => {
  const { block, cases, steps } = read("list.json");
  for (const c of cases) {
    const got = c.reach !== undefined ? list.candidate(block, c.grab, c.reach) : c.nudges.reduce((from, n) => from && list.nudge(block, c.grab, from, n), list.start(block, c.grab));
    deepStrictEqual(got, c.want, `${c.grab} ${JSON.stringify(c.reach ?? c.nudges)}`);
    deepStrictEqual(got && list.says(block, c.grab, got), c.says ?? null, c.grab);
  }
  for (const [g, want] of Object.entries(steps)) deepStrictEqual(list.steps(block, g).map(([n]) => n), want, g);
});

test("media rules give fixtures/gesture/media.json the crate's changes, words, steps and names", () => {
  const { block, cases, steps, names } = read("media.json");
  ok(cases.length >= 20);
  for (const c of cases) {
    const got = c.reach !== undefined ? media.candidate(block, c.grab, c.reach) : c.nudges.reduce((from, n) => from && media.nudge(block, c.grab, from, n), media.start(block, c.grab));
    deepStrictEqual(got, c.want, `${JSON.stringify(c.grab)} ${JSON.stringify(c.reach ?? c.nudges)}`);
    deepStrictEqual(got && media.says(block, c.grab, got), c.says ?? null, JSON.stringify(c.grab));
  }
  for (const s of steps) deepStrictEqual(media.steps(block, s.grab).map(([n]) => n), s.want, JSON.stringify(s.grab));
  for (const [id, want] of Object.entries(names)) deepStrictEqual(named(block, id), want, id);
});

test("timeline rules give fixtures/gesture/timeline.json the crate's spans, words and steps", () => {
  const { block, cases, steps } = read("timeline.json");
  ok(cases.length >= 30);
  for (const c of cases) {
    const got = c.reach ? timeline.candidate(block, c.grab, c.reach) : c.nudges.reduce((from, n) => from && timeline.nudge(block, c.grab, from, n), timeline.start(block, c.grab));
    deepStrictEqual(got, c.want, `${JSON.stringify(c.grab)} ${JSON.stringify(c.reach ?? c.nudges)}`);
    deepStrictEqual(got && timeline.says(block, c.grab, got), c.says ?? null, JSON.stringify(c.grab));
  }
  for (const s of steps) deepStrictEqual(timeline.steps(block, s.grab).map(([n]) => n), s.want, JSON.stringify(s.grab));
});

test("a gesture whose enabled does not hold joins the view's acts", () => {
  const screen = { type: "screen", id: "s", blocks: [{ type: "list", id: "l", rows: [], reorder: { action: "order", name: "ids", enabled: { get: "edit" } } }] };
  ok(view(screen, { edit: false }).acts.has("order"));
  ok(!view(screen, { edit: true }).acts.has("order"));
});

const screen = { type: "screen", id: "s", title: "Accounts", blocks: [read("list.json").block] };
const want = [{ screen: "s", action: "order", block: "accounts", values: { accounts: ["a", "c", "b", "d"] } }];
const ways = [
  { via: "pointer", reach: [[0, 20], [0, 50]] },
  { via: "keys", reach: [{ dir: "down" }] },
  { via: "action", reach: ["Move down"] },
];
const css = [new URL("../../fixtures/gesture/still.css", import.meta.url).pathname];
const ys = (tree) => Object.fromEntries(tree.children[0].children.map((n) => [n.id, n.rect[1]]));

test("a list's reorder sends the same one action by pointer, keys and named action, in WebKit, in the web and React views", async () => {
  const { shot } = await import("../shot/shot.ts");
  for (const adapter of ["html", "react"])
    for (const w of ways) {
      const { report, faults } = await shot({ screen, css, adapter, check: true, steps: [{ gesture: { id: "accounts", grab: "b", ...w } }, { shot: { name: w.via } }] });
      deepStrictEqual(report.sent, want, `${adapter} ${w.via}`);
      deepStrictEqual(faults, [], `${adapter} ${w.via}`);
    }
});

test("a sent row stays where it was dropped until refused, then goes back; answered, the data's order stays, in the web and React views", async () => {
  const { shot } = await import("../shot/shot.ts");
  const drop = { gesture: { id: "accounts", grab: "b", via: "keys", reach: [{ dir: "down" }] } };
  const answer = { answer: { ops: [{ op: "move", id: "b", into: "accounts", before: "d" }] } };
  for (const adapter of ["html", "react"]) {
    const refused = await shot({ screen, css, adapter, steps: [drop, { shot: { name: "dropped" } }, { refuse: { toast: "No" } }, { shot: { name: "back" } }] });
    ok(ys(refused.trees.dropped).b > ys(refused.trees.dropped).c, `${adapter} dropped below c`);
    ok(ys(refused.trees.back).b < ys(refused.trees.back).c, `${adapter} back above c`);
    const kept = await shot({ screen, css, adapter, steps: [drop, answer, { shot: { name: "kept" } }] });
    ok(ys(kept.trees.kept).b > ys(kept.trees.kept).c, `${adapter} kept below c`);
    deepStrictEqual(kept.report.sent, want, adapter);
  }
});

test("the one zoom: Ctrl and wheel, + and 0, and a double tap, clamped and kept outside the view", async () => {
  const { buildSync } = await import("esbuild");
  const { webkit } = await import("playwright");
  const code = buildSync({ entryPoints: [new URL("../src/gesture.ts", import.meta.url).pathname], bundle: true, format: "iife", globalName: "G", write: false }).outputFiles[0].text;
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<div id=z tabindex=0 style='width:200px;height:200px'></div>");
    await page.addScriptTag({ content: code });
    const got = await page.evaluate(() => {
      const el = document.getElementById("z");
      const keep = {};
      const drawn = [];
      window.G.zoomed(el, keep, { min: 1, max: 4, apply: (z) => drawn.push(Math.round(z * 100) / 100) });
      el.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -100, cancelable: true }));
      el.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, deltaY: -1000, cancelable: true }));
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
      el.dispatchEvent(new MouseEvent("dblclick"));
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }));
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }));
      return { drawn, keep };
    });
    deepStrictEqual(got, { drawn: [1, 2.72, 4, 1, 1.25, 1], keep: { zoom: 1 } });
  } finally {
    await browser.close();
  }
});

const photo = { ...read("media.json").block, width: 300, height: 200 };
const traced = { ...photo, tools: ["pin"] };
const sent = (block, values) => [{ screen: "s", action: "marks", block: "photo", values }];

test("a mark's move sends the same one action by pointer, keys and named action, in WebKit", async () => {
  const { shot } = await import("../shot/shot.ts");
  const screen = { type: "screen", id: "s", title: "Photo", blocks: [photo] };
  const tenth = sent(photo, { move: { id: "m1", at: [0.3, 0.7], to: [0.4, 0.5] } });
  const one = sent(photo, { move: { id: "m1", at: [0.21, 0.7], to: [0.31, 0.5] } });
  const ways = [
    [{ via: "pointer", reach: [[30, 0]] }, tenth],
    [{ via: "keys", reach: [{ dir: "right", big: true }] }, tenth],
    [{ via: "keys", reach: [{ dir: "right" }] }, one],
    [{ via: "action", reach: ["Move right"] }, one],
  ];
  for (const [w, want] of ways) {
    const { report, faults } = await shot({ screen, css, check: true, steps: [{ gesture: { id: "photo", grab: { body: "m1" }, ...w } }, { shot: { name: w.via } }] });
    deepStrictEqual(report.sent, want, JSON.stringify(w));
    deepStrictEqual(faults, [], w.via);
  }
});

test("a pin is drawn by a drag, a tap, the keys and a named action, in WebKit", async () => {
  const { shot } = await import("../shot/shot.ts");
  const screen = { type: "screen", id: "s", title: "Trace", blocks: [traced] };
  const pin = (at) => sent(traced, { draw: { kind: "pin", at, group: "range" } });
  const surface = { draw: { tool: "pin", group: "range" } };
  const tool = { draw: { tool: "pin", group: "range", at: [0.5, 0.5] } };
  const ways = [
    [{ grab: surface, via: "pointer", reach: [[30, 20]] }, pin([0.6, 0.6])],
    [{ grab: surface, via: "pointer", reach: [] }, pin([0.5, 0.5])],
    [{ grab: tool, via: "keys", reach: [{ dir: "right" }] }, pin([0.5, 0.5])],
    [{ grab: tool, via: "action", reach: ["Add pin"] }, pin([0.5, 0.5])],
  ];
  for (const [w, want] of ways) {
    const { report, faults } = await shot({ screen, css, check: true, steps: [{ gesture: { id: "photo", ...w } }, { shot: { name: w.via } }] });
    deepStrictEqual(report.sent, want, JSON.stringify(w));
    deepStrictEqual(faults, [], w.via);
  }
});

test("a picked mark is deleted by [delete], the Delete key and a named action; the text tool sends its words where tapped", async () => {
  const { webkit } = await import("playwright");
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const dist = (f) => readFileSync(new URL(`../dist/${f}`, import.meta.url), "utf8");
  await page.route("**/*", (r) =>
    r.request().url().endsWith(".js") ? r.fulfill({ body: dist("blocks.js"), contentType: "text/javascript" }) : r.fulfill({ body: `<!doctype html><style>${dist("blocks.css")}</style><body><main></main>`, contentType: "text/html" }),
  );
  await page.goto("http://blocks.test/");
  const boot = (b) =>
    page.evaluate(async (b) => {
      const B = await import("/blocks.js");
      window.sent = [];
      const ctx = { screen: "s", act: async (a) => (window.sent.push(a.values), true), tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} }, held: new Map(), view: new Map() };
      document.querySelector("main").replaceChildren(B.render(b, ctx));
    }, b);
  const sentNow = () => page.evaluate(() => window.sent);
  try {
    await boot(photo);
    await page.click('[data-key="m4"]');
    await page.click('[data-key="rm"]');
    await page.focus('[data-key="m2"]');
    await page.keyboard.press("Delete");
    await page.click('[data-key="m1"]');
    await page.locator('[data-key="rm"]').locator("xpath=..").locator("button.b-sr", { hasText: "Delete" }).dispatchEvent("click");
    deepStrictEqual(await sentNow(), [{ remove: { id: "m4" } }, { remove: { id: "m2" } }, { remove: { id: "m1" } }]);
    ok(await page.isDisabled('[data-key="rm"]').then(() => true));
    await boot(photo);
    await page.click('[data-key="tool:text"]');
    const box = await page.locator(".mks").boundingBox();
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await page.fill(".mkin input", "crack");
    await page.keyboard.press("Enter");
    deepStrictEqual(await sentNow(), [{ draw: { kind: "text", at: [0.2, 0.3], text: "crack", group: "range" } }]);
    await boot({ ...photo, draw: null, move: null, stretch: null, remove: null });
    strictEqual(await page.locator(".mk, .mkbar").count(), 0);
    ok((await page.getAttribute("img", "alt")).includes("7 marks: Arrow 1, lower left; Text “flange corrosion”, lower left"));
  } finally {
    await browser.close();
  }
});

const plan = read("timeline.json").block;
const plans = { type: "screen", id: "s", title: "Plan", blocks: [plan] };
const sends = (span) => [{ screen: "s", action: "schedule", block: "plan", values: { bar: span } }];
const big = "1440x900";

test("a timeline's move, stretch and draw each send one action by pointer, keys and named action, in WebKit", async () => {
  const { shot } = await import("../shot/shot.ts");
  const later = { id: "b7", start: "2026-12-04", end: "2026-12-06" };
  const longer = { id: "b7", start: "2026-12-03", end: "2026-12-06" };
  const first = { row: "j3", start: "2026-12-01", end: "2026-12-01" };
  const cases = [
    [{ bar: "b7", part: "body" }, "pointer", [[20, 0], [40, 0]], later],
    [{ bar: "b7", part: "body" }, "keys", [{ dir: "right" }], later],
    [{ bar: "b7", part: "body" }, "action", ["One day later"], later],
    [{ bar: "b7", part: "end" }, "pointer", [[40, 0]], longer],
    [{ bar: "b7", part: "end" }, "keys", [{ dir: "right" }], longer],
    [{ bar: "b7", part: "end" }, "action", ["End one day later"], longer],
    [{ row: "j3" }, "pointer", [[80, 0]], { row: "j3", start: "2026-12-16", end: "2026-12-18" }],
    [{ row: "j3" }, "keys", [{ dir: "right" }], first],
    [{ row: "j3" }, "action", ["Add a bar"], first],
  ];
  for (const [grab, via, reach, span] of cases) {
    const { report, faults } = await shot({ screen: plans, css, size: big, check: true, steps: [{ gesture: { id: "plan", grab, via, reach } }, { shot: { name: via } }] });
    deepStrictEqual(report.sent, sends(span), `${JSON.stringify(grab)} ${via}`);
    deepStrictEqual(faults, [], `${JSON.stringify(grab)} ${via}`);
  }
});

test("a drop onto a fixed bar or past the range sends nothing", async () => {
  const { shot } = await import("../shot/shot.ts");
  const steps = [
    { gesture: { id: "plan", grab: { bar: "b7", part: "body" }, via: "keys", reach: [{ dir: "right", big: true }] } },
    { gesture: { id: "plan", grab: { bar: "b7", part: "body" }, via: "pointer", reach: [[4000, 0]] } },
  ];
  const { report } = await shot({ screen: plans, css, size: big, steps });
  deepStrictEqual(report.sent, []);
});

test("a sent bar stays where it was dropped until refused, then goes back; answered, it is drawn from the data", async () => {
  const { shot } = await import("../shot/shot.ts");
  const drop = { gesture: { id: "plan", grab: { bar: "b7", part: "body" }, via: "pointer", reach: [[20, 0], [40, 0]] } };
  const refused = await shot({ screen: plans, css, size: big, steps: [{ shot: { name: "before" } }, drop, { shot: { name: "dropped" } }, { refuse: { toast: "4 Dec has timesheet hours" } }, { shot: { name: "back" } }] });
  ok(!refused.pngs.before.equals(refused.pngs.dropped), "dropped somewhere else");
  ok(refused.pngs.before.equals(refused.pngs.back), "back where it was");
  const moved = structuredClone(plan.tracks);
  Object.assign(moved[0].bars[0], { start: "2026-12-04", end: "2026-12-06" });
  const answer = { answer: { ops: [{ op: "merge", id: "plan", fields: { tracks: moved } }] } };
  const kept = await shot({ screen: plans, css, size: big, steps: [drop, { shot: { name: "dropped" } }, answer, { shot: { name: "kept" } }] });
  const there = await shot({ screen: { ...plans, blocks: [{ ...plan, tracks: moved }] }, css, size: big, steps: [{ shot: { name: "there" } }] });
  deepStrictEqual(kept.report.sent, sends({ id: "b7", start: "2026-12-04", end: "2026-12-06" }));
  ok(!kept.pngs.dropped.equals(kept.pngs.kept), "no longer dimmed once answered");
  ok(kept.pngs.kept.equals(there.pngs.there), "drawn from the data");
});
