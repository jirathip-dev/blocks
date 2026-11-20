import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { all, ctx, part, render } from "../kit.ts";

test("a diff draws its file, summary, each hunk's @@ line and its lines marked added, removed or context", () => {
  const b = { type: "diff", id: "d", file: "a.ts", summary: "+1 −1", hunks: [{ at: "@@ -1 +1 @@", lines: ["-x", "+y", " z", "\\ No newline", ""] }, { at: "@@ -9 +9 @@", lines: [] }] };
  const e = render(b, ctx());
  strictEqual(e.className, "df b b-diff");
  strictEqual(e.getAttribute("aria-label"), "a.ts");
  deepStrictEqual([part(e, "dff")?.textContent, part(e, "dfs")?.textContent], ["a.ts", "+1 −1"]);
  deepStrictEqual(all(e).filter((x) => x.classList.contains("dfk")).map((x) => x.textContent), ["@@ -1 +1 @@", "@@ -9 +9 @@"]);
  deepStrictEqual(
    all(e).filter((x) => x.classList.contains("dfl")).map((x) => [x.className, x.children[0].textContent, x.textContent]),
    [["dfl del", "-", "-x"], ["dfl add", "+", "+y"], ["dfl ctx", " ", " z"], ["dfl ctx", "\\", "\\ No newline"], ["dfl ctx", " ", " "]],
  );
});

test("a diff with no hunks draws only its header, and one with no file or hunks list its fallback", () => {
  const e = render({ type: "diff", file: "gone.rs", hunks: [] }, ctx());
  ok(!part(e, "dfb") && !part(e, "dfs"));
  strictEqual(part(e, "dff")?.textContent, "gone.rs");
  const f = render({ type: "diff", id: "x", file: "a", fallback: { title: "Change" } }, ctx());
  ok(f.hasAttribute("data-fallback"));
  strictEqual(part(f, "b-row__title")?.textContent, "Change");
});
