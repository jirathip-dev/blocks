import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { built } from "../src/core/index.ts";
import { BlocksView } from "../react/src/index.ts";

window.React = { createElement };

/// Draws `screen` under `root` with the React adapter and reports what it sends; `set` draws the next screen.
export function boot(root, screen, out) {
  const r = createRoot(root);
  const said = (x) => (x.what === "dropped" ? out.dropped(`event ${x.block} ${x.event}`) : x.what === "threw" ? out.dropped(`threw ${x.block}`) : undefined);
  const set = (s) => flushSync(() => r.render(createElement(BlocksView, { screen: built(s), onAction: out.sent, kinds: window.blocksKinds, islands: window.blocksIslands, onReport: said })));
  set(screen);
  return { set };
}
