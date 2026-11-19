import { deepStrictEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { view } from "../src/core/eval.ts";
import { step } from "../src/core/gesture.ts";
import { list } from "../src/core/kind/list.ts";
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

test("a list's reorder sends the same one action by pointer, keys and named action, in WebKit", async () => {
  const { shot } = await import("../shot/shot.ts");
  for (const w of ways) {
    const { report, faults } = await shot({ screen, css, check: true, steps: [{ gesture: { id: "accounts", grab: "b", ...w } }, { shot: { name: w.via } }] });
    deepStrictEqual(report.sent, want, w.via);
    deepStrictEqual(faults, [], w.via);
  }
});

test("a sent row stays where it was dropped until refused, then goes back; answered, the data's order stays", async () => {
  const { shot } = await import("../shot/shot.ts");
  const drop = { gesture: { id: "accounts", grab: "b", via: "keys", reach: [{ dir: "down" }] } };
  const refused = await shot({ screen, css, steps: [drop, { shot: { name: "dropped" } }, { refuse: { toast: "No" } }, { shot: { name: "back" } }] });
  ok(ys(refused.trees.dropped).b > ys(refused.trees.dropped).c, "dropped below c");
  ok(ys(refused.trees.back).b < ys(refused.trees.back).c, "back above c");
  const answer = { answer: { ops: [{ op: "move", id: "b", into: "accounts", before: "d" }] } };
  const kept = await shot({ screen, css, steps: [drop, answer, { shot: { name: "kept" } }] });
  ok(ys(kept.trees.kept).b > ys(kept.trees.kept).c, "kept below c");
  deepStrictEqual(kept.report.sent, want);
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
