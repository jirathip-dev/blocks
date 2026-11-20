import type { Web } from "../../../src/core/index.ts";
import { out, type V } from "../draw.ts";
import { h } from "../h.ts";

const sandbox = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";

const parsed = (src: string) => {
  try {
    return new URL(src, document.baseURI);
  } catch {
    return null;
  }
};

export function web({ b, hooks }: V<Web>) {
  const url = parsed(b.src);
  const style = { height: `${b.height}px` };
  if (!url || !["http:", "https:"].includes(url.protocol)) return h("div", "web", hooks, h("div", "wf none", { style }, "This page can't be shown here."));
  const shown = b.src.replace(/^https?:[/]{2}/i, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  const frame = h("iframe", "wf", { style, sandbox, allow: "", referrerPolicy: "no-referrer", loading: "lazy", title: shown, src: url.href });
  return h("div", "web", hooks, frame, h("div", "wm", null, h("span", "wu", null, shown), h("a", "", out(url.href), "open ↗")));
}
