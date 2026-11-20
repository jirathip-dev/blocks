import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { all, ctx, fixture, part, render } from "../kit.ts";

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
