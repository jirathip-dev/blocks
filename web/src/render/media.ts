import { type Blk, el, h } from "./index.ts";

/// A picture or a video at its own size, so nothing moves when it loads; its caption under it.
export function figure(m: Blk): HTMLElement {
  const f = el("figure", "media");
  const at = (e: HTMLElement, a: Record<string, unknown>) => Object.entries(a).forEach(([k, v]) => v != null && e.setAttribute(k, String(v)));
  if (m.video) {
    const v = el("video");
    at(v, { src: m.src, "aria-label": m.alt, controls: "", preload: "metadata", width: m.width, height: m.height, poster: m.poster });
    f.append(v);
  } else {
    const i = el("img");
    at(i, { src: m.src, alt: m.alt ?? "", loading: "lazy", width: m.width, height: m.height });
    f.append(i);
  }
  if (m.caption) f.append(h("figcaption", "", String(m.caption)));
  return f;
}

export const media = (b: Blk): HTMLElement => figure(b);
