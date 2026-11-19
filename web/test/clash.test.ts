import { notStrictEqual, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const file = (p) => fileURLToPath(new URL(p, import.meta.url));

test("an app kind named like a core kind does not compile; its own name does", () => {
  const r = spawnSync(file("../node_modules/.bin/tsc"), ["-p", file("clash/tsconfig.json"), "--pretty", "false"], { encoding: "utf8" });
  notStrictEqual(r.status, 0, r.stdout + r.stderr);
  const errors = r.stdout.split("\n").filter((l) => l.includes("error TS"));
  ok(errors.length > 0, r.stdout);
  ok(errors.every((l) => l.includes("clash/core.ts(3,")), r.stdout);
});
