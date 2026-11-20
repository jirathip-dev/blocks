import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { shot } from "../../shot/shot.ts";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/gesture/timeline.json", import.meta.url), "utf8"));
const css = [new URL("../../../fixtures/gesture/still.css", import.meta.url).pathname];
const plan = fixture.block;
const plans = { type: "screen", id: "s", title: "Plan", blocks: [plan] };
const sends = (span) => [{ screen: "s", action: "schedule", block: "plan", values: { bar: span } }];
const size = "1440x900";

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function both(gestures, name) {
  const got = {};
  for (const adapter of ["html", "react"]) {
    const steps = gestures.map((g) => ({ gesture: { id: "plan", ...g } }));
    const { report, faults } = await shot({ screen: plans, css, size, adapter, check: adapter === "react", browser, steps });
    deepStrictEqual(faults, [], `${adapter} ${name}`);
    got[adapter] = JSON.stringify(report.sent);
  }
  strictEqual(got.react, got.html, name);
  return JSON.parse(got.react);
}

test("a React timeline's move, stretch and draw send the web view's one action by pointer, keys and named action", async () => {
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
  for (const [grab, via, reach, span] of cases) deepStrictEqual(await both([{ grab, via, reach }], `${JSON.stringify(grab)} ${via}`), sends(span));
});

test("each fixtures/gesture/timeline.json nudge case sends from React by keys what the web view sends", async () => {
  const nudged = fixture.cases.filter((c) => c.nudges);
  ok(nudged.length >= 10);
  for (const c of nudged) {
    const sent = await both([{ grab: c.grab, via: "keys", reach: c.nudges }], `${JSON.stringify(c.grab)} ${JSON.stringify(c.nudges)}`);
    if (c.want) deepStrictEqual(sent, sends(c.want), JSON.stringify(c));
  }
});

test("each fixtures/gesture/timeline.json named step sends from React what the web view sends", async () => {
  const named = fixture.steps.flatMap((s) => s.want.map((n) => [s.grab, n]));
  ok(named.length >= 8);
  for (const [grab, n] of named) strictEqual((await both([{ grab, via: "action", reach: [n] }], `${JSON.stringify(grab)} ${n}`)).length, 1, n);
});

test("a React drop onto a fixed bar or past the range sends nothing", async () => {
  const gestures = [
    { grab: { bar: "b7", part: "body" }, via: "keys", reach: [{ dir: "right", big: true }] },
    { grab: { bar: "b7", part: "body" }, via: "pointer", reach: [[4000, 0]] },
  ];
  deepStrictEqual(await both(gestures, "nothing"), []);
});

test("a React bar sent stays where it was dropped until refused, then goes back; answered, it is drawn from the data", async () => {
  const drop = { gesture: { id: "plan", grab: { bar: "b7", part: "body" }, via: "pointer", reach: [[20, 0], [40, 0]] } };
  const run = (screen, steps) => shot({ screen, css, size, adapter: "react", browser, steps });
  const refused = await run(plans, [{ shot: { name: "before" } }, drop, { shot: { name: "dropped" } }, { refuse: { toast: "4 Dec has timesheet hours" } }, { shot: { name: "back" } }]);
  ok(!refused.pngs.before.equals(refused.pngs.dropped), "dropped somewhere else");
  ok(refused.pngs.before.equals(refused.pngs.back), "back where it was");
  const moved = structuredClone(plan.tracks);
  Object.assign(moved[0].bars[0], { start: "2026-12-04", end: "2026-12-06" });
  const answer = { answer: { ops: [{ op: "merge", id: "plan", fields: { tracks: moved } }] } };
  const kept = await run(plans, [drop, { shot: { name: "dropped" } }, answer, { shot: { name: "kept" } }]);
  const there = await run({ ...plans, blocks: [{ ...plan, tracks: moved }] }, [{ shot: { name: "there" } }]);
  deepStrictEqual(kept.report.sent, sends({ id: "b7", start: "2026-12-04", end: "2026-12-06" }));
  ok(!kept.pngs.dropped.equals(kept.pngs.kept), "no longer dimmed once answered");
  ok(kept.pngs.kept.equals(there.pngs.there), "drawn from the data");
});
