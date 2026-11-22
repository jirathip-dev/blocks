import { deepStrictEqual, notStrictEqual, ok, strictEqual } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import * as core from "../src/core/index.ts";

const at = (p: string) => new URL(`../../fixtures/${p}`, import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(at(p), "utf8"));
const builders: Record<string, (f: object) => { type: string }> = { ...core };

function rebuild(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(rebuild);
  if (typeof v !== "object" || v === null) return v;
  const { type, ...rest } = v as Record<string, unknown>;
  const fields = Object.fromEntries(Object.entries(rest).map(([k, x]) => [k, rebuild(x)]));
  if (typeof type !== "string" || !(type in core.hooks)) return type === undefined ? fields : { type, ...fields };
  const make = builders[type] ?? builders[`${type}_`];
  ok(make, `a builder for ${type}`);
  const b = make(fields);
  strictEqual(b.type, type);
  return b;
}

test("the builders give every fixtures/blocks file back, type and all", () => {
  const files = readdirSync(at("blocks")).filter((f) => f.endsWith(".json"));
  strictEqual(files.length, 47);
  for (const f of files) deepStrictEqual(rebuild(json(`blocks/${f}`)), json(`blocks/${f}`), f);
});

test("built() writes the same fallbacks as Built::of, fixtures/built/every.json", () => {
  const every = json("built/every.json");
  const name = (b: { type: string; id?: string }) => (existsSync(at(`blocks/${b.type}-${b.id}.json`)) ? `${b.type}-${b.id}` : b.type);
  const blocks = every.blocks.map((b: { type: string }) => rebuild(json(`blocks/${name(b)}.json`)));
  const screen = core.screen({ id: "every", blocks });
  const out = core.built(screen);
  deepStrictEqual(JSON.parse(JSON.stringify(out)), every);
  strictEqual(screen.fallback, undefined);
});

test("expr builders write the wire's expressions", () => {
  deepStrictEqual(core.expr.all(core.expr.get("a"), core.expr.not(core.expr.get("b"))), { all: [{ get: "a" }, { not: { get: "b" } }] });
  deepStrictEqual(core.expr.is({ value: core.expr.get("mail"), pattern: "email" }), { is: { value: { get: "mail" }, pattern: "email" } });
});

test("share() keeps each unchanged part as prev's object", () => {
  const prev = core.screen({ id: "s", blocks: [core.row({ id: "a", title: "A" }), core.row({ id: "b", title: "B" })] });
  const next = core.screen({ id: "s", blocks: [core.row({ id: "a", title: "A" }), core.row({ id: "b", title: "B2" })] });
  const out = core.share(prev, next);
  notStrictEqual(out, prev);
  strictEqual(out.blocks?.[0], prev.blocks?.[0]);
  notStrictEqual(out.blocks?.[1], prev.blocks?.[1]);
  deepStrictEqual(out.blocks?.[1], { type: "row", id: "b", title: "B2" });
  const same = core.screen({ id: "s", blocks: [core.row({ id: "a", title: "A" }), core.row({ id: "b", title: "B" })] });
  strictEqual(core.share(prev, same), prev);
  strictEqual(core.share(undefined, next), next);
  const fewer = core.screen({ id: "s", blocks: [core.row({ id: "a", title: "A" })] });
  notStrictEqual(core.share(prev, fewer), prev);
});
