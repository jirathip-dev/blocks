import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { ctx, part, render } from "../kit.ts";

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

test("each fixtures/fields form draws every field with its type's view, its words in the screen's language", () => {
  const at = new URL("../../../fixtures/fields/", import.meta.url);
  const want = { text: ["text", null], toggle: ["checkbox", "switch"], picker: [undefined, null], secret: ["password", null], upload: ["file", null] };
  for (const f of readdirSync(at).filter((n) => n.endsWith(".json"))) {
    const screen = JSON.parse(readFileSync(new URL(f, at), "utf8"));
    const form = screen.blocks[0];
    const r = rows(render(form, ctx({ locale: screen.locale })));
    deepStrictEqual(r.length, form.fields.length, f);
    for (const [i, x] of form.fields.entries()) {
      if (x.type === "scan") {
        deepStrictEqual([part(r[i], "fu").dataset.field, ctl(r[i])], [x.name, null], `${f} ${x.name}: the scanner holds the file input`);
        continue;
      }
      const name = x.type === "upload" ? part(r[i], "fu").dataset.field : ctl(r[i]).name;
      deepStrictEqual([name, ctl(r[i]).type, ctl(r[i]).getAttribute("role")], [x.name, ...want[x.type]], `${f} ${x.name}`);
    }
  }
  const secret = { type: "form", id: "keys", fields: [{ type: "secret", name: "key" }, { type: "text", name: "who", was: "Ada" }] };
  const th = rows(render(secret, ctx({ locale: { lang: "th" } })));
  deepStrictEqual([ctl(th[0]).placeholder, part(th[1], "fn").textContent], ["ยังไม่ได้ตั้ง", "เดิม Ada"]);
  deepStrictEqual(ctl(rows(render(secret, ctx()))[0]).placeholder, "not set");
});

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
