import { useContext, useLayoutEffect, useRef } from "react";
import type { Import } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

/// The import kind: the web view's own drawing, fetched as its chunk on the first draw.
export function import_({ b, hooks }: V<Import>) {
  const cx = useContext(Cx);
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const box = root.current;
    if (box) void import("../../../src/lazy/import.ts").then((m) => m.draw(box, b, cx));
  }, [b, cx]);
  return h("section", "im", { ...hooks, ref: root });
}
