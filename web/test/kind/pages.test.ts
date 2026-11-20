import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { all, ctx, fixture, part, render } from "../kit.ts";

test("pages with none draws its head and note, says no pages yet, and offers no paging, zoom or region", () => {
  const e = render({ ...fixture("pages"), pages: [] }, ctx());
  deepStrictEqual([part(e, "dcc").textContent, part(e, "dcn").textContent, part(e, "dce").textContent], ["no pages", "Out of date: the prices changed after this was drawn.", "No pages yet"]);
  deepStrictEqual(all(e).filter((x) => x.tagName === "BUTTON" || x.classList.contains("dcw")), []);
  strictEqual(part(e, "btn").getAttribute("aria-label"), "download Q-2026-0418 rev 3 as PDF");
});
