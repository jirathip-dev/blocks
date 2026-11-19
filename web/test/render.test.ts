import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { mock, test } from "node:test";
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
const gaps = ["diff", "island"];

test("every fixture is drawn with its hooks, natively or as its fallback", () => {
  const kinds = readdirSync(dir).map((f) => f.replace(/\.json$/, ""));
  strictEqual(kinds.length, 31);
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

test("a web block draws its page in a sandboxed frame at its height, with its address and an open link", () => {
  const e = render(fixture("web"), ctx());
  const f = e.querySelector("iframe");
  deepStrictEqual(
    ["src", "sandbox", "allow", "referrerpolicy", "loading", "title"].map((k) => f?.getAttribute(k)),
    ["http://blocks.test/doc", "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox", "", "no-referrer", "lazy", "/doc"],
  );
  strictEqual(f?.style.height, "240px");
  strictEqual(part(e, "wu")?.textContent, "/doc");
  const abs = render({ type: "web", src: "https://cooee.app/doc/?v=1#top", height: 9 }, ctx());
  strictEqual(part(abs, "wu")?.textContent, "cooee.app/doc");
  const a = e.querySelector("a");
  deepStrictEqual([a?.href, a?.target, a?.rel, a?.textContent], ["http://blocks.test/doc", "_blank", "noopener", "open ↗"]);
});

test("a web block whose src is not http or https draws a muted box at its height, with no frame or link", () => {
  for (const src of ["javascript:alert(1)", "java\tscript:alert(1)", " \u0001JavaScript:x", "data:text/html,x", "http://["]) {
    const e = render({ type: "web", id: "x", src, height: 120 }, ctx());
    strictEqual(e.querySelector("iframe"), null, src);
    strictEqual(e.querySelector("a"), null, src);
    strictEqual(part(e, "none")?.textContent, "This page can't be shown here.");
    strictEqual(part(e, "none")?.style.height, "120px");
  }
});

test("a redraw of a web block with the same src keeps its frame; a new src replaces it", async () => {
  const { apply, patcher } = await import("../src/patch.ts");
  let model = { type: "screen", id: "s", title: "Q", blocks: [{ ...fixture("web"), show: null }] };
  const root = document.createElement("div");
  const draw = (b) => render(b, ctx());
  root.replaceChildren(draw(model));
  globalThis.requestAnimationFrame = () => 0;
  const p = patcher({ root, model: () => model, draw });
  const send = (fields) => {
    const ops = [{ op: "merge", id: "doc", fields }];
    model = apply(model, ops);
    p.queue(ops);
    p.flush();
    return root.querySelector("iframe");
  };
  const f = root.querySelector("iframe");
  ok(f);
  strictEqual(send({ show: null }), f);
  const g = send({ src: "https://example.com/x" });
  ok(g !== f);
  strictEqual(g?.getAttribute("src"), "https://example.com/x");
});

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

const settings = (more = {}) => ({
  type: "config",
  id: "edgar",
  fields: [
    { type: "text", name: "agent", label: "User agent", value: "cooee", doc: "sent to SEC" },
    { type: "text", name: "base", value: "https://x.test", keyboard: "url", was: "https://www.sec.gov" },
    { type: "text", name: "every", value: 4.5, keyboard: "number", error: "must be under 4", doc: "minutes" },
    { type: "toggle", name: "on", label: "On", value: true },
    { type: "picker", name: "form", value: "8-K", options: ["10-K", "10-Q"] },
    { type: "secret", name: "key", set: true, value: "hidden" },
    { type: "secret", name: "token", placeholder: "paste a token" },
    { type: "secret", name: "pin", open: true },
  ],
  ...more,
});
const rows = (e) => e.children.filter((x) => x.classList.contains("fd"));
const ctl = (r) => r.querySelector("input, select");
const later = () => new Promise((r) => setImmediate(r));

test("a config draws every field as a settings row: name, one note, its control", () => {
  const e = render(settings(), ctx());
  deepStrictEqual([e.className, e.dataset.block, e.dataset.id], ["form cfg b b-config", "config", "edgar"]);
  const r = rows(e);
  deepStrictEqual(
    r.map((x) => x.className),
    ["fd", "fd", "fd err", "fd tg", "fd", "fd", "fd", "fd open"],
  );
  deepStrictEqual(
    r.map((x) => [part(x, "fk").textContent, part(x, "fn").className, part(x, "fn").textContent]),
    [
      ["User agent", "fn", "sent to SEC"],
      ["base", "fn was", "was https://www.sec.gov"],
      ["every", "fn err", "must be under 4"],
      ["On", "fn", ""],
      ["form", "fn", ""],
      ["key", "fn", ""],
      ["token", "fn", ""],
      ["pin", "fn", ""],
    ],
  );
  const c = r.map(ctl);
  deepStrictEqual(
    c.map((i) => [i.tagName, i.name, i.type, i.value, i.placeholder, i.inputMode]),
    [
      ["INPUT", "agent", "text", "cooee", "", undefined],
      ["INPUT", "base", "url", "https://x.test", "", "url"],
      ["INPUT", "every", "text", "4.5", "", "decimal"],
      ["INPUT", "on", "checkbox", undefined, undefined, undefined],
      ["SELECT", "form", undefined, undefined, undefined, undefined],
      ["INPUT", "key", "password", "", "set ✓ · type to replace", undefined],
      ["INPUT", "token", "password", "", "paste a token", undefined],
      ["INPUT", "pin", "password", "", "not set", undefined],
    ],
  );
  strictEqual(c[2].getAttribute("aria-invalid"), "true");
  strictEqual(c[0].getAttribute("aria-invalid"), null);
  deepStrictEqual([c[3].checked, c[3].getAttribute("role")], [true, "switch"]);
  deepStrictEqual(c[4].children.map((o) => [o.value, o.selected]), [["8-K", true], ["10-K", false], ["10-Q", false]]);
  strictEqual(e.querySelector("button"), null);
});

test("a config's open field takes the focus once, when it is first drawn", async () => {
  const c = ctx({ screen: "focus" });
  let n = 0;
  for (let k = 0; k < 2; k++) ctl(rows(render(settings(), c))[7]).focus = () => n++;
  await later();
  strictEqual(n, 1);
});

test("a config with an action saves each change at once and says so, or that it was not saved", async () => {
  const sent = [];
  let ok = true;
  const c = ctx({ act: async (a) => (sent.push(a), ok) });
  const e = render(settings({ action: "save" }), c);
  const r = rows(e);
  const on = ctl(r[3]);
  on.checked = false;
  on.onchange();
  strictEqual(part(r[3], "fn").textContent, "saving…");
  await later();
  deepStrictEqual(sent, [{ action: "save", block: "edgar", values: { on: false } }]);
  deepStrictEqual([part(r[3], "fn").className, part(r[3], "fn").textContent], ["fn", ""]);
  ok = false;
  ctl(r[0]).value = "bot";
  ctl(r[0]).onchange();
  await later();
  deepStrictEqual(sent[1].values, { agent: "bot" });
  deepStrictEqual([part(r[0], "fn").className, part(r[0], "fn").textContent], ["fn err", "not saved"]);
  ctl(r[5]).onchange();
  await later();
  strictEqual(sent.length, 2);
  strictEqual(render(settings(), c).querySelector("input").onchange, undefined);
});

test("a config with a submit sends every field over its values from its button, never an empty secret", async () => {
  const sent = [];
  const c = ctx({ act: async (a, b) => (sent.push([a, b]), true) });
  const e = render(settings({ submit: { action: "store", label: "save", values: { app: "edgar" } } }), c);
  const go = e.querySelector("button");
  strictEqual(go.parentNode.className, "bar");
  strictEqual(go.hasAttribute("disabled"), false);
  ctl(rows(e)[6]).value = "t0k";
  ctl(rows(e)[4]).value = "10-K";
  go.onclick();
  await later();
  deepStrictEqual(sent[0][0], {
    action: "store",
    block: "edgar",
    values: { app: "edgar", agent: "cooee", base: "https://x.test", every: "4.5", on: true, form: "10-K", token: "t0k" },
  });
  strictEqual(sent[0][1], go);
  const off = render(settings({ submit: { action: "store", label: "save", off: true } }), c);
  strictEqual(off.querySelector("button").hasAttribute("disabled"), true);
});

test("a form sends on its own field rules whatever their names, and not while a check fails or nothing is typed", async () => {
  const sent = [];
  const c = ctx({ act: async (a) => (sent.push(a), true) });
  const qty = { type: "text", name: "qty", checks: [{ ok: { is: { pattern: "number", value: { get: "qty" } } }, say: "a number" }] };
  const order = { type: "form", id: "order", fields: [{ type: "text", name: "name" }, qty], submit: { label: "order", action: "order" } };
  const e = render(order, c);
  ctl(rows(e)[0]).value = "ada";
  ctl(rows(e)[1]).value = "many";
  e.querySelector("button").onclick();
  await later();
  deepStrictEqual(sent, []);
  ctl(rows(e)[1]).value = "3";
  e.querySelector("button").onclick();
  await later();
  deepStrictEqual(sent, [{ action: "order", block: "order", values: { name: "ada", qty: "3" } }]);
  const say = render({ type: "form", id: "say", fields: [{ type: "text", name: "text", value: "" }], submit: { label: "Send", action: "say" } }, c);
  say.querySelector("button").onclick();
  await later();
  strictEqual(sent.length, 1);
});

test("a secret draws its label, a masked field and a send line, and set says so with a replace hint", () => {
  const e = render(fixture("secret"), ctx());
  ok(!e.hasAttribute("data-fallback"));
  strictEqual(e.className, "secret b b-secret");
  const i = all(e).find((x) => x.tagName === "INPUT");
  deepStrictEqual([i.type, i.name, i.placeholder, i.autocomplete, i.spellcheck], ["password", "token", "", "new-password", false]);
  strictEqual(part(e, "fk").textContent, "API token");
  strictEqual(part(e, "sn").textContent, "sent to the app only, never to the agent");
  const s = render({ type: "secret", name: "GH", action: "a", set: true, placeholder: "ghp_…" }, ctx());
  strictEqual(part(s, "fk").textContent, "GHset ✓");
  strictEqual(all(s).find((x) => x.tagName === "INPUT").placeholder, "paste to replace");
});

test("a secret sends its value under its name, clears on success, keeps it on failure, and an empty one only focuses", async () => {
  const posts = [];
  let answer = true;
  const e = render({ type: "secret", id: "k", name: "API_KEY", action: "save", values: { app: "x" } }, ctx({ act: async (a) => (posts.push(a), answer) }));
  const i = all(e).find((x) => x.tagName === "INPUT");
  const go = all(e).find((x) => x.tagName === "BUTTON");
  let focused = 0;
  i.focus = () => focused++;
  go.onclick();
  deepStrictEqual([posts.length, focused], [0, 1]);
  i.value = "sk-1";
  go.onclick();
  strictEqual(go.textContent, "sending…");
  await new Promise((r) => setImmediate(r));
  deepStrictEqual(posts, [{ action: "save", block: "k", values: { app: "x", API_KEY: "sk-1" } }]);
  deepStrictEqual([i.value, go.textContent], ["", "send"]);
  answer = false;
  i.value = "sk-2";
  const enter = i.listeners.find(([t]) => t === "keydown")[1];
  enter({ key: "Enter", preventDefault: () => {} });
  await new Promise((r) => setImmediate(r));
  deepStrictEqual([posts.length, posts[1].values.API_KEY, i.value], [2, "sk-2", "sk-2"]);
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

const rounds = (last = "needs") => ({
  type: "row",
  id: "i23",
  title: "#23 diagram",
  subtitle: "review 3",
  tap: { open: "issue" },
  rounds: [
    { id: "r1", name: "impl", state: "done", summary: "pushed", tap: { open: "verdict-1" } },
    { id: "r2", name: "review 1", state: "fail", summary: "two findings", tap: { url: "https://x.test/v2" } },
    { id: "r3", name: "fix 1", state: "merged" },
    {
      id: "r4",
      name: "review 2",
      state: last,
      summary: "one finding",
      tap: { open: "never" },
      lane: { name: "rev-23", harness: "claude", host: "mini", lines: ["reading", "writing verdict"] },
      blocks: [{ type: "text", id: "why", markdown: "Fix it" }],
      links: [{ label: "approve", tap: { action: "approve" } }, { label: "diff", tap: { url: "https://x.test/d" } }],
    },
  ],
});

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

test("lines total in minor units as you type, work out a mul column, and turn the submit on once the entry balances", () => {
  const b = fixture("lines");
  const e = render(b, ctx({ screen: "lq1" }));
  const text = (cls) => all(e).filter((x) => x.classList.contains(cls)).map((x) => x.textContent);
  const go = () => all(e).find((x) => x.dataset.action === "post-journal");
  deepStrictEqual(text("lqb"), ["out of balance · credit short by 49.90"]);
  deepStrictEqual(text("lqw"), ["fix 1 line and balance the entry to post entry"]);
  ok(go().hasAttribute("disabled"));
  strictEqual(e.getAttribute("role"), "group");
  strictEqual(e.getAttribute("aria-label"), "journal lines");
  const credit = all(e).find((x) => x.getAttribute("aria-label") === "Credit, line 3");
  strictEqual(credit.value, "2,668.50");
  credit.value = "2,718.4";
  credit.oninput();
  deepStrictEqual(text("lqb"), ["balanced · debit = credit"]);
  deepStrictEqual(text("lqt"), ["totalDebit2,718.40Credit2,718.40"]);
  deepStrictEqual(text("lqw"), ["fix 1 line to post entry"]);
  const account = all(e).find((x) => x.getAttribute("aria-label") === "Account, line 2");
  strictEqual(account.getAttribute("aria-invalid"), "true");
  const inv = {
    type: "lines", id: "inv", name: "items", columns: [{ type: "text", name: "qty", keyboard: "number" }, { type: "text", name: "price", keyboard: "number" }, { type: "text", name: "amount" }],
    calc: { amount: { mul: [{ get: "qty" }, { get: "price" }] } }, sum: ["amount"], items: [{ id: "a", values: { qty: "2", price: "450" } }, { id: "b", values: { qty: "3", price: "0.1" } }],
  };
  const i = render(inv, ctx({ screen: "lq1" }));
  deepStrictEqual(all(i).filter((x) => x.classList.contains("lqv")).map((x) => x.textContent), ["900.00", "0.30"]);
  const qty = all(i).find((x) => x.getAttribute("aria-label") === "qty, line 2");
  qty.value = "1,000";
  qty.oninput();
  deepStrictEqual(all(i).filter((x) => x.classList.contains("lqv")).map((x) => x.textContent), ["900.00", "100.00"]);
  strictEqual(all(i).find((x) => x.classList.contains("lqt")).textContent, "totalamount1,000.00");
  strictEqual(all(i).some((x) => x.classList.contains("lqx")), false, "no add, no remove");
});

test("lines add a row at the end, remove one down to the minimum, and post the check 400ms after the last change", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const posts = [];
  const c = ctx({ screen: "lq2", act: async (a) => (posts.push(a), true) });
  const b = { ...fixture("lines"), max: 4 };
  const e = render(b, c);
  const rows = () => all(e).filter((x) => x.classList.contains("lqr")).map((x) => x.getAttribute("aria-label"));
  const add = all(e).find((x) => x.textContent === "add line" && x.tagName === "BUTTON");
  add.onclick();
  deepStrictEqual(rows(), ["line 1", "line 2", "line 3", "line 4"]);
  ok(all(e).find((x) => x.textContent === "add line" && x.tagName === "BUTTON").hasAttribute("disabled"), "at max");
  mock.timers.tick(399);
  strictEqual(posts.length, 0);
  const memo = all(e).find((x) => x.getAttribute("aria-label") === "Description, line 4");
  memo.value = "fees";
  memo.oninput();
  mock.timers.tick(400);
  strictEqual(posts.length, 1);
  strictEqual(posts[0].action, "check-journal");
  deepStrictEqual(posts[0].values.lines[3], { id: "new-4", values: { account: "", memo: "fees", debit: "", credit: "" } });
  all(e).find((x) => x.getAttribute("aria-label") === "remove line 1").onclick();
  all(e).find((x) => x.getAttribute("aria-label") === "remove line 1").onclick();
  deepStrictEqual(rows(), ["line 1", "line 2"]);
  ok(all(e).find((x) => x.getAttribute("aria-label") === "remove line 1").hasAttribute("disabled"), "at min");
  const again = render({ ...b, errors: [] }, c);
  deepStrictEqual(
    all(again).filter((x) => x.getAttribute("aria-label")?.startsWith("Description")).map((x) => x.value),
    ["landlord", "fees"],
    "a redraw with new errors keeps the draft",
  );
  mock.timers.reset();
});

test("lines with no rows say so and total zero", () => {
  const e = render({ ...fixture("lines"), items: [], errors: [] }, ctx({ screen: "lq3" }));
  strictEqual(all(e).find((x) => x.classList.contains("lqz")).textContent, "no lines yet");
  strictEqual(all(e).find((x) => x.classList.contains("lqt")).textContent, "totalDebit0.00Credit0.00");
});

test("a link that is not http, https, mailto or relative is dropped and its text drawn", async () => {
  const f = JSON.parse(readFileSync(new URL("../../fixtures/links/screen.json", import.meta.url), "utf8"));
  const e = render(f.screen, ctx());
  const hrefs = all(e).filter((x) => x.tagName === "A").map((a) => a.href);
  deepStrictEqual(hrefs, ["https://example.org/a", "mailto:ops@example.org", "/docs", "/about"]);
  for (const t of f.texts) ok(e.textContent.includes(t), t);
  const { linkable } = await import("../src/render/index.ts");
  for (const u of f.safe) strictEqual(linkable(u), true, u);
  for (const u of f.unsafe) strictEqual(linkable(u), false, u);
});
