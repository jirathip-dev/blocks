import { useContext } from "react";
import type { Text } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { md, type V } from "../draw.ts";
import { h } from "../h.ts";

export function text({ b, hooks }: V<Text>) {
  const cx = useContext(Cx);
  return h("div", "txt", { ...hooks, "data-md": b.markdown ?? "" }, ...md(b.markdown, cx.screen.startsWith("thread-")));
}
