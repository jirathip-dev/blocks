import { deepStrictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { Mirror } from "../src/stream.ts";

const dir = new URL("../../fixtures/protocol/", import.meta.url);
const names = readdirSync(dir).filter((n) => n.endsWith(".json"));

test("there are protocol fixtures", () => deepStrictEqual(names.length >= 8, true));

for (const name of names) {
  test(`the mirror runs ${name} as the crate does`, () => {
    const c = JSON.parse(readFileSync(new URL(name, dir), "utf8"));
    const m = new Mirror(c.v);
    c.steps.forEach((s, i) => {
      const at = `step ${i}`;
      if (s.hello) deepStrictEqual(m.hello(s.hello) ?? null, s.outdated, at);
      else if (s.open) m.open(s.open);
      else if (s.close) m.close(s.close);
      else if (s.have) deepStrictEqual(m.have(), s.have, at);
      else if (s.frame) deepStrictEqual(m.frame(s.frame), s.took, at);
      else if (s.synced) deepStrictEqual(m.synced(s.sent, s.synced), s.took, at);
      else throw new Error(`${at}: no such step`);
    });
    for (const [k, want] of Object.entries(c.screens)) deepStrictEqual(m.screen(k) ?? null, want, k);
  });
}
