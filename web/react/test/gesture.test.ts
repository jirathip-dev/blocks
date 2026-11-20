import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { reactJs, shot } from "../../shot/shot.ts";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/gesture/timeline.json", import.meta.url), "utf8"));
const css = [new URL("../../../fixtures/gesture/still.css", import.meta.url).pathname];
const plan = fixture.block;
const plans = { type: "screen", id: "s", title: "Plan", blocks: [plan] };
const sends = (span) => [{ screen: "s", action: "schedule", block: "plan", values: { bar: span } }];
const size = "1440x900";

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function both(gestures, name, screen = plans) {
  const got = {};
  for (const adapter of ["html", "react"]) {
    const steps = gestures.map((g) => ({ gesture: { id: screen.blocks[0].id, ...g } }));
    const { report, faults } = await shot({ screen, css, size, adapter, check: adapter === "react", browser, steps });
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

const read = (f) => JSON.parse(readFileSync(new URL(`../../../fixtures/gesture/${f}`, import.meta.url), "utf8"));
const marks = read("media.json");
const photo = { ...marks.block, width: 300, height: 200 };
const photos = { type: "screen", id: "s", title: "Photo", blocks: [photo] };
const traced = { ...photos, blocks: [{ ...photo, tools: ["pin"] }] };
const marked = (values) => [{ screen: "s", action: "marks", block: "photo", values }];

test("a React mark's move and a pin's draw send the web view's one action by pointer, keys and named action", async () => {
  const tenth = { move: { id: "m1", at: [0.3, 0.7], to: [0.4, 0.5] } };
  const one = { move: { id: "m1", at: [0.21, 0.7], to: [0.31, 0.5] } };
  const moves = [
    [{ via: "pointer", reach: [[30, 0]] }, tenth],
    [{ via: "keys", reach: [{ dir: "right", big: true }] }, tenth],
    [{ via: "keys", reach: [{ dir: "right" }] }, one],
    [{ via: "action", reach: ["Move right"] }, one],
  ];
  for (const [w, want] of moves) deepStrictEqual(await both([{ grab: { body: "m1" }, ...w }], `move ${w.via}`, photos), marked(want));
  const pin = (at) => marked({ draw: { kind: "pin", at, group: "range" } });
  const surface = { draw: { tool: "pin", group: "range" } };
  const tool = { draw: { tool: "pin", group: "range", at: [0.5, 0.5] } };
  const draws = [
    [{ grab: surface, via: "pointer", reach: [[30, 20]] }, pin([0.6, 0.6])],
    [{ grab: surface, via: "pointer", reach: [] }, pin([0.5, 0.5])],
    [{ grab: tool, via: "keys", reach: [{ dir: "right" }] }, pin([0.5, 0.5])],
    [{ grab: tool, via: "action", reach: ["Add pin"] }, pin([0.5, 0.5])],
  ];
  for (const [w, want] of draws) deepStrictEqual(await both([w], `pin ${w.via}`, traced), want);
});

test("each fixtures/gesture/media.json move case sends from React by keys and named action what the web view sends", async () => {
  const nudged = marks.cases.filter((c) => c.nudges && c.grab.body);
  ok(nudged.length >= 3);
  for (const c of nudged) {
    const sent = await both([{ grab: c.grab, via: "keys", reach: c.nudges }], JSON.stringify(c), photos);
    deepStrictEqual(sent, c.want ? marked({ move: c.want }) : [], JSON.stringify(c));
  }
  const named = marks.steps.filter((s) => s.grab.body).flatMap((s) => s.want.map((n) => [s.grab, n]));
  ok(named.length >= 7);
  for (const [grab, n] of named) strictEqual((await both([{ grab, via: "action", reach: [n] }], `${JSON.stringify(grab)} ${n}`, photos)).length, 1, n);
});

async function page(adapter) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const dist = (f) => readFileSync(new URL(`../../dist/${f}`, import.meta.url), "utf8");
  await p.route("**/*", (r) =>
    r.request().url().endsWith(".js") ? r.fulfill({ body: dist("blocks.js"), contentType: "text/javascript" }) : r.fulfill({ body: `<!doctype html><style>${dist("blocks.css")}</style><body><main></main>`, contentType: "text/html" }),
  );
  await p.goto("http://blocks.test/");
  if (adapter === "react") await p.addScriptTag({ content: reactJs() });
  const boot = (s) =>
    p.evaluate(
      async ([s, adapter]) => {
        window.sent = [];
        const root = document.querySelector("main");
        if (adapter === "react") return void window.R.boot(root, s, { sent: (a) => (window.sent.push(a.values), true), dropped: () => {} });
        const B = await import("/blocks.js");
        const ctx = { screen: "s", act: async (a) => (window.sent.push(a.values), true), tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} }, held: new Map(), view: new Map() };
        root.replaceChildren(B.render(s, ctx));
      },
      [s, adapter],
    );
  return { p, boot, sent: () => p.evaluate(() => window.sent) };
}

test("a picked React mark is stretched by its grip and deleted by [delete], the Delete key and named actions; the text tool sends its words, as the web view does", async () => {
  const got = {};
  for (const adapter of ["html", "react"]) {
    const { p, boot, sent } = await page(adapter);
    const beside = (key, name) => p.locator(`[data-key="${key}"]`).locator(`xpath=following-sibling::button[contains(@class,"b-sr")][.="${name}"][1]`).dispatchEvent("click");
    await boot(photos);
    await p.click('[data-key="m1"]');
    await p.focus('[data-key="m1:end"]');
    for (const k of ["Space", "ArrowRight", "Enter"]) await p.keyboard.press(k);
    await beside("m1:end", "Longer");
    const grip = await p.locator('[data-key="m1:start"]').boundingBox();
    await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await p.mouse.down();
    await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + 30, { steps: 4 });
    await p.mouse.up();
    const stretched = await sent();
    await boot(photos);
    await p.click('[data-key="m4"]');
    await p.click('[data-key="rm"]');
    await p.focus('[data-key="m2"]');
    await p.keyboard.press("Delete");
    await p.click('[data-key="m1"]');
    await beside("rm", "Delete");
    const deleted = await sent();
    await boot(photos);
    await p.click('[data-key="tool:text"]');
    const box = await p.locator(".mks").boundingBox();
    await p.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await p.fill(".mkin input", "crack");
    await p.keyboard.press("Enter");
    got[adapter] = { stretched, deleted, typed: await sent() };
    await p.close();
  }
  deepStrictEqual(got.react, got.html);
  deepStrictEqual(got.react.stretched, [{ move: { id: "m1", at: [0.2, 0.7], to: [0.31, 0.5] } }, { move: { id: "m1", at: [0.2, 0.7], to: [0.3, 0.49] } }, { move: { id: "m1", at: [0.2, 0.85], to: [0.3, 0.5] } }]);
  deepStrictEqual(got.react.deleted, [{ remove: { id: "m4" } }, { remove: { id: "m2" } }, { remove: { id: "m1" } }]);
  deepStrictEqual(got.react.typed, [{ draw: { kind: "text", at: [0.2, 0.3], text: "crack", group: "range" } }]);
});

test("a React mark sent stays where it was dropped until refused, then goes back; answered, it is drawn from the data", async () => {
  const drop = { gesture: { id: "photo", grab: { body: "m1" }, via: "pointer", reach: [[30, 0]] } };
  const run = (screen, steps) => shot({ screen, css, size, adapter: "react", browser, steps });
  const refused = await run(photos, [{ shot: { name: "before" } }, drop, { shot: { name: "dropped" } }, { refuse: {} }, { shot: { name: "back" } }]);
  ok(!refused.pngs.before.equals(refused.pngs.dropped), "dropped somewhere else");
  ok(refused.pngs.before.equals(refused.pngs.back), "back where it was");
  const moved = structuredClone(photo.marks);
  Object.assign(moved[0], { at: [0.3, 0.7], to: [0.4, 0.5] });
  const answer = { answer: { ops: [{ op: "merge", id: "photo", fields: { marks: moved } }] } };
  const kept = await run(photos, [drop, { shot: { name: "dropped" } }, answer, { shot: { name: "kept" } }]);
  const there = await run({ ...photos, blocks: [{ ...photo, marks: moved }] }, [{ shot: { name: "there" } }]);
  deepStrictEqual(kept.report.sent, marked({ move: { id: "m1", at: [0.3, 0.7], to: [0.4, 0.5] } }));
  ok(!kept.pngs.dropped.equals(kept.pngs.kept), "no longer dimmed once answered");
  ok(kept.pngs.kept.equals(there.pngs.there), "drawn from the data");
});
