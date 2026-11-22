import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { defaultPair } from "../src/gen/schemes.ts";
import { evaluate, expect, gate, tree } from "../src/core/index.ts";
import { native } from "../src/gen/kinds.ts";

const at = (p: string) => new URL(`../../fixtures/${p}`, import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(at(p), "utf8"));
const files = (dir: string) => readdirSync(at(dir)).filter((f) => f.endsWith(".json"));

test("tree() is fixtures/trees/<kind>.json for every fixtures/blocks file", () => {
  ok(!("document" in globalThis), "no DOM");
  const kinds = files("blocks");
  strictEqual(kinds.length, 47);
  for (const f of kinds) deepStrictEqual(tree(json(`blocks/${f}`), native), json(`trees/${f}`), f);
});

test("evaluate() gives every fixtures/behave case's value, as the crate's eval", () => {
  for (const f of files("behave")) {
    const { state, cases } = json(`behave/${f}`);
    for (const c of cases) deepStrictEqual(evaluate(c.expr, c.state ?? state), c.want, `${f}: ${JSON.stringify(c.expr)}`);
  }
});

test("tree() hides a block whose show is false or null in the screen's state", () => {
  const screen = json("blocks/screen.json");
  strictEqual(tree(screen, native, { ready: false }).children[0].drawn, "hidden");
  strictEqual(tree(screen, native, {}).children[0].drawn, "hidden");
  strictEqual(tree({ ...screen, blocks: [{ type: "text", id: "t", show: { all: [{ not: { get: "a" } }, { eq: [{ len: "ab" }, 2] }] } }] }, native).children[0].drawn, "native");
});

test("expect() gives the crate's findings for each failing case in fixtures/trees/fail", () => {
  const cases = json("trees/fail/cases.json");
  ok(cases.length >= 5);
  for (const c of cases) {
    deepStrictEqual(expect(c.tree, c.want), c.findings, c.name);
    deepStrictEqual(expect(c.want, c.want), []);
  }
  for (const f of files("blocks")) deepStrictEqual(expect(tree(json(`blocks/${f}`), native), json(`trees/${f}`)), [], f);
});

test("gate() gives the crate's misses for every scheme in fixtures/schemes, within rounding", () => {
  deepStrictEqual(gate(defaultPair.light, "tint"), []);
  deepStrictEqual(gate(defaultPair.dark, "tint"), []);
  deepStrictEqual(gate(defaultPair.dark, "solid"), []);
  deepStrictEqual(gate(defaultPair.light, "solid").map((m) => [m.what, m.min]), [["--bg on --a", 4.5]]);
  const tokens = Object.keys(defaultPair.light.tokens);
  const schemes = files("schemes");
  strictEqual(schemes.length, 2);
  for (const f of schemes) {
    const s = json(`schemes/${f}`);
    const want = json(`schemes/misses/${f}`);
    const missing = tokens.filter((k) => !(k in s.tokens));
    if (!Array.isArray(want)) {
      ok(missing.length > 0 && missing.every((k) => want.refused.includes(k)), f);
      continue;
    }
    deepStrictEqual(missing, [], f);
    const got = gate(s, "tint");
    deepStrictEqual(got.map((m) => [m.what, m.min]), want.map((m: { what: string; min: number }) => [m.what, m.min]), f);
    got.forEach((m, i) => ok(Math.abs(m.got - want[i].got) < 1e-9, `${f}: ${m.what} ${m.got} vs ${want[i].got}`));
  }
});
