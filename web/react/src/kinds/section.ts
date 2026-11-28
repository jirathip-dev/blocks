import type { Section } from "../../../src/core/index.ts";
import { kids } from "../block.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const GROUP: Record<string, string> = { waiting: "needs", blocked: "needs", asleep: "idle", in: "working" };
const SH: Record<string, string> = { needs: "r", working: "g" };

export function section({ b, hooks }: V<Section>) {
  const w = (b.header ?? "").split(" ")[0] ?? "";
  const k = GROUP[w] ?? w;
  return h("section", "sec", hooks, b.header ? h("h3", `sh as-header-label ${SH[k] ?? ""}`, null, b.header) : null, ...kids(b.blocks), b.footer ? h("p", "m foot", null, b.footer) : null);
}
