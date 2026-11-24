import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { decode, encode } from "../src/core/code.ts";

const looks = JSON.parse(readFileSync(new URL("../../site/looks.json", import.meta.url), "utf8"));
const FOUR = { default: "101yx6", paper: "11hioq~BQAA.paper", console: "10lspy~BAMvLyAAEAFbAV0.console", playful: "108bd0.playful" };
const ALL_ROLES = "11u0yw~AAFbAAQD4oC5A-KAuggBWwPigLoJA-KAuQANAVsD4oC6EQPigLkD4oC6EgFbABYD4oC5A-KAuhoBWwPigLobA-KAuQA.swag-1";
const plain = decode("101yx6").style;
const round = (style) => deepStrictEqual(decode(encode(style)).style, style);

test("the four site looks have the codes Rust pins and decode to their style", () => {
  for (const [name, want] of Object.entries(FOUR)) {
    const { format: _, ...style } = looks[name].style;
    strictEqual(encode(style, name === "default" ? null : name), want);
    const labels = Object.fromEntries(Object.entries(style.labels).map(([r, l]) => [r, { prefix: "", suffix: "", case: "as-is", ...l }]));
    deepStrictEqual(decode(want), { style: { buttons: "plain", ...style, labels }, scheme: name === "default" ? null : name });
  }
});

test("each axis round-trips every value, space, radius and motion on each quarter step", () => {
  const values = { type: ["default", "mono", "serif"], easing: ["standard", "calm", "bouncy"], surface: ["glass", "dashed", "solid"], fills: ["tint", "outline", "solid"], buttons: ["plain", "filled"], marks: ["symbols", "text"], sections: ["title", "quiet"] };
  for (const [axis, all] of Object.entries(values)) for (const v of all) round({ ...plain, [axis]: v });
  for (const axis of ["space", "radius", "motion"]) {
    for (let i = 0; i <= 16; i++) round({ ...plain, [axis]: i / 4 });
    throws(() => encode({ ...plain, [axis]: 1.1 }), { message: `${axis} is off the code's quarter steps` });
  }
});

test("labels on every role with a multi-byte affix round-trip to the code Rust pins", () => {
  const roles = ["kind", "header", "group", "section", "title", "button", "chip", "back", "said", "picked"];
  const labels = Object.fromEntries(roles.map((r, i) => [r, { prefix: i % 2 ? "‹" : "[", suffix: i % 3 ? "›" : "", case: ["as-is", "lower", "upper"][i % 3] }]));
  const style = { type: "serif", space: 4, radius: 0.25, motion: 0, easing: "bouncy", surface: "glass", fills: "solid", buttons: "filled", marks: "text", sections: "quiet", labels };
  strictEqual(encode(style, "swag-1"), ALL_ROLES);
  deepStrictEqual(decode(ALL_ROLES), { style, scheme: "swag-1" });
});

test("a bad code is refused with why", () => {
  const bad = (code, message) => throws(() => decode(code), { message });
  for (const c of ["hello", "101yx", "101YX6", "101yx6~"]) bad(c, "not a look code");
  bad("901yx6", "version 9: this reader takes 1");
  bad("2zzzzz", "version 2: this reader takes 1");
  bad("1zzzzz", "an axis value this reader does not know: made by a newer blocks");
  for (const c of ["101yx6.default", "101yx6.Paper", "101yx6.-x"]) bad(c, "a scheme name is a-z, 0-9 and -, at most 32, and never default");
  for (const c of ["101yx6~_w", "101yx6~AAFh", "101yx6~BQAB"]) bad(c, "the labels part does not decode");
});
