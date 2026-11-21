import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { ctx, fixture, part, render } from "../kit.ts";

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
  const { patcher } = await import("../../src/patch.ts");
  const { apply } = await import("../../src/core/apply.ts");
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
