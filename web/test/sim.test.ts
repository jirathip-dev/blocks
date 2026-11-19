import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { evaluate, view } from "../src/core/eval.ts";
import { apply } from "../src/patch.ts";

const root = new URL("../../", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

function got(c) {
  if (c.ops) return apply(c.screen, c.ops) ?? null;
  if ("expr" in c) return evaluate(c.expr, c.state);
  const v = view(c.screen, c.state);
  return { hidden: [...v.hidden].sort(), disabled: [...v.disabled].sort(), says: v.says };
}

function shortest(corpus) {
  const bad = corpus.cases
    .map((c) => ({ c, s: JSON.stringify(c), got: got(c), want: c.ops ? c.after : "expr" in c ? c.value : c.view }))
    .filter((x) => !same(x.got, x.want) && !Object.is(x.got, x.want));
  bad.sort((a, b) => a.s.length - b.s.length);
  const [x] = bad;
  return x && `${bad.length} of ${corpus.cases.length} cases differ; the shortest, seed ${x.c.seed}: ${x.s}\n  gave ${JSON.stringify(x.got)}`;
}

test("the forced mismatch corpus names its shortest differing seed", () => {
  const out = shortest(read("fixtures/sim/mismatch.json"));
  strictEqual(out?.startsWith("3 of 4 cases differ; the shortest, seed 7:"), true, out);
});

test("the nightly corpus gives TS the crate's screens, values and views", { skip: !process.env.BLOCKS_SIM_CORPUS }, () => {
  deepStrictEqual(shortest(read(process.env.BLOCKS_SIM_CORPUS ?? "")), undefined);
});
