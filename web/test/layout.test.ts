import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { drops, places } from "../src/core/layout.ts";

const f = JSON.parse(readFileSync(new URL("../../fixtures/layouts/edits.json", import.meta.url), "utf8"));

test("drops give fixtures/layouts/edits.json the crate's edits, in reading order", () => {
  for (const [grabbed, want] of Object.entries(f.drops)) deepStrictEqual(drops(f.layout.root, f.slots, grabbed), want, grabbed);
});

test("places are the drops with where the node is now, once", () => {
  for (const grabbed of Object.keys(f.drops)) {
    const all = places(f.layout.root, f.slots, grabbed);
    strictEqual(all.length, grabbed === "root" ? 0 : f.drops[grabbed].length + 1, grabbed);
  }
});
