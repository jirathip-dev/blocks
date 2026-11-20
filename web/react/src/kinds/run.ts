import { useContext } from "react";
import type { Run } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { h } from "../h.ts";

export function run({ b, hooks }: V<Run>) {
  const cx = useContext(Cx);
  const go = (choice: string) => () => void cx.act({ action: b.action, block: b.id, values: { choice, sha: b.sha } });
  const meta = [b.dir, b.touches, b.sha && `sha ${b.sha}`].filter(Boolean).join(" · ");
  const bar = h("div", "bar", null, ...["approve", "deny"].map((c) => btn(c, c === "deny" ? "bad" : "primary", undefined, b.action, { key: c, onClick: go(c) })));
  return h("div", "run", hooks, h("pre", "cmd", null, b.command), h("p", "m", null, meta), bar);
}
