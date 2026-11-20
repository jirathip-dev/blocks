import type { Pages } from "./gen/types.ts";
import { say, zoomed } from "./gesture.ts";
import { h } from "./render/dom.ts";

const views = new Map<string, Record<string, unknown>>();
const MOST = 4;

const calm = (e: Element) => matchMedia("(prefers-reduced-motion: reduce)").matches || getComputedStyle(e).getPropertyValue("--motion").trim() === "0";

const scroller = (e: Element): Element => {
  for (let p = e.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) return p;
  return document.scrollingElement ?? document.documentElement;
};

const zoom = (s: HTMLElement, well: HTMLElement, col: HTMLElement, keep: Record<string, unknown>, drawn: (z: number) => void) => {
  let w = typeof keep["zoom"] === "number" ? keep["zoom"] : 1;
  let [o, shown] = [[0, 0], 1];
  const write = (z: number) => {
    const k = z / w;
    [w, shown] = [z, 1];
    col.classList.remove("zs");
    col.style.cssText = `--z:${z}`;
    well.scrollLeft = (o[0] ?? 0) * k - well.clientWidth / 2;
    scroller(s).scrollTop += (o[1] ?? 0) * (k - 1);
    drawn(z);
  };
  const apply = (z: number, live: boolean) => {
    if (z === w && shown === 1) return;
    if (shown === 1) o = [well.scrollLeft + well.clientWidth / 2, Math.max(0, Math.min(col.offsetHeight, innerHeight / 2 - well.getBoundingClientRect().top))];
    const was = shown;
    shown = z / w;
    col.classList.toggle("zs", !live);
    col.style.transformOrigin = `${o[0] ?? 0}px ${o[1] ?? 0}px`;
    col.style.transform = `scale(${shown})`;
    if (live) return;
    if (was === shown || calm(s)) write(z);
    else col.addEventListener("transitionend", () => write(z), { once: true });
  };
  zoomed(well, keep, { min: 1, max: MOST, apply });
  well.style.touchAction = "pan-x pan-y";
  col.style.cssText = `--z:${w}`;
  drawn(w);
};

/// Pages and zooms the drawn pages view `s` of `b` in the view, keeping its place by block id; `had` names what had focus before it was drawn.
export function paging(s: HTMLElement, b: Pages, had: string | null): void {
  const n = b.pages.length;
  const keep = views.get(String(b.id ?? "")) ?? {};
  views.set(String(b.id ?? ""), keep);
  const by = (name: string) => s.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  const [prev, next, out, fit, into] = ["previous page", "next page", "zoom out", "fit to width", "zoom in"].map(by);
  const [count, well, col] = [s.querySelector(".dcc"), s.querySelector<HTMLElement>(".dcw"), s.querySelector<HTMLElement>(".dck")];
  if (!n || !prev || !next || !out || !fit || !into || !count || !well || !col) return;
  const figs = Array.from(col.children);
  figs.forEach((f, i) => {
    const im = f.querySelector("img");
    const named = (e: HTMLElement) => (e.setAttribute("aria-label", `${im?.alt ?? ""} Not loaded.`), e.setAttribute("role", "img"), e);
    im?.addEventListener("error", () => im.replaceWith(named(h("div", "dcx bad", `Page ${i + 1} didn't load. ${b.pages[i]?.alt ?? ""}`))));
  });
  const at = () => Math.min(n - 1, Math.max(0, typeof keep["at"] === "number" ? keep["at"] : 0));
  let w = 1;
  const sync = () => {
    count.textContent = `page ${at() + 1} of ${n}`;
    [prev.disabled, next.disabled] = [at() === 0, at() === n - 1];
    [out.disabled, fit.disabled, into.disabled] = [w <= 1, w <= 1, w >= MOST];
    fit.replaceChildren(h("span", "", w <= 1 ? "fit" : `${Math.round(w * 100)}%`));
  };
  const go = (i: number) => {
    keep["at"] = Math.min(n - 1, Math.max(0, i));
    figs[at()]?.scrollIntoView({ block: "start", behavior: calm(s) ? "instant" : "smooth" });
    sync();
    say(`page ${at() + 1} of ${n}`);
  };
  const seen = () => {
    if (!well.isConnected) return s.ownerDocument.removeEventListener("scroll", seen, true);
    const shown = figs.map((f) => f.getBoundingClientRect()).map((r) => Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    keep["at"] = shown.indexOf(Math.max(...shown));
    sync();
  };
  s.ownerDocument.addEventListener("scroll", seen, { capture: true, passive: true });
  zoom(s, well, col, keep, (z) => ((w = z), sync()));
  well.addEventListener("keydown", (e) => {
    if (e.key !== "PageDown" && e.key !== "PageUp") return;
    e.preventDefault();
    go(at() + (e.key === "PageDown" ? 1 : -1));
  });
  const step = (k: string) => () => well.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
  [prev.onclick, next.onclick] = [() => go(at() - 1), () => go(at() + 1)];
  [into.onclick, out.onclick, fit.onclick] = [step("+"), step("-"), step("0")];
  if (had) queueMicrotask(() => [well, ...s.querySelectorAll<HTMLElement>("button, a")].find((x) => x.getAttribute("aria-label") === had)?.focus({ preventScroll: true }));
}
