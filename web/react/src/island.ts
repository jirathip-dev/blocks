import { createElement, type ReactNode, Suspense, useContext, useLayoutEffect, useState } from "react";
import type { Of } from "../../src/core/index.ts";
import { Cx } from "./act.ts";
import { Boundary, row } from "./block.ts";
import { type Attrs, h } from "./h.ts";

function Mark({ on }: { on: (live: boolean) => void }): ReactNode {
  useLayoutEffect(() => {
    on(true);
    return () => on(false);
  }, [on]);
  return null;
}

/// An island's box, clipped to its `size`: the app's component by name, else its fallback row, also while it loads and after it threw.
export function Isle({ b, attrs }: { b: Of<"island">; attrs: Attrs }): ReactNode {
  const cx = useContext(Cx);
  const [live, setLive] = useState(false);
  const C = Object.prototype.hasOwnProperty.call(cx.islands, b.name) ? cx.islands[b.name] : undefined;
  const fallback = row(b.fallback, cx);
  const id = b.id ?? "";
  const emit = (name: string, values?: Record<string, unknown>) =>
    b.events?.includes(name) ? void cx.act({ action: name, block: id, values: values ?? {} }) : cx.report({ what: "dropped", block: id, event: name });
  const style = { overflow: "hidden", aspectRatio: b.size?.aspect ?? undefined, width: b.size?.width ?? undefined, height: b.size?.height ?? undefined };
  const inner = C && createElement(Boundary, { b, report: cx.report, fallback }, createElement(Suspense, { fallback }, createElement(Mark, { on: setLive }), createElement(C, { props: b.props ?? {}, emit })));
  return h("div", "", { ...attrs, "data-fallback": C && live ? undefined : "", style }, inner || fallback);
}
