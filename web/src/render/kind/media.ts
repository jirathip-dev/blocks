import type { Media } from "../../gen/types.ts";
import { el, h } from "../dom.ts";

const set = (e: HTMLElement, a: Record<string, string | number | null | undefined>) => Object.entries(a).forEach(([k, v]) => v != null && e.setAttribute(k, String(v)));

/// A picture or a video at its own size, so nothing moves when it loads; its caption under it.
export function figure(m: Media): HTMLElement {
  const f = el("figure", "media");
  const v = el(m.video ? "video" : "img");
  if (m.video) set(v, { src: m.src, "aria-label": m.alt, controls: "", preload: "metadata", width: m.width, height: m.height, poster: m.poster });
  else set(v, { src: m.src, alt: m.alt, loading: "lazy", width: m.width, height: m.height });
  f.append(v);
  if (m.caption) f.append(h("figcaption", "", m.caption));
  return f;
}

export const media = (b: Media): HTMLElement => figure(b);
