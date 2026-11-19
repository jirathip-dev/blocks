import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { ctx, fixture, part, render, rounds } from "../kit.ts";

test("a row whose last round needs you is open by itself: each round on the rail, the last with its body, the subtitle left out", () => {
  const taps = [];
  const e = render(rounds(), ctx({ tap: (t) => taps.push(t) }));
  deepStrictEqual([e.className, e.dataset.block, e.dataset.id], ["rr open b b-row", "row", "i23"]);
  const [r, ol] = e.children;
  deepStrictEqual([r.className, r.getAttribute("role"), r.getAttribute("aria-expanded"), part(r, "b-row__subtitle"), r.children.at(-1).textContent], ["row tap", "button", "true", undefined, "›"]);
  deepStrictEqual(ol.children.map((x) => [x.className, x.children[0].getAttribute("aria-label")]), [
    ["rd done", "done"],
    ["rd fail", "fail"],
    ["rd merged", "merged"],
    ["rd needs now", "needs"],
  ]);
  const [a, b, d, now] = ol.children.map((x) => part(x, "rdl"));
  deepStrictEqual([a.tagName, a.className, a.getAttribute("role"), part(a, "rc")?.textContent], ["DIV", "rdl tap", "button", "›"]);
  a.onclick();
  a.onkeydown({ key: "Enter" });
  deepStrictEqual([b.tagName, b.href, b.getAttribute("role")], ["A", "https://x.test/v2", null]);
  deepStrictEqual([d.className, d.onclick, part(d, "rc")], ["rdl", undefined, undefined]);
  deepStrictEqual([now.className, now.onclick, part(now, "rc")], ["rdl", undefined, undefined]);
  deepStrictEqual(["rdn", "rdu"].map((c) => part(now, c).textContent), ["review 2", "one finding"]);
  const body = part(ol.children[3], "rdb");
  deepStrictEqual([part(body, "rdh").textContent, part(body, "rdo").children.map((x) => [x.className, x.textContent])], ["rev-23 · claude · mini", [["", "reading"], ["", "writing verdict"]]]);
  deepStrictEqual([part(body, "b-text").dataset.id, part(body, "b-text").textContent], ["why", "Fix it"]);
  const [ok1, diff] = part(body, "rdk").children;
  ok1.onclick();
  deepStrictEqual([diff.tagName, diff.href], ["A", "https://x.test/d"]);
  deepStrictEqual(taps, [{ open: "verdict-1" }, { open: "verdict-1" }, { action: "approve" }]);
  strictEqual(["rd done", "rd fail", "rd merged"].map((_, i) => part(ol.children[i], "rdb")).filter(Boolean).length, 0);
});

test("a working row is folded until tapped; the tap flips its fold in c.open and asks for a redraw, never its own tap", () => {
  const taps = [];
  const open = new Set();
  const c = ctx({ tap: (t) => taps.push(t), open });
  const e = render(rounds("working"), c);
  deepStrictEqual([e.className, e.children.length, e.children[0].getAttribute("aria-expanded"), part(e, "b-row__subtitle")?.textContent], ["rr b b-row", 1, "false", "review 3"]);
  e.children[0].onclick();
  deepStrictEqual([[...open], taps], [["i23"], []]);
  const o = render(rounds("working"), c);
  deepStrictEqual([o.className, o.children[0].getAttribute("aria-expanded")], ["rr open b b-row", "true"]);
  deepStrictEqual(part(o, "rdo").children.map((x) => [x.className, x.textContent]), [["", "reading"], ["live", "▍ writing verdict"]]);
  open.add("i23");
  strictEqual(render(rounds(), ctx({ open })).className, "rr b b-row");
});

test("a last round with no lane, blocks or links draws no body, and a row with no rounds is the row as before", () => {
  const b = rounds();
  b.rounds = [{ id: "r1", name: "impl", state: "needs" }];
  strictEqual(part(render(b, ctx()), "rdb"), undefined);
  for (const r of [undefined, []]) {
    const e = render({ ...fixture("row"), rounds: r }, ctx());
    deepStrictEqual([e.className, e.children.map((x) => x.className)], ["row b b-row", ["rm", "rv b-row__value"]]);
  }
});
