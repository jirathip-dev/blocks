import { strictEqual } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { choose, css } from "../src/core/index.ts";
import { defaultPair } from "../src/gen/schemes.ts";

const read = (p) => readFileSync(new URL(`../../fixtures/${p}`, import.meta.url), "utf8");
const solar = JSON.parse(read("schemes/solarized-canonical.json"));
const offer = { solar, paper: { ...defaultPair.light, label: "Paper" } };

test("choose picks the owner's scheme when it is on offer, else the device's default for light or dark", () => {
  const rows = [
    ["follows the device, light", null, false, offer, defaultPair.light],
    ["follows the device, dark", null, true, offer, defaultPair.dark],
    ["a named scheme, on a dark device", "paper", true, offer, offer.paper],
    ["a named scheme, on a light device", "solar", false, offer, solar],
    ["a name not on offer, dark", "gone", true, offer, defaultPair.dark],
    ["a name not on offer, light", "gone", false, offer, defaultPair.light],
    ["an inherited name is not on offer", "toString", true, offer, defaultPair.dark],
    ["no schemes supplied", "solar", true, undefined, defaultPair.dark],
    ["no schemes supplied, following a light device", null, false, undefined, defaultPair.light],
  ];
  for (const [what, setting, dark, schemes, want] of rows) strictEqual(choose(setting, dark, schemes), want, what);
});

test("css writes the crate's theme::css text for the default pair and each scheme in fixtures/schemes", () => {
  const still = JSON.parse(read("styles/still.json"));
  const want = {
    "default.css": css(defaultPair),
    "default-serif.css": css(defaultPair, { type: "serif" }),
    "default-still.css": css(defaultPair, { space: still.space, motion: still.motion }),
  };
  for (const f of readdirSync(new URL("../../fixtures/schemes", import.meta.url)).filter((f) => f.endsWith(".json"))) {
    const s = JSON.parse(read(`schemes/${f}`));
    if (Object.keys(s.tokens).length !== Object.keys(defaultPair.light.tokens).length) continue;
    want[f.replace(".json", ".css")] = css({ ...defaultPair, [s["color-scheme"]]: s });
  }
  strictEqual(Object.keys(want).sort().join(), readdirSync(new URL("../../fixtures/css", import.meta.url)).sort().join());
  for (const [f, text] of Object.entries(want)) strictEqual(`${text}\n`, read(`css/${f}`), f);
});
