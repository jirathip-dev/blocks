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
const gaps = ["config", "secret", "web", "diff", "editor", "scene", "diagram", "prose", "hero", "media", "nav", "island"];

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
  const b = { type: "diagram", id: "flow", source: "a-->b", fallback: { title: "Flow", subtitle: "2 nodes" }, blocks: [fixture("text")] };
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
  const theme = JSON.parse(readFileSync(new URL("../../theme/packs/farm/theme.json", import.meta.url), "utf8"));
  const t = packs({ theme: { ...theme, sprites: false }, base: "/packs/farm/" });
  strictEqual(t.word("needs", "needs").textContent, "at the gate · needs");
  strictEqual(t.word("nope", "plain").textContent, "plain");
  const s = css(defaultPair.dark);
  ok(s.startsWith(":root{--bg:#161616;") && s.endsWith(";color-scheme:dark}"), s);
});
