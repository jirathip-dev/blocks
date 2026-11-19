import type { List } from "../../../src/core/index.ts";
import { kids } from "../block.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

export const list = ({ b, hooks }: V<List>) => h("div", "list", hooks, ...kids(b.rows));
