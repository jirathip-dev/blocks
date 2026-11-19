import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mock, test } from "node:test";
import { install } from "./dom.ts";

install();
mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
const { toasts } = await import("../src/toasts.ts");

const all = (e) => [e, ...e.children.flatMap(all)];
const part = (e, cls) => all(e).find((x) => x.classList.contains(cls));
const shown = (q) => q.box.children[0];
const text = (q) => (shown(q) ? part(shown(q), "tsx").textContent : null);
const on = (e, type) => e.listeners.find(([t]) => t === type)[1]();

test("a toast lasts by its tone: 4 s plain or ok, 6 s warn, 8 s with an undo, and bad until dismissed", () => {
  for (const [t, ms] of [
    [{ title: "Copied" }, 4000],
    [{ title: "Sent", tone: "ok" }, 4000],
    [{ title: "Offline", tone: "warn" }, 6000],
    [{ title: "Archived", tone: "ok", undo: { action: "unarchive" } }, 8000],
  ]) {
    const q = toasts();
    q.say(t, async () => true);
    mock.timers.tick(ms - 1000);
    strictEqual(text(q), t.title, `${t.title} at ${ms - 1000}`);
    mock.timers.tick(1000);
    strictEqual(shown(q), undefined, `${t.title} gone at ${ms}`);
  }
  const q = toasts();
  q.say({ title: "Declined", tone: "bad" });
  mock.timers.tick(60000);
  deepStrictEqual([text(q), shown(q).getAttribute("role"), part(shown(q), "tsk")], ["Declined", "alert", undefined]);
  part(shown(q), "tsc").onclick();
  strictEqual(shown(q), undefined);
});

test("the time-left line shrinks each second and the clock stops while the pointer or focus is on the toast", () => {
  const q = toasts();
  q.say({ title: "Sent", tone: "ok" });
  const e = shown(q);
  const line = part(e, "tsk");
  strictEqual(line.getAttribute("aria-hidden"), "true");
  mock.timers.tick(1000);
  strictEqual(line.children[0].getAttribute("style"), "--left:0.75");
  e.onpointerenter();
  mock.timers.tick(20000);
  strictEqual(shown(q), e);
  e.onpointerleave();
  on(e, "focusin");
  mock.timers.tick(20000);
  strictEqual(shown(q), e);
  on(e, "focusout");
  mock.timers.tick(3000);
  strictEqual(shown(q), undefined);
});

test("one shows at a time; at most 3 wait, a fourth drops the oldest that is not bad, and the next shows 160 ms after a close", () => {
  const q = toasts();
  q.say({ title: "a" });
  for (const t of [{ title: "b" }, { title: "c", tone: "bad" }, { title: "d" }, { title: "e" }]) q.say(t);
  const more = part(shown(q), "tsn");
  deepStrictEqual([text(q), more.textContent, more.getAttribute("aria-label")], ["a", "+3", "3 more"]);
  shown(q).onkeydown({ key: "Escape" });
  strictEqual(shown(q), undefined);
  mock.timers.tick(159);
  strictEqual(shown(q), undefined);
  mock.timers.tick(1);
  deepStrictEqual([text(q), part(shown(q), "tsn").textContent], ["c", "+2"]);
  part(shown(q), "tsc").onclick();
  mock.timers.tick(160);
  strictEqual(text(q), "d");
  q.say({ title: "undone" }, undefined, true);
  deepStrictEqual([text(q), part(shown(q), "tsn").textContent], ["undone", "+1"]);
  q.close();
});

test("undo sends once, reads undo… while it is out, closes when sent and stays when not; an empty toast reads Done", async () => {
  const q = toasts();
  const sent = [];
  let answer = false;
  q.say({ title: "Removed", undo: { label: "put back", action: "restore" } }, async (b) => (sent.push(b), answer));
  const e = shown(q);
  const undo = all(e).find((x) => x.tagName === "BUTTON" && x.textContent === "put back");
  ok(undo);
  const out = undo.onclick();
  strictEqual(undo.textContent, "put back…");
  await out;
  deepStrictEqual([sent, shown(q), undo.textContent], [[undo], e, "put back"]);
  answer = true;
  await undo.onclick();
  strictEqual(shown(q), undefined);
  q.say({ title: "" });
  deepStrictEqual([text(q), shown(q).getAttribute("aria-label")], ["Done", "Done"]);
  q.say({ title: "Copied", undo: { action: "x" } }, undefined, true);
  strictEqual(all(shown(q)).find((x) => x.tagName === "BUTTON" && x.textContent !== "×"), undefined, "no undo with nowhere to send it");
  q.close();
});
