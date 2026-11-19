import type { Images } from "../../gen/types.ts";
import { linkable } from "../act.ts";
import { btn, el, h, href } from "../dom.ts";

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

/// The image viewer over the page: fitted; a double tap or a pinch zooms, a swipe goes to the next, [save].
export function viewer(list: [string, string][], from: number) {
  const v = el("div", "iv");
  const im = el("img");
  const bar = el("div", "bar");
  const save = el("a", "", "<span>save</span>");
  const count = el("span", "m");
  v.id = "iv";
  let at = from;
  let z = 1;
  let x0 = 0;
  let d0 = 0;
  let t0 = 0;
  const zoom = (k: number) => {
    z = Math.min(4, Math.max(1, k));
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
  im.addEventListener("dblclick", () => zoom(z > 1 ? 1 : 2.5));
  v.addEventListener("click", (e) => e.target === v && shut());
  v.addEventListener(
    "touchstart",
    (e) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      if (b) d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / z;
      else if (Date.now() - t0 < 300) zoom(z > 1 ? 1 : 2.5);
      [x0, t0] = [a.clientX, Date.now()];
    },
    { passive: true },
  );
  v.addEventListener(
    "touchmove",
    (e) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      if (b && d0) zoom(Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / d0);
    },
    { passive: true },
  );
  v.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - x0;
      if (!e.touches.length) d0 = 0;
      if (z === 1 && Math.abs(dx) > 50 && list.length > 1) to(at + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );
  v.append(im, bar);
  to(at);
  document.body.append(v);
  addEventListener("keydown", key);
  close.focus();
}
