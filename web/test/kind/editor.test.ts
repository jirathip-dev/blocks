import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mock, test } from "node:test";
import { ctx, fixture, render } from "../kit.ts";

test("an editor numbers its lines from first, marks an error's line with its message, and lists errors off the excerpt", () => {
  const errors = [
    { line: 41, message: "expected `;`" },
    { line: 41, message: "second" },
    { line: 9, message: "unknown key" },
  ];
  const e = render({ type: "editor", id: "src", name: "main", action: "check", first: 40, text: "fn main() {\n    let n = 1\n\n}", errors }, ctx());
  strictEqual(e.hasAttribute("data-fallback"), false);
  deepStrictEqual(
    e.children.map((k) => [k.className, k.textContent]),
    [
      ["edl", "40fn main() {"],
      ["edl err", "41    let n = 1"],
      ["ede", "expected `;`"],
      ["edl", "42 "],
      ["edl", "43}"],
      ["ede far", "line 9 · unknown key"],
    ],
  );
  strictEqual(e.getAttribute("role"), "button");
  strictEqual(e.getAttribute("aria-label"), "main");
  const one = render(fixture("editor"), ctx());
  deepStrictEqual(
    one.children.map((k) => k.textContent),
    ["1hello"],
  );
});

test("a tapped editor opens a named draft that survives a redraw and posts its action 400ms after typing stops", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const posts = [];
  const c = ctx({ screen: "ed", act: async (a) => (posts.push(a), true) });
  const b = { type: "editor", id: "cfg", name: "fleet", action: "check-fleet", text: "x = 1\ny =", errors: [{ line: 2, message: "expected a value" }] };
  const e = render(b, c);
  e.onkeydown({ key: "a", preventDefault() {} });
  strictEqual(e.querySelector("textarea"), null);
  e.onkeydown({ key: "Enter", preventDefault() {} });
  const ta = e.querySelector("textarea");
  ok(ta && e.classList.contains("on"));
  strictEqual(ta.name, "fleet");
  strictEqual(ta.value, "x = 1\ny =");
  strictEqual(e.getAttribute("role"), "group");
  deepStrictEqual(
    e.children.slice(1).map((k) => k.textContent),
    ["line 2 · expected a value"],
  );
  ta.value = "x = 1\ny = 2";
  ta.oninput();
  mock.timers.tick(399);
  strictEqual(posts.length, 0);
  ta.value = "x = 1\ny = 3";
  ta.oninput();
  mock.timers.tick(399);
  strictEqual(posts.length, 0);
  mock.timers.tick(1);
  deepStrictEqual(posts, [{ action: "check-fleet", block: "cfg", values: { fleet: "x = 1\ny = 3" } }]);
  const again = render({ ...b, action: "check-2", errors: [] }, c);
  strictEqual(again.querySelector("textarea"), ta);
  strictEqual(again.children.length, 1);
  ta.value = b.text;
  ta.oninput();
  mock.timers.tick(400);
  strictEqual(posts.length, 1);
  ta.value = "z";
  ta.oninput();
  mock.timers.tick(400);
  strictEqual(posts[1].action, "check-2");
  mock.timers.reset();
});
