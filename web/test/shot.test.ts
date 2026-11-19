import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { webkit } from "playwright";
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

test("the 200-row screen paints first in under 300 ms warm", async () => {
  const rows = Array.from({ length: 200 }, (_, i) => ({ type: "row", id: `r${i}`, title: `Row ${i}`, subtitle: "green", value: "2m" }));
  const screen = { type: "screen", id: "rows", title: "Rows", blocks: [{ type: "list", id: "all", rows }] };
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
