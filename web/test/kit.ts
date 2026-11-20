import { readFileSync } from "node:fs";
import { install } from "./dom.ts";

install();
export const { render } = await import("../src/render/block.ts");
const { plain } = await import("../src/theme.ts");

export const dir = new URL("../../fixtures/blocks/", import.meta.url);
export const fixture = (kind) => JSON.parse(readFileSync(new URL(`${kind}.json`, dir), "utf8"));
const store = { get: () => null, put: () => {} };
export const ctx = (more = {}) => ({ screen: "home", act: async () => true, tap: () => {}, open: new Set(), theme: plain, store, ...more });
export const all = (e) => [e, ...e.children.flatMap(all)];
export const part = (e, cls) => all(e).find((x) => x.classList.contains(cls));
export const rounds = (last = "needs") => ({
  type: "row",
  id: "i23",
  title: "#23 diagram",
  subtitle: "review 3",
  tap: { open: "issue" },
  rounds: [
    { id: "r1", name: "impl", state: "done", summary: "pushed", tap: { open: "verdict-1" } },
    { id: "r2", name: "review 1", state: "fail", summary: "two findings", tap: { url: "https://x.test/v2" } },
    { id: "r3", name: "fix 1", state: "merged" },
    {
      id: "r4",
      name: "review 2",
      state: last,
      summary: "one finding",
      tap: { open: "never" },
      lane: { name: "rev-23", harness: "claude", host: "mini", lines: ["reading", "writing verdict"] },
      blocks: [{ type: "text", id: "why", markdown: "Fix it" }],
      links: [{ label: "approve", tap: { action: "approve" } }, { label: "diff", tap: { url: "https://x.test/d" } }],
    },
  ],
});
