import { deepStrictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { evaluate, start, view } from "../src/behave.ts";

const dir = new URL("../../fixtures/behave/", import.meta.url);
const files = readdirSync(dir).map((f) => [f, JSON.parse(readFileSync(new URL(f, dir), "utf8"))]);

test("evaluate gives every fixtures/behave case the crate's value", () => {
  const bad = files.flatMap(([f, file]) =>
    file.cases.filter((c) => !Object.is(evaluate(c.expr, c.state ?? file.state), c.want)).map((c) => `${f}: ${JSON.stringify(c.expr)} gave ${JSON.stringify(evaluate(c.expr, c.state ?? file.state))}, not ${JSON.stringify(c.want)}`),
  );
  deepStrictEqual(bad, []);
  deepStrictEqual(files.reduce((n, [, file]) => n + file.cases.length, 0) >= 50, true);
});

test("view gives fixtures/behave/view.json the crate's view, and start its start state", () => {
  const [, file] = files.find(([f]) => f === "view.json");
  const v = view(file.screen, file.state);
  deepStrictEqual({ hidden: [...v.hidden].sort(), disabled: [...v.disabled].sort(), says: v.says }, file.view);
  const s = start(file.screen);
  deepStrictEqual([s.more, s.plan, s.email], [false, "free", null]);
  deepStrictEqual(view(file.screen, s).says.email, "Enter an email");
});
