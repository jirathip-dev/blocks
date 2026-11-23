import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mock, test } from "node:test";
import { fileURLToPath } from "node:url";
import { all, ctx, part, render } from "../kit.ts";

const form = (more = {}, field = {}) => ({ type: "form", id: "find", fields: [{ type: "search", name: "q", label: "Search", value: "ops", placeholder: "Search every app", ...field }], ...more });
const on = (e, type) => e.listeners.filter(([t]) => t === type).map(([, f]) => f);
const settle = () => new Promise((r) => setImmediate(r));

test("a search in a live form sends only the newest text 250 ms after the last key, at once on Enter and on clear, and stays usable while the app answers", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const posts = [];
    const answers = [];
    const f = render(form({ action: "find" }), ctx({ act: (a) => (posts.push(a), new Promise((r) => answers.push(r))) }));
    const [i, box, n, clear] = [all(f).find((x) => x.tagName === "INPUT"), part(f, "sb"), part(f, "sbn"), part(f, "sbx")];
    deepStrictEqual([i.type, i.name, i.value, i.placeholder, clear.textContent, clear.hidden], ["search", "q", "ops", "Search every app", "clear", false]);
    ok(part(f, "fd").classList.contains("solo") && part(f, "fd").classList.contains("sr"));
    const type = (t) => ((i.value = t), on(i, "input").forEach((g) => g()));
    type("o");
    mock.timers.tick(200);
    type("op");
    mock.timers.tick(249);
    deepStrictEqual(posts, []);
    mock.timers.tick(1);
    deepStrictEqual(posts, [{ action: "find", block: "find", values: { q: "op" } }]);
    deepStrictEqual([box.getAttribute("aria-busy"), n.textContent, i.disabled ?? false], ["true", "searching", false]);
    type("ops");
    mock.timers.tick(250);
    strictEqual(posts.length, 1, "the newest text waits while the app answers the older one");
    type("opsx");
    on(i, "keydown").forEach((g) => g({ key: "Enter", preventDefault: () => {} }));
    strictEqual(posts.length, 1);
    answers[0](true);
    await settle();
    deepStrictEqual(posts.slice(1).map((p) => p.values), [{ q: "opsx" }], "once it answers, only the newest text goes, Enter's");
    strictEqual(box.getAttribute("aria-busy"), "true");
    mock.timers.tick(1000);
    strictEqual(posts.length, 2, "the wait Enter cut short sends nothing more");
    answers[1](true);
    await settle();
    deepStrictEqual([box.getAttribute("aria-busy"), n.textContent], [null, ""]);
    on(clear, "click").forEach((g) => g());
    deepStrictEqual([i.value, clear.hidden, posts.slice(2).map((p) => p.values)], ["", true, [{ q: "" }]], "clear empties the box and sends at once");
  } finally {
    mock.timers.reset();
  }
});

test("a search that filters, or in a form with a submit, sends nothing as it is typed", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const posts = [];
    const act = async (a) => (posts.push(a), true);
    for (const f of [render(form({ action: "find" }, { filters: "people" }), ctx({ act })), render(form({ submit: { action: "find", label: "go" } }), ctx({ act }))]) {
      const i = all(f).find((x) => x.tagName === "INPUT");
      i.value = "anong";
      on(i, "input").forEach((g) => g());
      mock.timers.tick(1000);
    }
    deepStrictEqual(posts, []);
  } finally {
    mock.timers.reset();
  }
});

const out = mkdtempSync(join(process.env.DROVER_SCRATCH_TARGET ?? tmpdir(), "search-"));
const blocks = fileURLToPath(new URL("../../../fixtures/blocks/", import.meta.url));
const picks = (name, steps, adapter, screen) => {
  const [file, script] = [join(out, `${name}.json`), join(out, `${name}-steps.json`)];
  writeFileSync(file, JSON.stringify(screen));
  writeFileSync(script, JSON.stringify(steps));
  const r = spawnSync(process.execPath, ["--no-warnings", fileURLToPath(new URL("../../shot/cli.ts", import.meta.url)), "--screen", file, "--script", script, "--adapter", adapter, "--out", join(out, `${name}-${adapter}`)], { encoding: "utf8" });
  const read = (f) => JSON.parse(readFileSync(join(out, `${name}-${adapter}`, f), "utf8"));
  return { r, report: read("report.json"), text: (n) => read(`${n}.tree.json`).children[0].text };
};

test("a search in a live form sends only the newest text 250 ms after the last key, at once on Enter and on clear, in HTML and React", () => {
  const hub = JSON.parse(readFileSync(join(blocks, "screen-hub.json"), "utf8"));
  const keys = [{ type: { id: "find", text: "o" } }, { wait: { ms: 100 } }, { type: { id: "find", text: "op" } }, { wait: { ms: 249 } }];
  const rest = [{ wait: { ms: 1 } }, { type: { id: "find", text: "ops bkk", enter: true } }, { wait: { ms: 1000 } }, { tap: { id: "find" } }, { shot: { name: "cleared" } }];
  const sent = (q) => ({ screen: "hub", action: "find", block: "find", values: { q } });
  for (const adapter of ["html", "react"]) {
    const early = picks("typing", keys, adapter, hub);
    strictEqual(early.r.status, 0, `${adapter}: ${early.r.stderr}`);
    deepStrictEqual(early.report.sent, [], `${adapter}: 249 ms after the last key nothing has gone`);
    const { r, report } = picks("typed", [...keys, ...rest], adapter, hub);
    strictEqual(r.status, 0, `${adapter}: ${r.stderr}`);
    deepStrictEqual(report.sent, [sent("op"), sent("ops bkk"), sent("")], `${adapter}: the newest text at 250 ms, Enter's at once and once, clear's at once`);
  }
});

test("a search with filters sends nothing and hides the rows of its list that miss every typed word, in HTML and React", () => {
  const people = [["p-1", "Anong Srisuk"], ["p-2", "Somchai Ops"], ["p-3", "Anong Chai"], ["p-4", "Niran Fleet"]].map(([id, title]) => ({ type: "row", id, title }));
  const admin = { type: "screen", id: "admin", blocks: [{ type: "form", id: "people-find", fields: [{ type: "search", name: "who", label: "Search people", value: "anong", filters: "people" }] }, { type: "list", id: "people", rows: people }] };
  const steps = [{ shot: { name: "start" } }, { type: { id: "people-find", text: "CHAI anong" } }, { shot: { name: "one" } }, { type: { id: "people-find", text: "hanoi" } }, { shot: { name: "none" } }];
  for (const adapter of ["html", "react"]) {
    const { r, report, text } = picks("filters", steps, adapter, admin);
    strictEqual(r.status, 0, `${adapter}: ${r.stderr}`);
    const tree = (n) => JSON.parse(readFileSync(join(out, `filters-${adapter}`, `${n}.tree.json`), "utf8")).children[1];
    const list = (n) => [...tree(n).children.filter((c) => c.rect[2] > 0).map((c) => c.text), tree(n).text.includes("No rows match") ? tree(n).text : ""].join(" | ");
    ok(text("start").includes("2 of 4") && list("start").includes("Anong Srisuk") && list("start").includes("Anong Chai") && !list("start").includes("Somchai"), `${adapter}: ${text("start")} | ${list("start")}`);
    ok(text("one").includes("1 of 4") && list("one").includes("Anong Chai") && !list("one").includes("Srisuk"), `${adapter}: ${text("one")} | ${list("one")}`);
    ok(text("none").includes("no match") && list("none").includes("No rows match “hanoi”."), `${adapter}: ${text("none")} | ${list("none")}`);
    deepStrictEqual(report.sent, [], adapter);
  }
});

test("a search with filters drives a table's own filter, its count and its no-match row, in HTML and React", () => {
  const rows = [["a", "Anong", "Ops"], ["b", "Somchai", "Ops"], ["c", "Niran", "Fleet"]].map(([id, who, team]) => ({ id, cells: { who, team } }));
  const columns = [{ id: "who", label: "Who" }, { id: "team", label: "Team" }];
  const screen = { type: "screen", id: "admin", blocks: [{ type: "form", id: "find", fields: [{ type: "search", name: "q", label: "Search people", filters: "people" }] }, { type: "table", id: "people", title: "People", filter: false, columns, rows }] };
  const steps = [{ type: { id: "find", text: "ops" } }, { shot: { name: "ops" } }, { type: { id: "find", text: "hanoi" } }, { shot: { name: "none" } }];
  for (const adapter of ["html", "react"]) {
    const { r, report } = picks("table-filters", steps, adapter, screen);
    strictEqual(r.status, 0, `${adapter}: ${r.stderr}`);
    const text = (n, i) => JSON.parse(readFileSync(join(out, `table-filters-${adapter}`, `${n}.tree.json`), "utf8")).children[i].text;
    ok(text("ops", 0).includes("2 of 3") && text("ops", 1).includes("Somchai") && !text("ops", 1).includes("Niran"), `${adapter}: ${text("ops", 0)} | ${text("ops", 1)}`);
    ok(text("none", 0).includes("no match") && text("none", 1).includes("No rows match “hanoi”."), `${adapter}: ${text("none", 0)} | ${text("none", 1)}`);
    deepStrictEqual(report.sent, [], adapter);
  }
});
