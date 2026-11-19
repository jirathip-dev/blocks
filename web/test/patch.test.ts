import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { apply, patcher } from "../src/patch.ts";

class El {
  attrs = new Map();
  classList = new Set();
  addEventListener() {}
  removeEventListener() {}
  children = [];
  parentElement = null;
  text = "";
  getAttribute(k) {
    return this.attrs.get(k) ?? null;
  }
  hasAttribute(k) {
    return this.attrs.has(k);
  }
  querySelector() {
    return null;
  }
  get nextElementSibling() {
    const p = this.parentElement;
    return p ? (p.children[p.children.indexOf(this) + 1] ?? null) : null;
  }
  remove() {
    const p = this.parentElement;
    if (p) p.children.splice(p.children.indexOf(this), 1);
    this.parentElement = null;
  }
  insertBefore(n, ref) {
    n.remove();
    const i = ref ? this.children.indexOf(ref) : this.children.length;
    this.children.splice(i, 0, n);
    n.parentElement = this;
  }
  replaceWith(n) {
    const p = this.parentElement;
    const ref = this.nextElementSibling;
    this.remove();
    p.insertBefore(n, ref);
  }
  replaceChildren(...ns) {
    [...this.children].forEach((c) => c.remove());
    ns.forEach((n) => this.insertBefore(n, null));
  }
}

const frames = [];
globalThis.requestAnimationFrame = (f) => frames.push(f);
const frame = () => frames.splice(0).forEach((f) => f());

let draws = 0;
const draw = (b) => {
  draws++;
  const el = new El();
  el.attrs.set("data-id", b.id);
  el.text = b.title ?? "";
  const kids = b.rows ?? b.blocks;
  if (kids) {
    const box = new El();
    box.attrs.set("data-kids", "");
    kids.forEach((k) => box.insertBefore(draw(k), null));
    el.insertBefore(box, null);
  }
  return el;
};
const row = (id, title) => ({ type: "row", id, title });
const screen = (...rows) => ({ type: "screen", id: "s", title: "Q", blocks: [{ type: "list", id: "l", rows }] });
const ids = (root) => root.children[0].children[0].children[0].children[0].children.map((c) => `${c.getAttribute("data-id")}:${c.text}`);

function view(first) {
  let model = first;
  const root = new El();
  root.replaceChildren(draw(model));
  let saved = 0;
  const p = patcher({ root, model: () => model, draw, saved: () => saved++ });
  const send = (ops) => {
    model = apply(model, ops);
    p.queue(ops);
  };
  return { root, p, send, saved: () => saved };
}

test("apply follows the crate: before, else after, else the end; a move; an unknown op is undefined", () => {
  const s = screen(row("a", "A"), row("b", "B"));
  const out = apply(s, [
    { op: "insert", into: "l", after: "a", block: row("c", "C") },
    { op: "insert", into: "l", before: "a", block: row("d", "D") },
    { op: "move", id: "b", into: "l", before: "d" },
    { op: "merge", id: "a", fields: { title: "A2", subtitle: null } },
    { op: "remove", id: "c" },
  ]);
  deepStrictEqual(out, screen(row("b", "B"), row("d", "D"), row("a", "A2")));
  deepStrictEqual(s, screen(row("a", "A"), row("b", "B")));
  strictEqual(apply(s, [{ op: "fold", id: "l" }]), undefined);
  strictEqual(apply(s, [{ op: "remove", id: "zz" }]), undefined);
});

test("the patcher draws every op queued within one frame in one pass on that frame, touching only the nodes they name", () => {
  const v = view(screen(row("a", "A"), row("b", "B"), row("c", "C")));
  const [, b] = v.root.children[0].children[0].children[0].children[0].children;
  v.send([{ op: "merge", id: "a", fields: { title: "A2" } }]);
  v.send([{ op: "move", id: "c", into: "l", before: "a" }]);
  v.send([{ op: "insert", into: "l", after: "b", block: row("d", "D") }]);
  strictEqual(frames.length, 1);
  deepStrictEqual(ids(v.root), ["a:A", "b:B", "c:C"]);
  frame();
  deepStrictEqual(ids(v.root), ["c:C", "a:A2", "b:B", "d:D"]);
  strictEqual(v.root.children[0].children[0].children[0].children[0].children[2], b);
  strictEqual(v.saved(), 1);

  v.send([{ op: "remove", id: "c" }]);
  frame();
  deepStrictEqual(ids(v.root), ["a:A2", "b:B", "d:D"]);
  strictEqual(v.saved(), 2);

  v.send([{ op: "remove", id: "d" }]);
  v.p.flush();
  deepStrictEqual(ids(v.root), ["a:A2", "b:B"]);
  v.send([{ op: "remove", id: "b" }]);
  v.p.drop();
  frame();
  deepStrictEqual(ids(v.root), ["a:A2", "b:B"]);
});

test("over 500 queued ops the patcher redraws the view once from the model", () => {
  const v = view(screen(row("a", "A")));
  for (let i = 0; i < 501; i++) v.send([{ op: "merge", id: "a", fields: { title: `A${i}` } }]);
  const before = draws;
  frame();
  deepStrictEqual(ids(v.root), ["a:A500"]);
  strictEqual(draws - before, 3);
});
