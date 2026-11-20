import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { all, ctx, fixture, part, render } from "../kit.ts";

test("a toast in the flow is its tick, glyph and text with no clock, close or undo; empty, it draws its fallback", () => {
  const e = render(fixture("toast"), ctx());
  deepStrictEqual([e.className, e.getAttribute("role"), e.getAttribute("aria-label"), e.dataset.tone], ["tst inl ok b b-toast", "status", "Archived 3 orders", "ok"]);
  deepStrictEqual([part(e, "tsg").textContent, part(e, "tsg").getAttribute("aria-hidden"), part(e, "tsx").textContent], ["✓", "true", "Archived 3 orders"]);
  deepStrictEqual(all(e).filter((x) => x.tagName === "BUTTON" || x.classList.contains("tsk")), []);
  deepStrictEqual(["warn", "bad", "info", undefined].map((tone) => [render({ type: "toast", title: "x", tone }, ctx()).className.split(" ")[2], part(render({ type: "toast", title: "x", tone }, ctx()), "tsg").textContent]), [["warn", "!"], ["bad", "×"], ["b", ""], ["b", ""]]);
  for (const [f, want] of [[undefined, "Done"], [{ title: "Saved" }, "Saved"]]) {
    const x = render({ type: "toast", id: "t", title: "", fallback: f }, ctx());
    ok(x.hasAttribute("data-fallback"));
    strictEqual(part(x, "b-row__title")?.textContent, want);
  }
});
