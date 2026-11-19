import { deepStrictEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as core from "../src/core/index.ts";

type Case = { name: string; screen: unknown; app: string[]; faults: core.Fault[] };

const json = (p: string) => JSON.parse(readFileSync(new URL(`../../fixtures/${p}`, import.meta.url), "utf8"));
const cases: Case[] = json("check/cases.json");
const loose = (fs: core.Fault[]) => fs.map((f) => (f.fault === "shape" ? { ...f, why: "" } : f));

test("check() gives Built::check's faults for every fixtures/check case", () => {
  ok(cases.length > 100, `${cases.length} cases`);
  for (const c of cases) deepStrictEqual(loose(core.check(c.screen, c.app)), loose(c.faults), c.name);
});

test("check() gives the crate's own wording for a stepper's misplacement", () => {
  for (const c of cases.filter((c) => c.name.startsWith("steps-"))) deepStrictEqual(core.check(c.screen, c.app), c.faults, c.name);
});

test("actions() lists every action a screen sends, sorted, each once", () => {
  const s = core.built(
    core.screen({
      id: "s",
      blocks: [
        core.row({ id: "a", title: "A", tap: { action: "open" }, button: { label: "Go", action: "go" } }),
        core.list({ id: "l", rows: [core.row({ id: "b", title: "B", tap: { action: "go" } })], reorder: { name: "to", action: "sort" } }),
      ],
    }),
  );
  deepStrictEqual(core.actions(s), ["go", "open", "sort"]);
});
