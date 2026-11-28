import { deepStrictEqual, ok } from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { shot } from "../shot/shot.ts";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const worn = read("../../fixtures/look/worn.json").kinds;
const live = (k) => (k === "timeline" ? ["button", "surface"] : ["button"]);

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

test("blocks-shot reports the finishes each kind wore: fixtures/look/worn.json's, and beside them only live-only controls' buttons and the timeline's draw ghost", async () => {
  const drew = {};
  for (const f of readdirSync(new URL("../../fixtures/blocks/", import.meta.url))) {
    const { report } = await shot({ screen: read(`../../fixtures/blocks/${f}`), name: "worn", browser });
    for (const [k, fs] of Object.entries(report.worn)) drew[k] = [...new Set([...(drew[k] ?? []), ...fs])];
  }
  ok(drew.card?.includes("surface") && drew.steps?.includes("mark"), JSON.stringify(drew));
  for (const [k, fs] of Object.entries(worn)) deepStrictEqual(fs.filter((f) => !drew[k]?.includes(f)), [], `${k}: the site wears it, the live HTML does not`);
  for (const [k, fs] of Object.entries(drew)) deepStrictEqual(fs.filter((f) => !worn[k]?.includes(f) && !live(k).includes(f)), [], `${k}: the live HTML wears it, the site does not`);
});
