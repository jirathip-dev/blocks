import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { type Editing, type Placed, rows, wire } from "../../src/edits.ts";
import type { SizeClass } from "../../src/gen/layout.ts";
import { h } from "./h.ts";

export type ArrangeProps = { tree: Placed; size: SizeClass; edit: Editing; onDone?: () => void };

/// The layout's edit list as the web shell's sheet body draws it: each node's place and handle; one edit goes to `edit.save`, a refused one says why.
export function Arrange(p: ArrangeProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [why, setWhy] = useState("");
  const live = useRef(p);
  live.current = p;
  const { tree, size } = p;
  useLayoutEffect(() => {
    const l = ref.current;
    if (!l) return;
    const o = { slots: live.current.edit.slots, save: (e: Parameters<Editing["save"]>[0]) => live.current.edit.save(e) };
    return wire(l, tree, size, o, setWhy, () => live.current.onDone?.());
  }, [tree, size]);
  const row = (r: ReturnType<typeof rows>[number]) =>
    h(
      "div",
      "row as-surface",
      { key: r.id, "data-id": r.id, style: { paddingInlineStart: `calc(var(--s3) * ${r.depth + 1})` } },
      h("span", "rm", null, h("span", "rt as-title-label", null, r.label)),
      h("select", "", { "aria-label": `${r.label} shows on ${size} as` }, ...r.places.map((x) => h("option", "", { key: x, value: x }, x))),
    );
  return h("div", "b-sheet__body", null, h("div", "list b-arrange", { ref, "aria-label": `layout on ${size}` }, ...rows(tree).map(row)), h("p", "m", { role: "alert" }, why));
}
