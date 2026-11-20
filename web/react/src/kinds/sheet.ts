import type { Sheet } from "../../../src/core/index.ts";
import { kids } from "../block.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

export const sheet = ({ b, hooks }: V<Sheet>) => h("div", "shb", hooks, ...kids(b.blocks));
