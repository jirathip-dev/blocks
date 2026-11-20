import { createElement } from "react";
import type { Diff } from "../../../src/core/index.ts";
import { Fallen } from "../block.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

const mark = (line: string) => (line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx");

export function diff({ b, hooks }: V<Diff>) {
  if (typeof b.file !== "string" || !Array.isArray(b.hunks)) return createElement(Fallen, { b });
  const head = h("div", "dfh", null, h("span", "dff", null, b.file), b.summary != null ? h("span", "dfs", null, b.summary) : null);
  const lines = b.hunks.flatMap((k) => [h("div", "dfk", null, k.at), ...k.lines.map((l) => h("div", `dfl ${mark(l)}`, null, h("i", "dfm", null, l.slice(0, 1) || " "), l.slice(1)))]);
  return h("div", "df", hooks, head, b.hunks.length ? h("div", "dfb", null, ...lines) : null);
}
