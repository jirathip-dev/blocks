import { deepStrictEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { webkit } from "playwright";
import { shot } from "../shot/shot.ts";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/slide/text-size.json", import.meta.url), "utf8"));
const hours = { type: "screen", id: "request", blocks: [{ type: "form", id: "request", submit: { action: "send", label: "send" }, fields: [{ type: "slider", name: "hours", label: "Hours worked", min: 0, max: 12, step: 0.5, unit: "h", value: 7.5 }] }] };

test("fixtures/slide/text-size.json: the slide step sends the number once, on let go, from a live form in HTML and React, as blocks-snap does", async () => {
  const browser = await webkit.launch();
  try {
    for (const adapter of ["html", "react"]) {
      for (const c of fixture.cases) {
        const { report } = await shot({ screen: fixture.screen, steps: c.steps, adapter, browser });
        deepStrictEqual([report.sent, report.dropped], [c.sent, c.dropped], `${c.name} ${adapter}`);
      }
    }
  } finally {
    await browser.close();
  }
});

test("the label over the thumb follows it, and a form's submit sends the number it was let go at, in HTML and React", async () => {
  const browser = await webkit.launch();
  try {
    for (const adapter of ["html", "react"]) {
      const steps = [{ shot: { name: "at" } }, { slide: { field: "hours", to: 11 } }, { shot: { name: "moved" } }, { tap: { id: "request" } }];
      const { report, trees } = await shot({ screen: hours, steps, adapter, browser });
      const text = (n) => trees[n].children[0].text;
      ok(text("at").includes("Hours worked7.5\u00a0h0\u00a0h12\u00a0h"), `${adapter}: ${text("at")}`);
      ok(text("moved").includes("11\u00a0h"), `${adapter}: ${text("moved")}`);
      deepStrictEqual(report.sent, [{ screen: "request", action: "send", block: "request", values: { hours: 11 } }], adapter);
    }
  } finally {
    await browser.close();
  }
});
