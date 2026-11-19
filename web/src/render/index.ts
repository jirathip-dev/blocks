import { hooks } from "../gen/hooks.ts";
import type { Block, Fallback, Kind, Label, Tap, Toned } from "../gen/types.ts";
import type { Theme } from "../theme.ts";
import { button } from "./button.ts";
import { card } from "./card.ts";
import { chips } from "./chips.ts";
import { choice } from "./choice.ts";
import { composer } from "./composer.ts";
import { diagram } from "./diagram.ts";
import { form } from "./form.ts";
import { hero } from "./hero.ts";
import { images } from "./images.ts";
import { list } from "./list.ts";
import { media } from "./media.ts";
import { nav } from "./nav.ts";
import { prose } from "./prose.ts";
import { row } from "./row.ts";
import { run } from "./run.ts";
import { screen } from "./screen.ts";
import { secret } from "./secret.ts";
import { section } from "./section.ts";
import { sheet } from "./sheet.ts";
import { stat } from "./stat.ts";
import { text } from "./text.ts";

export type Blk = { [k: string]: unknown };
export type Post = { action: unknown; block?: unknown; values?: unknown; confirm?: unknown };
export type Store = { get(key: string): string | null; put(key: string, value: string | null): void };
export type Renderer = (b: Blk, c: Ctx) => HTMLElement | null;
export type Ctx = {
  screen: string;
  act: (a: Post, el?: HTMLElement) => Promise<boolean>;
  tap: (t: unknown) => void;
  open: Set<string>;
  theme: Theme;
  store: Store;
  apps?: Record<string, Renderer>;
};

export const isBlk = (v: unknown): v is Blk => typeof v === "object" && v !== null;
export const obj = (v: unknown): Blk => (isBlk(v) ? v : {});
export const blks = (v: unknown): Blk[] => (Array.isArray(v) ? v.filter(isBlk) : []);
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
export const urlOf = (t?: Tap | null): string | undefined => t?.url ?? undefined;
export const btn = (label: unknown, cls = "", url?: string) => {
  const b = url ? href(el("a", `btn ${cls}`), url) : Object.assign(el("button", cls), { type: "button" });
  b.append(h("span", "", String(label ?? "")));
  return b;
};
export const tone = (v: Toned): Label => (typeof v === "string" ? { text: v } : v);

export function md(s: unknown, refs = false): string {
  const link = new RegExp(String.raw`\[([^\]]+)\]\((https?:[^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)])|\b(${refs ? "t\\d+" : "(?!)"})\b`, "g");
  const a = (_: string, t: string, u: string, bare: string, ref: string) =>
    ref ? `<a href="#" data-thread="${ref}">${ref}</a>` : `<a href="${u ?? bare}" target=_blank rel=noopener>${t ?? bare}</a>`;
  return String(s ?? "")
    .split(/```(?:[a-z]*)\n?/)
    .map((part, i) =>
      i % 2
        ? `<div class=cb><pre>${esc(part.replace(/\n$/, ""))}</pre><button type=button class=cpy><span>copy</span></button></div>`
        : esc(part).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(link, a).replace(/\n/g, "<br>"),
    )
    .join("");
}

/// `{since}` as an age, `{since, label}` its label with `{}` the age, `{until, label}` with `{rel}` the minutes left, else the value.
export function value(v: unknown): string {
  if (isBlk(v) && "until" in v) return String(v.label ?? "").replace("{rel}", `${Math.max(0, Math.round((Date.parse(String(v.until)) - Date.now()) / 60000))}m`);
  if (isBlk(v) && "since" in v) {
    const s = Math.max(0, (Date.now() - Date.parse(String(v.since))) / 1000);
    if (v.label != null) return String(v.label).replace("{}", s < 120 ? `${Math.floor(s)}s` : s < 7200 ? `${Math.floor(s / 60)}m` : s < 172800 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`);
    return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d`;
  }
  return String(v ?? "");
}
export const ticked = (v: unknown): Node | string => {
  if (!(isBlk(v) && ("since" in v || "until" in v))) return value(v);
  const s = h("span", "", value(v));
  s.dataset.tick = JSON.stringify(v);
  return s;
};
/// Redraws every age under `root`; the shell calls it once a second.
export const tick = (root: ParentNode) =>
  root.querySelectorAll<HTMLElement>("[data-tick]").forEach((e) => {
    const t = value(JSON.parse(e.dataset.tick ?? "null"));
    if (e.textContent !== t) e.textContent = t;
  });

export const draft = (i: HTMLInputElement, key: string, store: Store) => {
  i.dataset.draft = key;
  i.value = store.get(key) ?? i.value;
  i.addEventListener("input", () => store.put(key, i.value || null));
};
/// Clears the drafts of the fields under `box`, here and in any copy on the page, once their action succeeded.
export const sent = (box: Element, store: Store) =>
  box.querySelectorAll<HTMLInputElement>("[data-draft]").forEach((i) => {
    const k = i.dataset.draft ?? "";
    store.put(k, null);
    document.querySelectorAll<HTMLInputElement>(`[data-draft="${CSS.escape(k)}"]`).forEach((x) => {
      x.value = x.dataset.was ?? "";
    });
  });

export function toggle(e: HTMLElement, id: unknown, c: Ctx, folds = false) {
  const k = `${folds ? "" : "sw:"}${id}`;
  if (c.open.has(k)) c.open.delete(k);
  else c.open.add(k);
  if (folds) e.dispatchEvent(new CustomEvent("redraw", { bubbles: true }));
  else if (e.nextElementSibling instanceof HTMLElement) e.nextElementSibling.hidden = !c.open.has(k);
}

const isFallback = (v: unknown): v is Fallback => isBlk(v);

export function fallback(b: Blk, c: Ctx): HTMLElement {
  const box = el("div");
  box.dataset.fallback = "";
  const f = b.fallback ?? { title: b.type };
  if (isFallback(f) && f.title != null) box.append(row({ title: f.title, subtitle: f.subtitle, tap: f.tap }, c));
  box.append(...kids(b.blocks, c));
  return box;
}

/// A core kind HTML does not draw yet: its fallback, then its children, until `_issue` draws it.
export const gap = (_issue: number): Renderer => fallback;

type Of<K extends Kind> = Extract<Block, { type: K }>;

export const R: { [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null } = {
  screen,
  sheet,
  section,
  list,
  row,
  card,
  choice,
  form,
  config: gap(40),
  secret,
  run,
  button,
  chips,
  stat,
  text,
  images,
  web: gap(41),
  diff: gap(42),
  editor: gap(43),
  scene: gap(38),
  diagram,
  composer,
  prose,
  hero,
  media,
  nav,
  island: gap(21),
};

const core = (b: Blk): b is Of<Kind> => Object.prototype.hasOwnProperty.call(hooks, String(b.type));
const view = <K extends Kind>(t: K, b: Of<K>, c: Ctx) => R[t](b, c);

/// A block as DOM with its hooks: its kind's view, the app's, else its fallback and then its children.
export function render(b: Blk, c: Ctx): HTMLElement | null {
  const t = String(b.type);
  const own = core(b);
  const e = own ? view(b.type, b, c) : (c.apps?.[t] ?? fallback)(b, c);
  if (!e) return null;
  e.classList.add("b", ...(own ? [] : ["b-app"]), `b-${t}`);
  e.dataset.block = t;
  if (b.id != null) e.dataset.id = String(b.id);
  const v = own ? hooks[b.type].variant : null;
  if (v && b[v] != null) e.dataset.variant = String(b[v]);
  if (typeof b.tone === "string") e.dataset.tone = b.tone;
  return e;
}

export function kids(bs: unknown, c: Ctx): HTMLElement[] {
  return blks(bs)
    .map((b) => render(b, c))
    .filter((e): e is HTMLElement => e !== null);
}
