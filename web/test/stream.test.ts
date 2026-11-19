import { deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";
import { stream } from "../src/stream.ts";

const sources = [];
class FakeSource {
  url;
  closed = false;
  on = {};
  onerror;
  constructor(url) {
    this.url = url;
    sources.push(this);
  }
  addEventListener(type, f) {
    this.on[type] = f;
  }
  close() {
    this.closed = true;
  }
  emit(type, data) {
    this.on[type]({ data: JSON.stringify(data) });
  }
}
globalThis.EventSource = FakeSource;

const posts = [];
const replies = [];
globalThis.fetch = async (url, init) => {
  posts.push({ url, body: JSON.parse(init.body) });
  const r = replies.shift();
  return { ok: r.status === undefined, status: r.status ?? 200, json: async () => r };
};
const settle = () => new Promise((r) => setImmediate(r));
const frames = [];
globalThis.requestAnimationFrame = (f) => frames.push(f);
const frame = () => frames.splice(0).forEach((f) => f());

const row = (id, title) => ({ type: "row", id, title });
const screen = (...rows) => ({ type: "screen", id: "s", title: "Q", blocks: [{ type: "list", id: "l", rows }] });
const hello = (v = 1) => ({ v, sid: "x1", epoch: "e1", keys: 16 });

test("a stream opens on hello, syncs, patches, asks again on a gap, and parks on bye", async () => {
  const states = [];
  const seen = [];
  const s = stream({ url: "/stream", state: (x) => states.push(x) });
  s.open("/q", (screen, ops) => seen.push({ screen, ops }));
  const es = sources.at(-1);
  deepStrictEqual(es.url, "/stream?v=1");

  replies.push({ keys: [{ k: "/q", rev: 1, screen: screen(row("a", "A")) }] });
  es.emit("hello", hello());
  await settle();
  deepStrictEqual(posts.at(-1), { url: "/stream/x1", body: { open: [{ k: "/q" }], close: [] } });
  deepStrictEqual(seen.at(-1), { screen: screen(row("a", "A")), ops: undefined });
  deepStrictEqual(states.at(-1), "live");

  const merge = { op: "merge", id: "a", fields: { title: "A2" } };
  es.emit("message", { k: "/q", from: 1, rev: 2, ops: [merge] });
  frame();
  deepStrictEqual(seen.at(-1), { screen: screen(row("a", "A2")), ops: [merge] });
  es.emit("message", { k: "/q", from: 1, rev: 2, ops: [merge] });
  frame();
  deepStrictEqual(seen.length, 2);

  const ins = { op: "insert", into: "l", block: row("b", "B") };
  replies.push({ keys: [{ k: "/q", rev: 4, ops: [ins] }] });
  es.emit("message", { k: "/q", from: 3, rev: 4, ops: [] });
  frame();
  await settle();
  deepStrictEqual(posts.at(-1).body, { open: [{ k: "/q", rev: 2 }], close: [] });
  deepStrictEqual(seen.at(-1), { screen: screen(row("a", "A2"), row("b", "B")), ops: [ins] });

  es.emit("bye", { why: "handover" });
  deepStrictEqual([es.closed, sources.length], [true, 2]);
  replies.push({ status: 404 });
  sources.at(-1).emit("hello", hello());
  await settle();
  deepStrictEqual(sources.length, 3);
  sources.at(-1).emit("bye", { why: "evicted" });
  deepStrictEqual(states.at(-1), "parked");

  const es4 = sources.at(-1);
  replies.push({ keys: [{ k: "/r", rev: 1, screen: screen() }] });
  s.open("/r", () => {});
  es4.emit("hello", hello());
  await settle();
  replies.push({ keys: [] });
  s.close("/q");
  await settle();
  deepStrictEqual(posts.at(-1).body, { open: [], close: ["/q"] });
  const n = posts.length;
  s.close("/r");
  await settle();
  deepStrictEqual([posts.length, es4.closed, states.at(-1)], [n, true, "off"]);
});

test("every frame that arrives within one animation frame reaches the view in one call with all their ops", async () => {
  const seen = [];
  const s = stream({ url: "/burst" });
  s.open("/q", (screen, ops) => seen.push({ screen, ops }));
  const es = sources.at(-1);
  replies.push({ keys: [{ k: "/q", rev: 1, screen: screen(row("a", "A")) }] });
  es.emit("hello", hello());
  await settle();
  seen.length = 0;
  const ops = [1, 2, 3].map((i) => ({ op: "insert", into: "l", block: row(`b${i}`, "B") }));
  ops.forEach((op, i) => es.emit("message", { k: "/q", from: i + 1, rev: i + 2, ops: [op] }));
  deepStrictEqual([seen.length, frames.length], [0, 1]);
  frame();
  deepStrictEqual(seen, [{ screen: screen(row("a", "A"), row("b1", "B"), row("b2", "B"), row("b3", "B")), ops }]);
  es.emit("message", { k: "/q", from: 4, rev: 5, ops: [ops[0]] });
  es.emit("message", { k: "/q", rev: 6, screen: screen() });
  frame();
  deepStrictEqual(seen.at(-1), { screen: screen(), ops: undefined });
  s.close("/q");
});

test("a hello more than one version away parks the stream with no sync", async () => {
  const states = [];
  const s = stream({ url: "/stream?d=1", state: (x) => states.push(x) });
  s.open("/q", () => {});
  const es = sources.at(-1);
  deepStrictEqual(es.url, "/stream?d=1&v=1");
  const before = posts.length;
  es.emit("hello", hello(2));
  await settle();
  deepStrictEqual([es.closed, states.at(-1), posts.length], [true, "parked", before]);
});
