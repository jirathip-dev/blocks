import { deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import { install } from "./dom.ts";

install();
const g = globalThis;
const assigned = [];
const answers = [];
const sources = [];
class Source {
  on = new Map();
  constructor() {
    sources.push(this);
  }
  addEventListener(t, f) {
    this.on.set(t, f);
  }
  emit(t, data) {
    this.on.get(t)?.({ data: JSON.stringify(data) });
  }
  close() {}
}
g.EventSource = Source;
g.fetch = async () => ({ ok: true, status: 200, json: async () => answers.shift() ?? {} });
g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
g.location = { pathname: "/home", assign: (u) => assigned.push(u) };
g.requestAnimationFrame = (f) => f();
document.head = document.createElement("head");
document.addEventListener = () => {};
const data = document.createElement("script");
data.textContent = JSON.stringify({ type: "screen", blocks: [] });
data.dataset.stream = "http://app.test/stream";
data.dataset.action = "http://app.test/action";
const main = document.createElement("main");
document.getElementById = (id) => (id === "blocks-screen" ? data : null);
document.querySelector = (s) => (s === "main" ? main : null);

const { adopt } = await import("../src/shell.ts");
const tick = () => new Promise((r) => setTimeout(r, 5));
const all = (e) => [e, ...e.children.flatMap(all)];
const button = (id) => all(main).find((x) => x.dataset.id === id && x.dataset.block);

test("an adopted page opens a tap's or an answer's relative link and never a javascript: one", async () => {
  adopt();
  const btn = (id, more) => ({ type: "button", id, label: id, ...more });
  const screen = { type: "screen", id: "home", blocks: [btn("ok", { tap: { open: "/next" } }), btn("bad", { tap: { open: "javascript:alert(1)" } }), btn("go", { action: "go" })] };
  answers.push({ keys: [{ k: "/home", rev: 1, screen }] });
  sources[0].emit("hello", { v: 1, sid: "s1", epoch: "e1", keys: 16 });
  await tick();
  button("ok").onclick();
  button("bad").onclick();
  answers.push({ open: " javascript:alert(2)" });
  button("go").onclick();
  await tick();
  deepStrictEqual(assigned, ["/next"]);
});
