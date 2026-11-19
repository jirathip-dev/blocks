import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { webkit } from "playwright";
import { defaultPair } from "../src/gen/schemes.ts";
import { shot } from "../shot/shot.ts";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const cli = at("../shot/cli.ts");
const out = mkdtempSync(join(process.env.DROVER_SCRATCH_TARGET ?? tmpdir(), "shot-"));
const blocks = at("../../fixtures/blocks/");
const trees = at("../../fixtures/trees/");
const run = (...args) => spawnSync(process.execPath, ["--no-warnings", cli, ...args], { encoding: "utf8" });
const RUN = { size: "390x844", css: [], scripts: [], kinds: [], steps: [], probes: true };
const plan = (name, runs) => {
  const file = join(out, `${name}.plan.json`);
  writeFileSync(file, JSON.stringify({ out: join(out, name), runs }));
  const r = run("--plan", file);
  strictEqual(r.status, 0, r.stderr);
  return JSON.parse(readFileSync(join(out, name, "seen.json"), "utf8"));
};
const bad = at("../../fixtures/guard/bad/");
const rules = (seen) => [...new Set(seen.map((s) => s.rule))];

test("each bad fixture fires its probe and no other in WebKit, all in one --plan launch; every probe has one", () => {
  const draw = readdirSync(join(bad, "render")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  const sheets = readdirSync(join(bad, "css")).map((f) => f.replace(/\.css$/, ""));
  const probes = readdirSync(at("../shot/probe/")).map((f) => f.replace(/\.ts$/, ""));
  deepStrictEqual([...draw, ...sheets].sort(), probes.sort());
  const own = (n) => (existsSync(join(bad, "render", `${n}.css`)) ? [join(bad, "render", `${n}.css`)] : []);
  const runs = [
    ...draw.map((n) => ({ ...RUN, name: n, screen: join(bad, "render", `${n}.json`), css: own(n), kinds: ["gauge"] })),
    ...sheets.map((n) => ({ ...RUN, name: n, screen: join(blocks, "text.json"), css: [join(bad, "css", `${n}.css`)] })),
  ];
  const seen = plan("bad", runs);
  for (const n of draw) deepStrictEqual(rules(seen.filter((s) => s.run === n)), [`render/${n}`], n);
  for (const n of sheets) deepStrictEqual(rules(seen.filter((s) => s.run === n || s.file === join(bad, "css", `${n}.css`))), [`css/${n}`], n);
  deepStrictEqual(seen.filter((s) => s.file).map((s) => [s.rule, s.line, s.at]), sheets.map((n) => [`css/${n}`, 3, ""]));
});

test("a plan's script registers an app kind's view on window.blocksApps: the gauge draws natively and render/tree is quiet", () => {
  const script = join(out, "gauge.js");
  writeFileSync(script, 'window.blocksApps = { gauge: (b) => Object.assign(document.createElement("div"), { textContent: b.title }) };');
  const seen = plan("gauge", [{ ...RUN, name: "gauge", screen: join(bad, "render", "tree.json"), kinds: ["gauge"], scripts: [script] }]);
  deepStrictEqual(seen, []);
  strictEqual(JSON.parse(readFileSync(join(out, "gauge", "gauge", "tree.tree.json"), "utf8")).children[0].drawn, "native");
});

test("the fixtures/blocks files draw in one --plan launch, each run's PNG, tree and report in its own folder", () => {
  const kinds = readdirSync(blocks).map((f) => f.replace(/\.json$/, ""));
  plan("all", kinds.map((k) => ({ ...RUN, name: `390/${k}`, screen: join(blocks, `${k}.json`), probes: false })));
  for (const k of kinds) {
    ok(existsSync(join(out, "all", "390", k, `${k}.png`)), k);
    deepStrictEqual(JSON.parse(readFileSync(join(out, "all", "390", k, "report.json"), "utf8")).shots, [k]);
  }
});

test("every fixtures/blocks file passes --check against its fixtures/trees tree in WebKit at 390 and 1440", () => {
  const kinds = readdirSync(blocks).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 31);
  for (const size of ["390x844", "1440x900"])
    for (const k of kinds) {
      const dir = join(out, size, k);
      const r = run("--screen", join(blocks, `${k}.json`), "--size", size, "--expect", join(trees, `${k}.json`), "--check", "--out", dir);
      strictEqual(r.status, 0, `${k} ${size}: ${r.stderr}`);
      ok(existsSync(join(dir, `${k}.png`)), k);
      const tree = JSON.parse(readFileSync(join(dir, `${k}.tree.json`), "utf8"));
      strictEqual(tree.kind, k);
      ok(tree.role && tree.name, `${k}: ${tree.role} "${tree.name}"`);
      deepStrictEqual(JSON.parse(readFileSync(join(dir, "report.json"), "utf8")).shots, [k]);
    }
});

test("every fixtures/stress variant draws at 390 in one --plan launch with each block sized, inside the width and over no sibling", () => {
  const stress = at("../../fixtures/stress/");
  const names = readdirSync(stress).filter((f) => f !== "table.json").map((f) => f.replace(/\.json$/, ""));
  strictEqual(names.length, 61);
  const seen = plan("stress", names.map((n) => ({ ...RUN, name: n, screen: join(stress, `${n}.json`) })));
  deepStrictEqual(seen.filter((s) => ["render/no-size", "render/overlap"].includes(s.rule) || (s.rule === "render/overflow" && s.at)), []);
});

test("--check exits 1 when the drawn tree is not the expected one", () => {
  const r = run("--screen", join(blocks, "list.json"), "--expect", join(trees, "card.json"), "--check", "--out", join(out, "wrong"));
  strictEqual(r.status, 1);
  ok(r.stderr.includes("drew list#rows native, expected card#card native"), r.stderr);
});

test("--check fails a node whose role or name is not the expected one, a node with no name and an unnamed link", () => {
  const want = JSON.parse(readFileSync(join(trees, "button.json"), "utf8"));
  const renamed = join(out, "renamed.json");
  writeFileSync(renamed, JSON.stringify({ ...want, role: "link", name: "Send" }));
  const r = run("--screen", join(blocks, "button.json"), "--expect", renamed, "--check", "--out", join(out, "renamed"));
  strictEqual(r.status, 1);
  strictEqual(r.stderr, 'button: render/tree button#save: drew button "Save", expected link "Send"\n');
  const bare = join(out, "bare.json");
  writeFileSync(bare, JSON.stringify({ type: "screen", id: "bare", blocks: [{ type: "" }, { type: "nav", links: [{ label: "", href: "/x" }] }] }));
  const b = run("--screen", bare, "--check", "--out", join(out, "bare"));
  strictEqual(b.status, 1);
  strictEqual(b.stderr, "bare: render/no-name screen#bare/~0: the block has no name\nbare: render/no-name screen#bare/nav~0: an unnamed a\n");
});

test("each fixtures/ids file is the block and action ids its screen draws, and --check fails on others", () => {
  const ids = at("../../fixtures/ids/");
  const names = readdirSync(ids).map((f) => f.replace(/\.json$/, ""));
  deepStrictEqual(names.sort(), ["button", "screen"]);
  for (const k of names) {
    const r = run("--screen", join(blocks, `${k}.json`), "--ids", join(ids, `${k}.json`), "--check", "--out", join(out, `ids-${k}`));
    strictEqual(r.status, 0, `${k}: ${r.stderr}`);
  }
  const r = run("--screen", join(blocks, "button.json"), "--ids", join(ids, "screen.json"), "--check", "--out", join(out, "ids-wrong"));
  strictEqual(r.status, 1);
  strictEqual(r.stderr, 'button: drew ids {"blocks":["save"],"actions":["save"]}, expected {"blocks":["home","hint"],"actions":[]}\n');
});

test("a scripted tap sends the button's action and an answer's ops are drawn", () => {
  const script = join(out, "tap.json");
  const ops = [{ op: "merge", id: "save", fields: { label: "Saved" } }];
  writeFileSync(script, JSON.stringify([{ tap: { id: "save" } }, { answer: { ops } }, { shot: { name: "saved" } }]));
  const r = run("--screen", join(blocks, "button.json"), "--script", script, "--check", "--out", join(out, "tap"));
  strictEqual(r.status, 0, r.stderr);
  const report = JSON.parse(readFileSync(join(out, "tap", "report.json"), "utf8"));
  deepStrictEqual(report.sent, [{ screen: "save", action: "save", block: "save", values: {} }]);
  strictEqual(report.timings.steps_ms.length, 3);
  strictEqual(JSON.parse(readFileSync(join(out, "tap", "saved.tree.json"), "utf8")).text, "Saved");
});

test("scripted typing and taps change local state: a check's message, a disabled submit and act, a tap's set, a bound value", () => {
  const view = JSON.parse(readFileSync(at("../../fixtures/behave/view.json"), "utf8"));
  const screen = join(out, "behave.json");
  const script = join(out, "behave-steps.json");
  writeFileSync(screen, JSON.stringify(view.screen));
  const steps = [
    { shot: { name: "start" } },
    { tap: { id: "save" } },
    { type: { id: "join", text: "ada@" } },
    { shot: { name: "typed" } },
    { tap: { id: "join" } },
    { type: { id: "join", text: "ada@example.org" } },
    { shot: { name: "fixed" } },
    { tap: { id: "join" } },
    { tap: { id: "more" } },
    { shot: { name: "more" } },
    { tap: { id: "more" } },
    { tap: { id: "save" } },
  ];
  writeFileSync(script, JSON.stringify(steps));
  const r = run("--screen", screen, "--script", script, "--out", join(out, "behave"));
  strictEqual(r.status, 0, r.stderr);
  const tree = (n) => JSON.parse(readFileSync(join(out, "behave", `${n}.tree.json`), "utf8"));
  const drawn = (n) => Object.fromEntries(tree(n).children.map((c) => [c.id, c.drawn]));
  deepStrictEqual(drawn("start"), { plan: "native", join: "native", more: "native", plans: "hidden", later: "native", sum: "native", count: "native", box: "hidden" });
  ok(tree("start").children[6].text.includes("3"), tree("start").children[6].text);
  ok(!tree("start").children[1].text.includes("Enter an email"), "an untouched field shows no message");
  ok(tree("typed").children[1].text.includes("Enter an email address"), tree("typed").children[1].text);
  ok(!tree("fixed").children[1].text.includes("Enter an email"), tree("fixed").children[1].text);
  deepStrictEqual(drawn("more"), { plan: "native", join: "native", more: "native", plans: "native", later: "native", sum: "native", count: "native", box: "native" });
  const report = JSON.parse(readFileSync(join(out, "behave", "report.json"), "utf8"));
  deepStrictEqual(report.dropped, ["tap save", "tap join", "tap more"], "save is off until more, the submit while a check fails, the button once its set ran");
  deepStrictEqual(report.sent.filter((x) => x.action === "save").length, 1, "a disabled act posts nothing; once more is on, save posts");
});

const corner = (png) => {
  const idat = [];
  for (let at = 8; at < png.length; at += png.readUInt32BE(at) + 12) {
    if (png.toString("ascii", at + 4, at + 8) === "IDAT") idat.push(png.subarray(at + 8, at + 8 + png.readUInt32BE(at)));
  }
  return `#${inflateSync(Buffer.concat(idat)).subarray(1, 4).toString("hex")}`;
};

test("a harness run paints on the default pair unless its --css says otherwise", async () => {
  const own = join(out, "own.css");
  writeFileSync(own, ":root{--bg:#102030}");
  const screen = JSON.parse(readFileSync(join(blocks, "button.json"), "utf8"));
  const browser = await webkit.launch();
  try {
    strictEqual(corner((await shot({ screen, browser })).pngs.shot), defaultPair.light.tokens["--bg"]);
    strictEqual(corner((await shot({ screen, browser, css: [own] })).pngs.shot), "#102030");
  } finally {
    await browser.close();
  }
});

test("an island gets its props, its named event is sent as an action, an unnamed one dropped, and with no component it draws its fallback", async () => {
  const echo = (name, events) => ({ type: "island", id: "e", name, props: { zoom: 3 }, events, fallback: { title: "No map" } });
  const browser = await webkit.launch();
  try {
    const merge = [{ frame: { ops: [{ op: "merge", id: "e", fields: { props: { zoom: 4 } } }] } }, { shot: { name: "shot" } }];
    const named = await shot({ screen: echo("x-echo", ["echo"]), steps: merge, browser });
    deepStrictEqual(named.report.sent, [3, 4].map((zoom) => ({ screen: "e", action: "echo", block: "e", values: { zoom } })));
    deepStrictEqual(named.report.dropped, []);
    deepStrictEqual([named.trees.shot.drawn, named.trees.shot.text], ["native", '{"zoom":4}']);
    const unnamed = await shot({ screen: echo("x-echo", []), browser });
    deepStrictEqual([unnamed.report.sent, unnamed.report.dropped], [[], ["event e echo"]]);
    const none = await shot({ screen: echo("x-none", ["echo"]), browser });
    deepStrictEqual([none.report.sent, none.report.dropped], [[], []]);
    deepStrictEqual([none.trees.shot.drawn, none.trees.shot.text], ["fallback", "No map"]);
  } finally {
    await browser.close();
  }
});

const rows = Array.from({ length: 200 }, (_, i) => ({ type: "row", id: `r${i}`, title: `Row ${i}`, subtitle: "green", value: "2m" }));
const screen = { type: "screen", id: "rows", title: "Rows", blocks: [{ type: "list", id: "all", rows }] };

test("the 200-row screen paints first in under 300 ms warm", async () => {
  const browser = await webkit.launch();
  try {
    await shot({ screen, browser });
    const { report, trees, faults } = await shot({ screen, browser, check: true });
    deepStrictEqual(faults, []);
    strictEqual(trees.shot.children[0].children.length, 200);
    ok(report.timings.first_paint_ms < 300, `${report.timings.first_paint_ms} ms`);
  } finally {
    await browser.close();
  }
});

test("on the 200-row screen a scripted scroll and a 2 s burst of 60 frames a second keep every frame in 16.7 ms, each frame's patch in 4 ms", async () => {
  const burst = Array.from({ length: 120 }, (_, i) => ({
    frame: { k: "rows", from: i, rev: i + 1, ops: [{ op: "merge", id: `r${(i * 7) % 200}`, fields: { value: `${i}s` } }] },
  }));
  const browser = await webkit.launch();
  try {
    await shot({ screen, browser });
    const scroll = await shot({ screen, browser, steps: [{ scroll: { id: "r199" } }, { scroll: { id: "r0" } }, { shot: { name: "top" } }] });
    const stream = await shot({ screen, browser, steps: [...burst, { shot: { name: "end" } }] });
    const { steps_ms: _, ...s } = scroll.report.timings;
    const { steps_ms, ...b } = stream.report.timings;
    process.stdout.write(`frame budget: scroll ${JSON.stringify(s)} burst ${JSON.stringify(b)}\n`);
    strictEqual(steps_ms.length, 121);
    strictEqual(scroll.report.timings.longest_patch_ms, undefined);
    for (const t of [scroll.report.timings, stream.report.timings]) {
      ok(t.longest_frame_ms <= 16.7, `longest frame ${t.longest_frame_ms} ms`);
      strictEqual(t.frames_over_budget, 0);
    }
    ok(b.longest_patch_ms <= 4, `longest patch ${b.longest_patch_ms} ms`);
    strictEqual(stream.trees.end.children[0].children[33].text?.includes("119s"), true);
  } finally {
    await browser.close();
  }
});

test("a burst of whole-screen frames on a 2,000-row screen counts its frames over 16.7 ms", async () => {
  const big = { ...screen, blocks: [{ type: "list", id: "all", rows: Array.from({ length: 2000 }, (_, i) => ({ ...rows[0], id: `r${i}` })) }] };
  const { report } = await shot({ screen: big, steps: Array.from({ length: 10 }, (_, i) => ({ frame: { k: "rows", rev: i + 1, screen: big } })) });
  ok(report.timings.frames_over_budget > 0, JSON.stringify(report.timings));
  ok(report.timings.longest_frame_ms > 16.7);
});
