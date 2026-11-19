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

test("every fixtures/blocks file passes --check against its fixtures/trees tree in WebKit", () => {
  const kinds = readdirSync(blocks).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 27);
  for (const k of kinds) {
    const r = run("--screen", join(blocks, `${k}.json`), "--expect", join(trees, `${k}.json`), "--check", "--out", join(out, k));
    strictEqual(r.status, 0, `${k}: ${r.stderr}`);
    ok(existsSync(join(out, k, `${k}.png`)), k);
    const tree = JSON.parse(readFileSync(join(out, k, `${k}.tree.json`), "utf8"));
    strictEqual(tree.kind, k);
    deepStrictEqual(JSON.parse(readFileSync(join(out, k, "report.json"), "utf8")).shots, [k]);
  }
});

test("--check exits 1 when the drawn tree is not the expected one", () => {
  const r = run("--screen", join(blocks, "list.json"), "--expect", join(trees, "card.json"), "--check", "--out", join(out, "wrong"));
  strictEqual(r.status, 1);
  ok(r.stderr.includes("drew list#rows native, expected card#card native"), r.stderr);
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
