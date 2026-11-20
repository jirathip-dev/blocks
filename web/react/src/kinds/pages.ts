import { createElement, Fragment, type ReactNode, useLayoutEffect, useRef } from "react";
import { linkable, type Pages } from "../../../src/core/index.ts";
import { paging } from "../../../src/paging.ts";
import { btn, type V } from "../draw.ts";
import { h } from "../h.ts";

const key = (label: string, name: string) => h("button", "", { type: "button", "aria-label": name }, h("span", "", null, label));

/// A document as the web view draws it, paged and zoomed by the same wiring; nothing is sent.
export function pages({ b, hooks }: V<Pages>) {
  const root = useRef<HTMLElement>(null);
  const a = typeof document === "undefined" ? null : document.activeElement;
  const had = a && root.current?.contains(a) ? a.getAttribute("aria-label") : null;
  useLayoutEffect(() => void (root.current && paging(root.current, b, had)), [b]);
  const [title, n] = [b.title || "Document", b.pages.length];
  const wide = Math.max(1, ...b.pages.map((p) => p.width));
  const bar: ReactNode[] = n ? [key("‹", "previous page"), key("›", "next page"), h("i", "", null), key("−", "zoom out"), key("fit", "fit to width"), key("+", "zoom in")] : [];
  if (b.file && linkable(b.file)) bar.push(...(n ? [h("i", "", null)] : []), btn("pdf", "", b.file, undefined, { "aria-label": `download ${title} as PDF` }));
  const sheet = (p: Pages["pages"][number], i: number) =>
    h("figure", "dc", { style: { "--pw": p.width / wide, "--a": `${p.width} / ${p.height}` } }, h("img", "", { loading: "lazy", alt: `Page ${i + 1} of ${n}. ${p.alt}`, width: p.width, height: p.height, src: linkable(p.src) ? p.src : "" }));
  const body = n ? h("div", "dcw", { role: "region", "aria-label": `${title}, ${n} pages`, tabIndex: 0 }, h("div", "dck", null, ...b.pages.map(sheet))) : h("div", "dce", null, "No pages yet");
  const head = h("div", "dch", null, h("b", "dct", null, title), h("span", "dcc", null, n ? null : "no pages"), bar.length ? h("div", "dcb", null, ...bar) : null);
  return h("section", "dcs", { ...hooks, ref: root }, createElement(Fragment, { key: JSON.stringify(b) }, head, b.note ? h("p", "dcn", null, b.note) : null, body));
}
