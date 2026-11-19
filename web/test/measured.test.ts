import { deepStrictEqual, ok } from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { shot } from "../shot/shot.ts";

const file = (p) => fileURLToPath(new URL(p, import.meta.url));
const kinds = JSON.parse(readFileSync(file("../../fixtures/look/kinds.json"), "utf8"));
const still = file("../../fixtures/styles/still-tiles.css");
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
