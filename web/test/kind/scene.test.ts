import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { ctx, part, render } from "../kit.ts";

const lanes = (e) => part(e, "scl").children.map((li) => li.children[0]);

test("a scene draws its label, then one chip per lane with its state, title and the set fields of stage, tool and age", () => {
  const since = new Date(Date.now() - 14 * 60000).toISOString();
  const e = render(
    {
      type: "scene",
      id: "live",
      label: "Lanes · main host",
      lanes: [
        { id: "impl-38", title: "#38 scene", state: "working", stage: "impl", tool: "claude", since },
        { id: "fix-23", title: "#23 diagram", state: "needs", since },
        { id: "rev-60", title: "#60 types", state: "done" },
      ],
    },
    ctx(),
  );
  ok(!e.hasAttribute("data-fallback"));
  deepStrictEqual([e.className, e.dataset.block, e.dataset.id], ["scn b b-scene", "scene", "live"]);
  deepStrictEqual(e.children.map((x) => [x.tagName, x.className, x.children.length ? "" : x.textContent]), [["DIV", "sh", "Lanes · main host"], ["UL", "scl", ""]]);
  const [a, b, d] = lanes(e);
  deepStrictEqual([a.className, a.dataset.id, a.getAttribute("aria-label")], ["ln working", "impl-38", "#38 scene, working"]);
  deepStrictEqual(a.children.map((x) => x.className), ["lnm", "lnb"]);
  deepStrictEqual([part(a, "lnt").textContent, part(a, "lns").textContent, part(a, "lnx").textContent], ["#38 scene", "working", "impl · claude · 14m"]);
  strictEqual(JSON.parse(part(a, "lnx").children.find((x) => x.dataset.tick)?.dataset.tick ?? "null")?.since, since);
  deepStrictEqual([b.className, part(b, "lnx").textContent], ["ln needs", "14m"]);
  deepStrictEqual([d.className, part(d, "lnx")], ["ln done", undefined]);
});

test("a lane's url tap is a link, any other tap a button that taps on click and Enter, and no tap a plain box", () => {
  const taps = [];
  const e = render(
    {
      type: "scene",
      id: "s",
      lanes: [
        { id: "a", title: "opens", state: "working", tap: { open: "impl" } },
        { id: "b", title: "links", state: "merged", tap: { url: "https://x.test/63" } },
        { id: "c", title: "plain", state: "idle" },
      ],
    },
    ctx({ tap: (t) => taps.push(t) }),
  );
  strictEqual(part(e, "sh"), undefined);
  const [a, b, c] = lanes(e);
  deepStrictEqual([a.tagName, a.className, a.getAttribute("role"), a.tabIndex], ["DIV", "ln working tap", "button", 0]);
  a.onclick();
  a.onkeydown({ key: "Tab" });
  a.onkeydown({ key: "Enter" });
  deepStrictEqual(taps, [{ open: "impl" }, { open: "impl" }]);
  deepStrictEqual([b.tagName, b.className, b.href, b.getAttribute("role")], ["A", "ln merged tap", "https://x.test/63", null]);
  deepStrictEqual([c.tagName, c.className, c.getAttribute("role"), c.onclick], ["DIV", "ln idle", null, undefined]);
});

test("a scene with no lanes draws its label alone", () => {
  const e = render({ type: "scene", id: "s", label: "Lanes · cloud host", lanes: [] }, ctx());
  deepStrictEqual(e.children.map((x) => x.className), ["sh"]);
});
