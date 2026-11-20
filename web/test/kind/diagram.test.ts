import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { ctx, part, render } from "../kit.ts";

const flow = (counts) => ({
  type: "diagram",
  id: "issues",
  title: "Issue workflow",
  selected: "impl",
  source: [
    "stateDiagram-v2",
    "[*] --> queued",
    "queued --> design",
    "design --> design_review",
    "design_review --> impl",
    "queued --> impl",
    "impl --> review",
    "review --> fix",
    "fix --> review",
    "review --> verify",
    "verify --> ready",
    "review --> ready",
    "ready --> merged",
    "merged --> [*]",
    "impl --> stall",
    "blocked --> impl",
    "review --> rounds",
    "fix --> needs_human",
    'state "design review" as design_review',
    'state "needs human" as needs_human',
  ].join("\n"),
  counts,
  nodes: {
    impl: { state: "working", tap: { open: "impl" } },
    review: { state: "working", tap: { open: "review" } },
    stall: { limit: "stall_minutes", label: "stall", value: "20 min" },
    rounds: { limit: "review_rounds", label: "review rounds", value: "3" },
  },
});
const maps = (e) => e.children.filter((m) => m.classList.contains("dgm"));
const boxes = (m) => Object.fromEntries(m.children.filter((n) => n.classList.contains("dgn")).map((n) => [n.title, n]));

test("a diagram lays out its spine, side columns and timers in a wide and a phone map", () => {
  const e = render(flow({ queued: 4, impl: 2, review: 1 }), ctx());
  ok(!e.hasAttribute("data-fallback"));
  deepStrictEqual([e.getAttribute("role"), e.getAttribute("aria-label")], ["group", "Issue workflow"]);
  const [wide, phone] = maps(e);
  deepStrictEqual([wide.className, wide.style.cssText], ["dgm wide", "width:588px;height:632px"]);
  deepStrictEqual([phone.className, phone.style.cssText.split(";")[0]], ["dgm phone", "width:354px"]);
  const n = boxes(wide);
  strictEqual(n.impl.style.cssText, "left:214px;top:262px;width:176px;height:54px");
  strictEqual(n.merged.style.cssText, "left:214px;top:566px;width:176px;height:54px");
  strictEqual(n.fix.style.cssText, "left:430px;top:338px;width:140px;height:54px");
  strictEqual(n.blocked.style.cssText, "left:430px;top:262px;width:140px;height:54px");
  strictEqual(n["needs human"].style.cssText, "left:430px;top:414px;width:140px;height:54px");
  strictEqual(n.stall.style.cssText, "left:18px;top:262px;width:156px;height:54px");
  strictEqual(n["review rounds"].style.cssText, "left:18px;top:338px;width:156px;height:54px");
  deepStrictEqual(
    Object.keys(n).filter((k) => n[k].textContent.endsWith("optional")),
    ["design", "design review", "verify"],
  );
  strictEqual(n.stall.className, "dgn timer");
  strictEqual(n.stall.getAttribute("aria-label"), "stall 20 min, opens its setting");
  strictEqual(n.impl.className, "dgn working picked tap");
  strictEqual(n.blocked.className, "dgn idle zero");
  const svg = wide.children[0];
  const paths = svg.children.filter((p) => p.tagName === "PATH");
  strictEqual(paths.filter((p) => p.getAttribute("class") === "dge").length, 11);
  strictEqual(paths.filter((p) => p.getAttribute("class") === "dge timer").length, 2);
  strictEqual(paths.filter((p) => p.getAttribute("class") === "dgh").length, 13);
});

test("a diagram node with a tap opens it, and a changed count says what it was until counts change again", () => {
  const taps = [];
  const c = ctx({ tap: (t) => taps.push(t) });
  render(flow({ review: 2 }), c);
  const changed = boxes(maps(render(flow({ review: 1 }), c))[0]);
  strictEqual(changed.review.className, "dgn working moved tap");
  strictEqual(changed.review.textContent, "review1was 2");
  strictEqual(boxes(maps(render(flow({ review: 1 }), c))[0]).review.textContent, "review1was 2");
  const again = boxes(maps(render(flow({ review: 1, impl: 3 }), c))[0]);
  strictEqual(again.review.textContent, "review1");
  strictEqual(again.impl.textContent, "impl3");
  again.review.onclick();
  deepStrictEqual(taps, [{ open: "review" }]);
});

test("a diagram whose source has no state draws its fallback", () => {
  const e = render({ type: "diagram", id: "x", source: "graph TD; a-->b", fallback: { title: "Flow" } }, ctx());
  ok(e.hasAttribute("data-fallback"));
  strictEqual(part(e, "b-row__title")?.textContent, "Flow");
});
