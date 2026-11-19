#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { shot } from "./shot.ts";

const { values: a } = parseArgs({
  options: {
    screen: { type: "string" },
    size: { type: "string", default: "390x844" },
    css: { type: "string", multiple: true, default: [] },
    script: { type: "string" },
    expect: { type: "string" },
    ids: { type: "string" },
    check: { type: "boolean", default: false },
    out: { type: "string" },
  },
});
if (!a.screen || !a.out) {
  process.stderr.write("usage: blocks-shot --screen <file> [--size 390x844] [--css <file>]… [--script <steps.json>] [--expect <tree.json>] [--ids <ids.json>] [--check] --out <dir>\n");
  process.exit(2);
}
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const run = await shot({
  screen: json(a.screen),
  steps: a.script ? json(a.script) : [],
  name: basename(a.screen, ".json"),
  size: a.size,
  css: a.css,
  expect: a.expect ? json(a.expect) : undefined,
  ids: a.ids ? json(a.ids) : undefined,
  check: a.check,
});
mkdirSync(a.out, { recursive: true });
for (const n of run.report.shots) {
  writeFileSync(join(a.out, `${n}.png`), run.pngs[n]);
  writeFileSync(join(a.out, `${n}.tree.json`), JSON.stringify(run.trees[n], null, 2) + "\n");
}
writeFileSync(join(a.out, "report.json"), JSON.stringify(run.report, null, 2) + "\n");
for (const f of run.faults) process.stderr.write(`${f}\n`);
process.exit(run.faults.length ? 1 : 0);
