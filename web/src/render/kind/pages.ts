import type { Pages } from "../../gen/types.ts";
import { linkable } from "../../core/check.ts";
import { paging } from "../../paging.ts";
import { btn, el, h } from "../dom.ts";

const named = <E extends HTMLElement>(e: E, name: string, role = ""): E => {
  e.setAttribute("aria-label", name);
  if (role) e.setAttribute("role", role);
  return e;
};

const key = (label: string, name: string) => named(Object.assign(h("button", "", h("span", "", label)), { type: "button" }), name);

const sheet = (p: Pages["pages"][number], i: number, n: number, wide: number) => {
  const alt = `Page ${i + 1} of ${n}. ${p.alt}`;
  const f = h("figure", "dc", Object.assign(el("img"), { loading: "lazy", alt, width: p.width, height: p.height, src: linkable(p.src) ? p.src : "" }));
  f.style.cssText = `--pw:${p.width / wide};--a:${p.width} / ${p.height}`;
  return f;
};

/// A document as the app's pictures of its pages: fitted to the width, paged and zoomed in the view, with its PDF; nothing is sent.
export function pages(b: Pages): HTMLElement {
  const title = b.title || "Document";
  const n = b.pages.length;
  const old = Array.from(document.querySelectorAll<HTMLElement>(".b-pages")).find((x) => x.dataset["id"] === String(b.id ?? ""));
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
  const wide = Math.max(1, ...b.pages.map((p) => p.width));
  s.append(Object.assign(named(h("div", "dcw", h("div", "dck", ...b.pages.map((p, i) => sheet(p, i, n, wide)))), `${title}, ${n} pages`, "region"), { tabIndex: 0 }));
  paging(s, b, had);
  return s;
}
