#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { webkit } from "playwright";
import { sheets, shot } from "./shot.ts";

const { values: a } = parseArgs({
  options: {
    plan: { type: "string" },
    screen: { type: "string" },
    size: { type: "string", default: "390x844" },
    css: { type: "string", multiple: true, default: [] },
    script: { type: "string" },
    expect: { type: "string" },
    ids: { type: "string" },
    check: { type: "boolean", default: false },
    scheme: { type: "string", default: "light" },
    measure: { type: "boolean", default: false },
    out: { type: "string" },
  },
});
if (!a.plan && (!a.screen || !a.out)) {
  process.stderr.write(
    "usage: blocks-shot --plan <plan.json> | --screen <file> [--size 390x844] [--css <file>]… [--script <steps.json>] [--expect <tree.json>] [--ids <ids.json>] [--check] [--scheme light|dark] [--measure] --out <dir>\n",
  );
  process.exit(2);
}
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const save = (dir, run) => {
  mkdirSync(dir, { recursive: true });
  for (const n of run.report.shots) {
    writeFileSync(join(dir, `${n}.png`), run.pngs[n]);
    writeFileSync(join(dir, `${n}.tree.json`), JSON.stringify(run.trees[n], null, 2) + "\n");
  }
  writeFileSync(join(dir, "report.json"), JSON.stringify(run.report, null, 2) + "\n");
};

if (a.plan) {
  try {
    const plan = json(a.plan), seen = [];
    const browser = await webkit.launch();
    try {
      for (const r of plan.runs) {
        const run = await shot({ ...r, screen: json(r.screen), name: basename(r.screen, ".json"), browser });
        save(join(plan.out, r.name), run);
        seen.push(...run.seen.map((s) => ({ ...s, run: r.name })));
      }
    } finally {
      await browser.close();
    }
    mkdirSync(plan.out, { recursive: true });
    for (const f of new Set(plan.runs.filter((r) => r.probes).flatMap((r) => r.css))) seen.push(...sheets(f));
    writeFileSync(join(plan.out, "seen.json"), JSON.stringify(seen, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`blocks-shot --plan: ${e.stack ?? e}\n`);
    process.exit(2);
  }
  process.exit(0);
}
const run = await shot({
  screen: json(a.screen),
  steps: a.script ? json(a.script) : [],
  name: basename(a.screen, ".json"),
  size: a.size,
  css: a.css,
  expect: a.expect ? json(a.expect) : undefined,
  ids: a.ids ? json(a.ids) : undefined,
  check: a.check,
  scheme: a.scheme,
  look: a.measure,
});
save(a.out, run);
for (const f of a.check ? [...run.faults, ...a.css.flatMap((f) => sheets(f).map((s) => `${s.file}:${s.line}: ${s.rule}: ${s.detail}`))] : run.faults) process.stderr.write(`${f}\n`);
process.exit(run.faults.length || (a.check && a.css.some((f) => sheets(f).length)) ? 1 : 0);
