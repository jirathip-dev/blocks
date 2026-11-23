import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { shot } from "../../shot/shot.ts";

const screen = (blocks) => ({ type: "screen", id: "s", blocks });
const live = (x, y) => screen([{ type: "plot", id: "pull", title: "Pull", x: { label: "Time", scale: "time" }, y: { label: "Force", unit: "kg", min: 0, max: 60 }, target: { min: 20, max: 30 }, series: [{ name: "Force", x, y }] }]);
const kg = (i) => Math.round((30 + 12 * Math.sin(i / 40)) * 100) / 100;

test("80 points a second for 60 s keep every frame in 16.7 ms and the 99th percentile patch in 4 ms, and end on a fresh draw of the 4,800 points", async () => {
  let n = 0;
  const steps = Array.from({ length: 3600 }, (_, i) => {
    const k = i % 3 === 2 ? 2 : 1;
    const x = Array.from({ length: k }, (_, j) => (n + j) / 80);
    const y = Array.from({ length: k }, (_, j) => kg(n + j));
    n += k;
    return { frame: { k: "live", from: i, rev: i + 1, ops: [{ op: "points", id: "pull", series: "Force", x, y }] } };
  });
  strictEqual(n, 4800);
  const all = Array.from({ length: n }, (_, i) => i);
  const { report, trees } = await shot({ screen: live([], []), steps: [...steps, { shot: { name: "end" } }] });
  const { steps_ms: _, ...t } = report.timings;
  process.stdout.write(`plot frame budget: ${JSON.stringify(t)}\n`);
  strictEqual(t.frames_over_budget, 0);
  ok(t.longest_frame_ms <= 16.7, `longest frame ${t.longest_frame_ms} ms`);
  ok(t.p99_patch_ms <= 4, `p99 patch ${t.p99_patch_ms} ms, longest ${t.longest_patch_ms} ms`);
  deepStrictEqual(trees.end, (await shot({ screen: live(all.map((i) => i / 80), all.map(kg)) })).trees.shot);
});
