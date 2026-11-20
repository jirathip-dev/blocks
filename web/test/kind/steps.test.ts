import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { all, ctx, part, render } from "../kit.ts";

test("a stepper marks steps done, current and to do, and only a done step's tap is pressable", () => {
  const taps = [];
  const steps = [
    { id: "a", label: "Stop", sub: "09:42", tap: { action: "stop" } },
    { id: "b", label: "Lines", tap: { url: "https://x.test/l" } },
    { id: "c", label: "Proof", tap: { action: "proof" } },
    { id: "d", label: "Leave" },
  ];
  const e = render({ type: "steps", id: "s", title: "Stop 3", current: "c", steps }, ctx({ tap: (t) => taps.push(t) }));
  strictEqual(e.getAttribute("role"), "group");
  strictEqual(e.getAttribute("aria-label"), "Stop 3");
  const lis = all(e).filter((x) => x.tagName === "LI");
  deepStrictEqual(
    lis.map((l) => [l.className, l.getAttribute("aria-current"), l.children[0].getAttribute("aria-label"), l.children[0].getAttribute("role")]),
    [
      ["spi done", null, "Stop, step 1 of 4, done", "button"],
      ["spi done", null, "Lines, step 2 of 4, done", null],
      ["spi now", "step", "Proof, step 3 of 4, current", null],
      ["spi todo", null, "Leave, step 4 of 4, to do", null],
    ],
  );
  strictEqual(lis[1].children[0].tagName, "A");
  strictEqual(lis[1].children[0].href, "https://x.test/l");
  strictEqual(lis[0].children[0].dataset.action, "stop");
  deepStrictEqual(lis.map((l) => part(l, "spm").textContent), ["✓", "✓", "3", "4"]);
  strictEqual(part(lis[2], "sps").textContent, "step 3 of 4");
  lis[0].children[0].onclick();
  strictEqual(lis[2].children[0].onclick ?? null, null);
  deepStrictEqual(taps, [{ action: "stop" }]);
  strictEqual(part(e, "spx").textContent, "Proofstep 3 of 4");
  const done = render({ type: "steps", id: "s", done: true, steps: steps.slice(0, 2) }, ctx());
  deepStrictEqual(all(done).filter((x) => x.tagName === "LI").map((l) => l.className), ["spi done", "spi done"]);
  strictEqual(part(done, "spx").textContent, "All done2 of 2");
});

test("bars draw a clamped progressbar each with its tone, and an unplaced or empty steps block its fallback", () => {
  const e = render({ type: "steps", id: "p", title: "Week 47", bars: [{ label: "Boiler", value: 130, tone: "ok", sub: "done Mon" }, { label: "Lights", value: 0 }] }, ctx());
  ok(part(e, "pgl").classList.contains("rows"));
  const [a, b] = all(e).filter((x) => x.getAttribute("role") === "progressbar");
  deepStrictEqual(
    ["class", "aria-valuenow", "aria-label", "aria-valuetext"].map((k) => a.getAttribute(k)),
    ["pgr ok", "100", "Boiler", "100%, done Mon"],
  );
  strictEqual(part(a, "pgv").textContent, "100%");
  strictEqual(part(a, "pgt").getAttribute("style"), "--v:100");
  deepStrictEqual([b.className, b.getAttribute("aria-valuetext")], ["pgr zero", null]);
  ok(!part(render({ type: "steps", id: "p", bars: [{ label: "Fire", value: 62 }] }, ctx()), "pgl").classList.contains("rows"));
  for (const x of [{ steps: [] }, { bars: [] }, {}, { steps: [{ id: "a", label: "Stop" }] }, { steps: [{ id: "a", label: "Stop" }], current: "z" }]) {
    const f = render({ type: "steps", id: "e", fallback: { title: "No steps yet" }, ...x }, ctx());
    ok(f.hasAttribute("data-fallback"), JSON.stringify(x));
    strictEqual(part(f, "b-row__title")?.textContent, "No steps yet");
  }
});
