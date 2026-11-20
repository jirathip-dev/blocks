import type { Pages } from "../../gen/types.ts";
import { linkable } from "../../core/check.ts";
import { say, zoomed } from "../../gesture.ts";
import { btn, el, h } from "../dom.ts";

const views = new Map<string, Record<string, unknown>>();
const MOST = 4;

const named = <E extends HTMLElement>(e: E, name: string, role = ""): E => {
  e.setAttribute("aria-label", name);
  if (role) e.setAttribute("role", role);
  return e;
};

const key = (label: string, name: string) => named(Object.assign(h("button", "", h("span", "", label)), { type: "button" }), name);

const calm = (e: Element) => matchMedia("(prefers-reduced-motion: reduce)").matches || getComputedStyle(e).getPropertyValue("--motion").trim() === "0";

const scroller = (e: Element): Element => {
  for (let p = e.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) return p;
  return document.scrollingElement ?? document.documentElement;
};

const sheet = (p: Pages["pages"][number], i: number, n: number, wide: number) => {
  const alt = `Page ${i + 1} of ${n}. ${p.alt}`;
  const im = Object.assign(el("img"), { loading: "lazy", alt, width: p.width, height: p.height, src: linkable(p.src) ? p.src : "" });
  const f = h("figure", "dc", im);
  f.style.cssText = `--pw:${p.width / wide};--a:${p.width} / ${p.height}`;
  im.addEventListener("error", () => im.replaceWith(named(h("div", "dcx bad", `Page ${i + 1} didn't load. ${p.alt}`), `${alt} Not loaded.`, "img")));
  return f;
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

/// A document as the app's pictures of its pages: fitted to the width, paged and zoomed in the view, with its PDF; nothing is sent.
export function pages(b: Pages): HTMLElement {
  const title = b.title || "Document";
  const n = b.pages.length;
  const id = String(b.id ?? "");
  const keep = views.get(id) ?? {};
  views.set(id, keep);
  const old = Array.from(document.querySelectorAll<HTMLElement>(".b-pages")).find((x) => x.dataset["id"] === id);
  const had = old?.contains(document.activeElement) ? (document.activeElement?.getAttribute("aria-label") ?? null) : null;
  const s = el("section", "dcs");
  const count = el("span", "dcc", "no pages");
  const [prev, next, out, fit, into] = [key("‹", "previous page"), key("›", "next page"), key("−", "zoom out"), key("fit", "fit to width"), key("+", "zoom in")];
  const bar = h("div", "dcb");
  if (n) bar.append(prev, next, el("i"), out, fit, into);
  if (b.file && linkable(b.file)) bar.append(...(n ? [el("i")] : []), named(btn("pdf", "", b.file), `download ${title} as PDF`));
  s.append(h("div", "dch", h("b", "dct", title), count, ...(bar.childElementCount ? [bar] : [])));
  if (b.note) s.append(h("p", "dcn", b.note));
  if (!n) return (s.append(h("div", "dce", "No pages yet")), s);
  const well = Object.assign(named(h("div", "dcw"), `${title}, ${n} pages`, "region"), { tabIndex: 0 });
  const wide = Math.max(1, ...b.pages.map((p) => p.width));
  const figs = b.pages.map((p, i) => sheet(p, i, n, wide));
  const col = h("div", "dck", ...figs);
  well.append(col);
  s.append(well);
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
    if (!s.isConnected) return s.ownerDocument.removeEventListener("scroll", seen, true);
    const shown = figs.map((f) => f.getBoundingClientRect()).map((r) => Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    keep["at"] = shown.indexOf(Math.max(...shown));
    sync();
  };
  s.ownerDocument?.addEventListener("scroll", seen, { capture: true, passive: true });
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
  return s;
}
