import { useContext } from "react";
import type { Hero } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { act, urlOf, type V } from "../draw.ts";
import { h } from "../h.ts";
import { still } from "./media.ts";

export function hero({ b, hooks }: V<Hero>) {
  const cx = useContext(Cx);
  const acts = (b.actions ?? []).map((a) => {
    const tap = a.tap;
    const go = tap ? () => cx.tap(tap) : () => void cx.act({ action: a.action ?? "", block: b.id, values: a.values ?? {}, confirm: a.confirm });
    const url = urlOf(tap);
    return act(a, "primary", cx, url, url ? undefined : go);
  });
  const sub = b.subtitle ? h("p", "b-hero__subtitle", null, b.subtitle) : null;
  return h("header", "hero", hooks, h("h1", "b-hero__title", null, b.title), sub, b.media ? still(b.media, {}) : null, acts.length ? h("div", "bar b-hero__actions", null, ...acts) : null);
}
