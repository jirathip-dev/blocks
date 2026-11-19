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
