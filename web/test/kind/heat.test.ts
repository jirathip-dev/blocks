import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { defaultPair } from "../../src/gen/schemes.ts";
import { css } from "../../src/theme.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const fixture = (name) => JSON.parse(read(`../../../fixtures/blocks/${name}.json`));
const page = (mode) =>
  `<!doctype html><meta charset=utf-8><link rel=stylesheet href=blocks.css><style>${css(defaultPair[mode])}</style>` +
  `<body><div id=root></div><script type=module>import * as B from "./blocks.js"; window.B = B;</script>`;

function boot(blocks) {
  const B = window.B;
  window.sent = [];
  const ctx = { screen: "s", act: async (a) => (window.sent.push(a), true), tap: () => {}, open: new Set(), theme: B.plain, store: { get: () => null, put: () => {} } };
  document.getElementById("root").replaceChildren(B.render({ type: "screen", id: "s", blocks }, ctx));
}

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

async function open(blocks, { width = 1440, mode = "light" } = {}) {
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  await p.route("**/*", (r) => {
    const at = r.request().url().slice(BASE.length);
    if (at === "") return r.fulfill({ body: page(mode), contentType: "text/html" });
    if (at === "blocks.js" || at === "blocks.css") return r.fulfill({ body: read(`../../dist/${at}`), contentType: at.endsWith(".css") ? "text/css" : "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await p.goto(BASE);
  await p.waitForFunction(() => window.B);
  await p.evaluate(boot, blocks);
  return p;
}

const readout = (p, id) => p.$eval(`[data-id="${id}"] .hmo`, (e) => e.textContent);

test("a tapped cell is picked, read under the title and sent with its row and column", async () => {
  const p = await open([fixture("heat")]);
  strictEqual(await readout(p, "load"), "Week 8 · Sat111 TSS");
  await p.click('button[aria-label^="Week 3, Wed:"]');
  deepStrictEqual(await p.evaluate(() => window.sent), [{ action: "training.day", block: "load", values: { row: "Week 3", column: "Wed" } }]);
  deepStrictEqual(await p.$$eval("[aria-pressed=true]", (b) => b.map((x) => x.getAttribute("aria-label"))), ["Week 3, Wed: 127 TSS"]);
  strictEqual(await p.$$eval("td.sel", (t) => t.length), 1);
  strictEqual(await readout(p, "load"), "Week 3 · Wed127 TSS");
  await p.keyboard.press("ArrowDown");
  strictEqual(await p.evaluate(() => document.activeElement.getAttribute("aria-label")), "Week 4, Wed: 44 TSS");
  strictEqual(await readout(p, "load"), "Week 4 · Wed44 TSS");
  await p.close();
});

test("with nothing picked the row under the title reads the peak; a sparse grid hatches its empty cells and keys No data", async () => {
  const p = await open([fixture("heat-rides"), fixture("heat-sleep")]);
  strictEqual(await readout(p, "rides"), "PeakMon · 185 rides");
  const rides = await p.$eval('[data-id="rides"]', (e) => ({
    empty: e.querySelectorAll("td.e").length,
    filled: e.querySelectorAll("td[class^=s]").length,
    edges: [...e.querySelectorAll(".rx span")].map((s) => s.textContent),
    key: e.querySelector(".nd")?.textContent,
  }));
  deepStrictEqual(rides, { empty: 26, filled: 9, edges: ["0", "5"], key: "No data" });
  const sleep = await p.$eval('[data-id="sleep"]', (e) => ({
    steps: [...e.querySelectorAll("tbody td")].map((t) => t.className),
    edges: [...e.querySelectorAll(".rx span")].map((s) => s.textContent),
    key: e.querySelector(".nd"),
    named: e.querySelector(".hml").getAttribute("aria-label"),
  }));
  deepStrictEqual(sleep, { steps: ["s4", "s3", "s5", "s2", "s4", "s5", "s3"], edges: ["50", "60", "70", "80", "90", "100"], key: null, named: "Scale 50 to 100" });
  await p.close();
});

test("a fixed scale clamps values beyond it to the end steps and marks the legend ≤ and ≥; no values draws the empty text", async () => {
  const hr = { type: "heat", id: "hr", title: "Resting HR", columns: ["a", "b", "c"], grid: [{ name: "HR", cells: [{ value: 40 }, { value: 75 }, { value: 120 }] }], scale: { min: 60, max: 90, unit: "bpm" } };
  const none = { type: "heat", id: "none", title: "Load", columns: ["a"], grid: [{ name: "w", cells: [{}] }], empty: "No rides logged yet" };
  const p = await open([hr, none]);
  deepStrictEqual(await p.$$eval('[data-id="hr"] tbody td', (t) => t.map((x) => x.className)), ["s1", "s3", "s5"]);
  deepStrictEqual(await p.$$eval('[data-id="hr"] .rx span', (s) => s.map((x) => x.textContent)), ["≤60", "66", "72", "78", "84", "≥90"]);
  strictEqual(await p.$eval('[data-id="none"] .hme', (e) => e.textContent), "No rides logged yet");
  strictEqual(await p.$$eval('[data-id="none"] table, [data-id="none"] button', (e) => e.length), 0);
  await p.close();
});

const shades = (p) =>
  p.$eval('[data-id="load"] .ramp', (ramp) => {
    const c = document.createElement("canvas").getContext("2d");
    return [...ramp.querySelectorAll("i")].map((i) => {
      c.fillStyle = getComputedStyle(i).backgroundColor;
      c.fillRect(0, 0, 1, 1);
      const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    });
  });

test("the five steps come from the theme: darker step by step in light, lighter step by step in dark", async () => {
  for (const mode of ["light", "dark"]) {
    const p = await open([fixture("heat")], { mode });
    const l = await shades(p);
    strictEqual(l.length, 5);
    for (let i = 1; i < 5; i++) ok(mode === "light" ? l[i] < l[i - 1] : l[i] > l[i - 1], `${mode}: ${l.join(", ")}`);
    await p.close();
  }
});

test("cells stay near square on a wide card and keep their tap size on a phone, where the grid scrolls", async () => {
  for (const width of [1440, 390]) {
    const p = await open([fixture("heat")], { width });
    const [w, h] = await p.$eval('[data-id="load"] tbody td', (t) => [t.getBoundingClientRect().width, t.getBoundingClientRect().height]);
    ok(w <= 44 && w >= 28 && h === 44, `${width}: ${w}×${h}`);
    await p.close();
  }
});
