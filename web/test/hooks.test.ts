import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { mock, test } from "node:test";
import { all, ctx, dir, fixture, part, render, rounds } from "./kit.ts";

const { css, packs } = await import("../src/theme.ts");
const { defaultPair } = await import("../src/gen/schemes.ts");

const gaps = ["island"];

test("every fixture is drawn with its hooks, natively or as its fallback", () => {
  const kinds = readdirSync(dir).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 57);
  for (const kind of kinds) {
    const b = fixture(kind);
    const e = render(b, ctx());
    ok(e, kind);
    ok(e.classList.contains("b") && e.classList.contains(`b-${b.type}`), `${kind}: ${e.className}`);
    strictEqual(e.dataset.block, b.type);
    strictEqual(e.dataset.id, b.id);
    strictEqual(e.hasAttribute("data-fallback"), gaps.includes(b.type), kind);
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
  const b = { type: "island", id: "flow", fallback: { title: "Flow", subtitle: "2 nodes" }, blocks: [fixture("text")] };
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

test("an element whose tap sends an action carries it as data-action; a link or a sheet does not", () => {
  const row = (tap) => render({ type: "row", id: "r", title: "t", tap }, ctx()).dataset.action;
  deepStrictEqual([row({ action: "see" }), row({ url: "https://x.test" }), row({ sheet: "s", action: "x" })], ["see", undefined, undefined]);
  const s = render({ type: "scene", id: "s", lanes: [{ id: "a", title: "a", state: "idle", tap: { action: "go" } }] }, ctx());
  strictEqual(part(s, "ln").dataset.action, "go");
  const links = part(part(render(rounds(), ctx()), "rdb"), "rdk").children;
  deepStrictEqual(links.map((x) => x.dataset.action), ["approve", undefined]);
  const rds = [{ id: "a", name: "impl", state: "done", tap: { action: "see" } }, { id: "b", name: "rev", state: "needs" }];
  strictEqual(part(render({ type: "row", id: "x", title: "t", rounds: rds }, ctx()), "rdl").dataset.action, "see");
});

test("a link that is not http, https, mailto or relative is dropped and its text drawn", async () => {
  const f = JSON.parse(readFileSync(new URL("../../fixtures/links/screen.json", import.meta.url), "utf8"));
  const e = render(f.screen, ctx());
  const hrefs = all(e).filter((x) => x.tagName === "A").map((a) => a.href);
  deepStrictEqual(hrefs, ["https://example.org/a", "mailto:ops@example.org", "/docs", "/about"]);
  for (const t of f.texts) ok(e.textContent.includes(t), t);
  const { linkable } = await import("../src/render/act.ts");
  for (const u of f.safe) strictEqual(linkable(u), true, u);
  for (const u of f.unsafe) strictEqual(linkable(u), false, u);
});

test("a labelled time gives fixtures/times/labels.json's text at its clock, and a card draws one in its badge, meta, row and tile", async () => {
  const { value } = await import("../src/core/text.ts");
  const f = JSON.parse(readFileSync(new URL("../../fixtures/times/labels.json", import.meta.url), "utf8"));
  mock.timers.enable({ apis: ["Date"], now: Date.parse(f.now) });
  try {
    for (const c of f.cases) strictEqual(value(c.value), c.want, JSON.stringify(c.value));
    const e = render(fixture("card"), ctx());
    deepStrictEqual(
      ["b-card__badge", "m", "b-row__subtitle", "b-row__value", "b-stat__value"].map((k) => part(e, k).textContent),
      ["lapses in 13m", "as of 5m ago", "decides in 13m", "5m ago", "5m"],
    );
  } finally {
    mock.timers.reset();
  }
});
