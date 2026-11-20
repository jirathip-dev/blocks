import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { all, ctx, fixture, render } from "../kit.ts";

const flush = async () => {
  for (let i = 0; i < 5; i++) await null;
};
const text = (e) => e.textContent.replace(/\s+/g, " ").trim();
const button = (e, label) => all(e).find((x) => x.tagName === "BUTTON" && (x.getAttribute("aria-label") === label || text(x) === label));

test("an attachment goes through the file handler and the action carries its id, name and src, never a data: URL", async () => {
  const handed = [];
  const sent = [];
  const c = ctx({
    screen: `s-${Math.random()}`,
    file: async (blob, about) => (handed.push({ name: blob.name, field: about.field, block: about.block }), { id: "f-1", src: "https://x.test/f-1.png" }),
    act: async (a) => (sent.push(a), true),
  });
  const e = render(fixture("composer"), c);
  const input = all(e).find((x) => x.tagName === "INPUT");
  input.files = [{ name: "shot.png", size: 2048, type: "image/png" }];
  input.onchange();
  await flush();
  deepStrictEqual(handed, [{ name: "shot.png", field: "files", block: "say" }]);
  strictEqual(all(e).find((x) => x.tagName === "IMG")?.src, "https://x.test/f-1.png");
  button(e, "send").onclick();
  await flush();
  strictEqual(sent.length, 1);
  deepStrictEqual(sent[0].values.files, [{ id: "f-1", name: "shot.png", src: "https://x.test/f-1.png" }]);
  ok(!JSON.stringify(sent[0]).includes("data:"), JSON.stringify(sent[0]));
  ok(!("data" in sent[0].values));
});

test("send waits while an attachment is still uploading, and without a file handler attach is off", async () => {
  const sent = [];
  const c = ctx({ screen: `s-${Math.random()}`, file: () => new Promise(() => {}), act: async (a) => (sent.push(a), true) });
  const e = render(fixture("composer"), c);
  const input = all(e).find((x) => x.tagName === "INPUT");
  input.files = [{ name: "a.pdf", size: 10, type: "application/pdf" }];
  input.onchange();
  await flush();
  button(e, "send").onclick();
  await flush();
  strictEqual(sent.length, 0);
  strictEqual(button(render(fixture("composer"), ctx({ screen: `s-${Math.random()}` })), "attach").disabled, true);
});
