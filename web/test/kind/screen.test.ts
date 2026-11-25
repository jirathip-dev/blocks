import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { ctx, fixture, part, render } from "../kit.ts";

const ids = (e) => e.children.map((x) => x.dataset.id);

test("a screen with a side section splits into a main column and a named side column, each in source order", () => {
  const e = render(fixture("screen-side"), ctx());
  strictEqual(e.className, "scr split b b-screen");
  const cols = part(e, "scr-cols");
  deepStrictEqual(e.children.map((x) => x.className), ["tabh", "scr-cols"]);
  const [main, side] = cols.children;
  deepStrictEqual([main.className, side.tagName, side.className], ["scr-main", "ASIDE", "scr-side"]);
  deepStrictEqual(ids(main), ["lines", "report", "next"]);
  deepStrictEqual(ids(side), ["trip", "customer"]);
  strictEqual(side.getAttribute("aria-label"), "Trip summary, Customer");
});

test("a screen with no side section, only side sections or a focus draws one column in source order", () => {
  const sec = (id, side) => ({ type: "section", id, header: id, side, blocks: [] });
  for (const s of [
    { blocks: [sec("a", false), sec("b")] },
    { blocks: [sec("a", true), sec("b", true)] },
    { focus: true, blocks: [sec("a", true), sec("b")] },
  ]) {
    const e = render({ type: "screen", id: "s", ...s }, ctx());
    strictEqual(e.classList.contains("split"), false);
    deepStrictEqual(ids(e).slice(1), s.focus ? [] : ["a", "b"]);
  }
});
