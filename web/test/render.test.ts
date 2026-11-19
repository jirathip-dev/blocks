import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { install } from "./dom.ts";

install();
const { render } = await import("../src/render/index.ts");
const { css, packs, plain } = await import("../src/theme.ts");
const { defaultPair } = await import("../src/gen/schemes.ts");

const dir = new URL("../../fixtures/blocks/", import.meta.url);
const fixture = (kind) => JSON.parse(readFileSync(new URL(`${kind}.json`, dir), "utf8"));
const store = { get: () => null, put: () => {} };
const ctx = (more = {}) => ({ screen: "home", act: async () => true, tap: () => {}, open: new Set(), theme: plain, store, ...more });
const all = (e) => [e, ...e.children.flatMap(all)];
const part = (e, cls) => all(e).find((x) => x.classList.contains(cls));
const gaps = ["config", "secret", "web", "diff", "editor", "island"];

test("every fixture is drawn with its hooks, natively or as its fallback", () => {
  const kinds = readdirSync(dir).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 27);
  for (const kind of kinds) {
    const b = fixture(kind);
    const e = render(b, ctx());
    ok(e, kind);
    ok(e.classList.contains("b") && e.classList.contains(`b-${kind}`), `${kind}: ${e.className}`);
    strictEqual(e.dataset.block, kind);
    strictEqual(e.dataset.id, b.id);
    strictEqual(e.hasAttribute("data-fallback"), gaps.includes(kind), kind);
  }
});

test("parts carry their hook class and the block's own text", () => {
  const r = render(fixture("row"), ctx());
  deepStrictEqual(
    ["b-row__title", "b-row__subtitle", "b-row__value"].map((c) => part(r, c)?.textContent),
    ["Build", "green", "2m"],
  );
  const k = render(fixture("card"), ctx());
  strictEqual(part(k, "b-card__title")?.textContent, "q1");
  strictEqual(part(k, "b-card__subtitle")?.textContent, "waiting");
  strictEqual(k.dataset.variant, "ask");
  strictEqual(part(render(fixture("stat"), ctx()), "b-stat__value")?.textContent, "3");
  strictEqual(part(render(fixture("screen"), ctx()), "b-screen__title")?.textContent, "home");
  strictEqual(render({ type: "button", label: "Go", action: "go", style: "primary" }, ctx()).dataset.variant, "primary");
  strictEqual(render({ type: "card", title: "t", tone: "bad" }, ctx()).dataset.tone, "bad");
});

test("children of a container are drawn through render, with their hooks", () => {
  const s = render(fixture("section"), ctx());
  const t = all(s).find((x) => x.dataset.block === "text");
  strictEqual(t?.dataset.id, "today-note");
});

test("a gap draws its fallback as a row, then its children", () => {
  const b = { type: "editor", id: "flow", fallback: { title: "Flow", subtitle: "2 nodes" }, blocks: [fixture("text")] };
  const e = render(b, ctx());
  ok(e.hasAttribute("data-fallback"));
  strictEqual(part(e, "b-row__title")?.textContent, "Flow");
  strictEqual(part(e, "b-row__subtitle")?.textContent, "2 nodes");
  strictEqual(all(e).find((x) => x.dataset.block === "text")?.dataset.id, "note");
});

test("an app kind is the app's view when registered, else its fallback", () => {
  const b = { type: "herd", id: "h", fallback: { title: "Herd" } };
  const bare = render(b, ctx());
  deepStrictEqual(bare.className.split(" ").filter((c) => c.startsWith("b")), ["b", "b-app", "b-herd"]);
  ok(bare.hasAttribute("data-fallback"));
  strictEqual(part(bare, "b-row__title")?.textContent, "Herd");
  const own = render(b, ctx({ apps: { herd: () => document.createElement("div") } }));
  ok(!own.hasAttribute("data-fallback"));
  ok(own.classList.contains("b-app") && own.classList.contains("b-herd"));
});

test("a row's figure comes from the theme and carries its hook", () => {
  const r = render({ type: "row", id: "r", title: "impl", figure: { state: "needs" } }, ctx());
  const f = part(r, "b-row__figure");
  strictEqual(f?.getAttribute("aria-label"), "needs you");
  strictEqual(part(f, "gl")?.textContent, "!");
});

test("a pack's words dress the plain word; css writes a scheme's tokens", () => {
  const theme = JSON.parse(readFileSync(new URL("../../fixtures/packs/plain/theme.json", import.meta.url), "utf8"));
  const t = packs({ theme: { ...theme, sprites: false }, base: "/packs/plain/" });
  strictEqual(t.word("needs", "needs").textContent, "your turn · needs");
  strictEqual(t.word("nope", "plain").textContent, "plain");
  const s = css(defaultPair.dark);
  ok(s.startsWith(":root{--bg:#161616;") && s.endsWith(";color-scheme:dark}"), s);
});

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
