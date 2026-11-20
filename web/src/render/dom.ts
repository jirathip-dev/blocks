import { acts } from "./act.ts";

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const nodes = (html: string) => Array.from(new DOMParser().parseFromString("<body>" + html, "text/html").body.childNodes);

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.replaceChildren(...nodes(html));
  return e;
};
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, ...kids: (Node | string)[]) => {
  const e = el(tag, cls);
  e.append(...kids);
  return e;
};
export const href = (a: HTMLAnchorElement, url: string) => Object.assign(a, { href: url, target: "_blank", rel: "noopener" });
export const btn = (label: unknown, cls = "", url?: string, action?: unknown) => {
  const b = url ? href(el("a", `btn ${cls}`), url) : Object.assign(el("button", cls), { type: "button" });
  b.append(h("span", "", String(label ?? "")));
  return acts(b, action);
};
