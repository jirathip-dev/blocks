import type { Web } from "../gen/types.ts";
import { el, h, href } from "./index.ts";

const sandbox = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";

export function web(b: Web): HTMLElement {
  const root = el("div", "web");
  let url: URL | null = null;
  try {
    url = new URL(b.src, document.baseURI);
  } catch {
    url = null;
  }
  if (!url || !["http:", "https:"].includes(url.protocol)) {
    const none = h("div", "wf none", "This page can't be shown here.");
    none.style.height = `${b.height}px`;
    root.append(none);
    return root;
  }
  const shown = b.src.replace(/^https?:[/]{2}/i, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  const f = el("iframe", "wf");
  f.style.height = `${b.height}px`;
  const at = { sandbox, allow: "", referrerpolicy: "no-referrer", loading: "lazy", title: shown, src: url.href };
  for (const [k, v] of Object.entries(at)) f.setAttribute(k, v);
  root.append(f, h("div", "wm", h("span", "wu", shown), href(h("a", "", "open ↗"), url.href)));
  return root;
}
