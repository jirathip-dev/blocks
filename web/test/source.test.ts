import { deepStrictEqual, ok, strictEqual, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { install } from "./dom.ts";

install();
const g = globalThis;
const requests = [];
class Source {
  on = new Map();
  constructor(url) {
    requests.push(url);
  }
  addEventListener(t, f) {
    this.on.set(t, f);
  }
  close() {}
}
g.EventSource = Source;
g.fetch = async (url) => (requests.push(url), { ok: true, status: 200, json: async () => ({ keys: [] }) });
g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
g.location = { hash: "" };
g.history = { replaceState() {} };
g.requestAnimationFrame = (f) => f();
g.setInterval = () => 0;
g.clearInterval = () => {};
document.head = document.createElement("head");

const { local, mount, Refused } = await import("../src/shell.ts");

const fixture = (name) => JSON.parse(readFileSync(new URL(`../../fixtures/client/${name}`, import.meta.url), "utf8"));
const first = fixture("screen.json");
const sent = fixture("send.json");
const at = (place) => ({ compact: place, wide: place });
const node = (id, source, path) => ({ type: "screen", id, source, path, label: id, place: at("strip"), transition: "push" });
const layout = (...main) => ({ format: 1, root: { type: "nav", id: "root", place: at("inline"), transition: "push", slots: { main } } });
const meterOnly = layout(node("meter", "meter", "/meter"));
const store = { get: () => null, put() {} };
const all = (e) => [e, ...e.children.flatMap(all)];
const find = (e, f) => all(e).find(f);
const byId = (e, id) => find(e, (x) => x.dataset.id === id && x.dataset.block);
const settled = () => new Promise((r) => setTimeout(r, 5));
const toast = (root) => find(root, (x) => x.classList.contains("tst"));
const said = (root) => find(toast(root), (x) => x.classList.contains("tsx"))?.textContent;

function fresh() {
  requests.length = 0;
  return document.createElement("div");
}

test("a local source draws its screen, patches an answer's ops in place, shows its toast and never asks a server", async () => {
  const root = fresh();
  const asked = [];
  const meter = local({ screen: () => first, act: (a, path) => (asked.push([a, path]), { ...sent.answer, toast: { title: "sent" } }) });
  const page = mount({ root, layout: meterOnly, sources: { meter }, store });
  await settled();
  const list = byId(root, "sends");
  ok(byId(root, "count").textContent.includes("0"));
  byId(root, "send").onclick();
  await settled();
  deepStrictEqual(asked, [[{ ...sent.action, values: {} }, "/meter"]]);
  ok(byId(root, "count").textContent.includes("1"));
  ok(byId(root, "send-0").textContent.includes("Send 0"));
  strictEqual(byId(root, "sends"), list, "patched in place, not redrawn");
  strictEqual(said(root), "sent");
  deepStrictEqual(requests, []);
  page.close();
});

test("pushed ops patch the open screen; ops that do not fit ask the app for the whole screen again", async () => {
  const root = fresh();
  let screens = 0;
  let now = first;
  const meter = local({ screen: () => (screens++, now), act: () => ({}) });
  const page = mount({ root, layout: meterOnly, sources: { meter }, store });
  await settled();
  const list = byId(root, "sends");
  meter.push("/meter", sent.answer.ops);
  ok(byId(root, "send-0"));
  strictEqual(byId(root, "sends"), list);
  now = { ...first, title: "again", blocks: [{ type: "row", id: "fresh", title: "whole" }] };
  meter.push("/meter", [{ op: "merge", id: "gone", fields: { title: "x" } }]);
  await settled();
  strictEqual(screens, 2);
  ok(byId(root, "fresh"));
  strictEqual(byId(root, "sends"), undefined);
  meter.push("/nowhere", sent.answer.ops);
  page.close();
  meter.push("/meter", sent.answer.ops);
  strictEqual(screens, 2);
});

test("an act that throws is a failed action: a Refused shows its own toast, any other error its message", async () => {
  const root = fresh();
  const errors = [new Refused({ title: "not now", tone: "warn" }), new Error("core broke")];
  const meter = local({
    screen: () => first,
    act: () => {
      throw errors.shift();
    },
  });
  const page = mount({ root, layout: meterOnly, sources: { meter }, store });
  await settled();
  byId(root, "send").onclick();
  await settled();
  deepStrictEqual([said(root), toast(root).className], ["not now", "tst warn"]);
  find(toast(root), (x) => x.getAttribute("aria-label") === "dismiss").onclick();
  byId(root, "send").onclick();
  await settled();
  deepStrictEqual([said(root), toast(root).className], ["core broke", "tst bad"]);
  ok(byId(root, "count").textContent.includes("0"));
  page.close();
});

test("one page mixes a local source with a served one; a source with neither fails by name", async () => {
  const root = fresh();
  const meter = local({ screen: () => first, act: () => ({}) });
  const url = (source, path) => `http://app.test/${source}${path}`;
  const page = mount({ root, layout: layout(node("meter", "meter", "/meter"), node("queue", "core", "/queue")), url, sources: { meter }, store });
  await settled();
  ok(byId(root, "send"));
  deepStrictEqual(requests, []);
  find(root, (x) => x.classList.contains("b-tab") && x.textContent === "queue").onclick();
  deepStrictEqual(requests, ["http://app.test/core/stream?v=2"]);
  page.close();
  throws(() => mount({ root: fresh(), layout: layout(node("queue", "core", "/queue")), sources: { meter }, store }), /"core" is not in sources/);
});
