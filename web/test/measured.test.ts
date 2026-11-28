import { deepStrictEqual, ok } from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { shot } from "../shot/shot.ts";
import { unchanged } from "../shot/look.ts";
import { css } from "../src/core/look.ts";
import { defaultPair } from "../src/gen/schemes.ts";

const file = (p) => fileURLToPath(new URL(p, import.meta.url));
const kinds = JSON.parse(readFileSync(file("../../fixtures/look/kinds.json"), "utf8"));
const still = file("../../fixtures/styles/still-tiles.css");
const worn = JSON.parse(readFileSync(file("../../fixtures/look/worn.json"), "utf8"));
const gaps = readFileSync(file("../../ci/tokens/finishes.txt"), "utf8").split("\n").filter((l) => l.startsWith("web value "));
const scratch = () => mkdtempSync(join(process.env.DROVER_SCRATCH_TARGET ?? tmpdir(), "finish-"));
const fixture = (k) => JSON.parse(readFileSync(file(`../../fixtures/blocks/${k}.json`), "utf8"));
const worns = { ...kinds, blocks: [...kinds.blocks, ...["steps", "scene", "button"].map(fixture), { ...fixture("diagram"), selected: "b" }] };
const finishes = async (more = []) => {
  const dir = scratch();
  let n = 0;
  return unchanged(async (style) => {
    const sheet = join(dir, `${n++}.css`);
    writeFileSync(sheet, css(defaultPair, style));
    return (await shot({ screen: worns, name: "worns", css: [sheet, ...more], look: true, browser })).parts.worns;
  }, worn.values);
};
const valued = (facts) => [...new Set(facts.map((f) => f.replace(/^look: (\S+) (\S+) changes no .*$/, "web value $1 $2")))].sort();
const looks = (css = [], scheme = "light", size = "390x844") => shot({ screen: kinds, name: "kinds", size, css, scheme, look: true, check: true, browser });

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

test("the kinds page measures as its scheme and tile tokens say, in both schemes, square and rounded, at 390 and 1440", async () => {
  for (const scheme of ["light", "dark"])
    for (const size of ["390x844", "1440x900"])
      for (const css of [[], [still]]) deepStrictEqual((await looks(css, scheme, size)).faults, [], `${scheme} ${size} ${css}`);
});

test("a forced defect fails the fact it breaks: a seam set to 0, a rounded corner, a wrong fill, a missing grid", async () => {
  const dir = mkdtempSync(join(process.env.DROVER_SCRATCH_TARGET ?? tmpdir(), "defects-"));
  const defects = {
    "the seam is 0": ".list{gap:0}",
    "the corner": ".list>.row{border-radius:8px}",
    "the fill": ".list>.row{background:#fff0f0}",
    "a grid dot": "html{background:var(--bg)}",
  };
  for (const [fact, rule] of Object.entries(defects)) {
    writeFileSync(join(dir, "defect.css"), rule);
    const { faults } = await looks([join(dir, "defect.css")]);
    ok(faults.some((f) => f.includes(`look: ${fact}`)), `${rule}: ${faults.join("; ")}`);
  }
});

test("each style value changes the finishes it names on the kinds page with steps, a scene, a button and a picked diagram; the ones that change none are ci/tokens/finishes.txt's web lines", async () => {
  deepStrictEqual(valued(await finishes()), gaps.map((l) => l.split(" ").slice(0, 4).join(" ")).sort());
});

test("a forced defect fails the finish fact: a surface pinned against its style values changes no surface", async () => {
  const dir = scratch();
  writeFileSync(join(dir, "pinned.css"), ".as-surface{border-style:solid!important;border-width:1px!important}");
  const facts = await finishes([join(dir, "pinned.css")]);
  for (const v of ["dashed", "solid"]) ok(facts.includes(`look: surface ${v} changes no surface`), facts.join("; "));
});
