import { deepStrictEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { view } from "../src/core/eval.ts";
import { step } from "../src/core/gesture.ts";
import { list } from "../src/core/kind/list.ts";

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
