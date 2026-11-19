import type { Images } from "../gen/types.ts";
import { zoomed } from "../gesture.ts";
import { btn, el, h, href, linkable } from "./index.ts";

export function images(b: Images): HTMLElement {
  const s = el("div", "imgs");
  for (const i of b.items) {
    if (!linkable(i.src)) {
      s.append(h("span", "", i.alt ?? ""));
      continue;
    }
    const a = href(el("a"), new URL(i.src.replace(/^[/]/, ""), document.baseURI).href);
    a.onclick = (e) => {
      e.preventDefault();
      const all = Array.from(document.querySelectorAll<HTMLAnchorElement>("main .imgs a"));
      viewer(
        all.map((x) => [x.href, x.querySelector("img")?.alt ?? ""]),
        Math.max(0, all.indexOf(a)),
      );
    };
    const im = el("img");
    Object.assign(im, { src: a.href, alt: i.alt ?? "", loading: "lazy" });
    a.append(im);
    s.append(a);
  }
  return s;
}

/// The image viewer over the page: fitted; the one zoom (a pinch, Ctrl and wheel, a double tap, + and -), a swipe goes to the next, [save].
export function viewer(list: [string, string][], from: number) {
  const v = el("div", "iv");
  const im = el("img");
  const bar = el("div", "bar");
  const save = el("a", "", "<span>save</span>");
  const count = el("span", "m");
  v.id = "iv";
  let at = from;
  let x0 = 0;
  const keep: Record<string, unknown> = {};
  const zoom = (z: number) => {
    keep.zoom = z;
    im.style.transform = `scale(${z})`;
    v.classList.toggle("z", z > 1);
  };
  const to = (i: number) => {
    at = (i + list.length) % list.length;
    [im.src, im.alt] = list[at];
    save.href = list[at][0];
    save.download = list[at][1] || "image";
    count.textContent = `${at + 1} / ${list.length}`;
    zoom(1);
  };
  const shut = () => {
    v.remove();
    removeEventListener("keydown", key);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape") shut();
    else if (e.key === "ArrowRight") to(at + 1);
    else if (e.key === "ArrowLeft") to(at - 1);
  };
  const close = btn("close");
  const prev = btn("‹");
  const next = btn("›");
  close.onclick = shut;
  prev.onclick = () => to(at - 1);
  next.onclick = () => to(at + 1);
  bar.append(prev, count, next, save, close);
  v.addEventListener("click", (e) => e.target === v && shut());
  zoomed(v, keep, { min: 1, max: 4, apply: zoom });
  v.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  v.addEventListener("pointerup", (e) => {
    const dx = e.clientX - x0;
    if (e.isPrimary && keep.zoom === 1 && Math.abs(dx) > 50 && list.length > 1) to(at + (dx < 0 ? 1 : -1));
  });
  v.append(im, bar);
  to(at);
  document.body.append(v);
  addEventListener("keydown", key);
  close.focus();
}
