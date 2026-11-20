import { hooks, roles } from "../gen/hooks.ts";
import type { Act, Block, Fallback, Kind, Label, Locale, Tap, Toned } from "../gen/types.ts";
import { linkable } from "../core/check.ts";
import { actionOf } from "../core/eval.ts";
import type { OnFile } from "../core/field/files.ts";
import { value } from "../core/text.ts";
import { type Blk, blks, isBlk, named } from "../core/tree.ts";
import { island, isTag } from "../island.ts";
import type { Held } from "../gesture.ts";
import type { Theme } from "../theme.ts";
import { button } from "./button.ts";
import { card } from "./card.ts";
import { chart } from "./chart.ts";
import { chips } from "./chips.ts";
import { choice } from "./choice.ts";
import { composer } from "./composer.ts";
import { config } from "./config.ts";
import { diagram } from "./diagram.ts";
import { diff } from "./diff.ts";
import { editor } from "./editor.ts";
import { form } from "./form.ts";
import { hero } from "./hero.ts";
import { images } from "./images.ts";
import { lines } from "./lines.ts";
import { list } from "./list.ts";
import { media } from "./media.ts";
import { nav } from "./nav.ts";
import { pages } from "./pages.ts";
import { prose } from "./prose.ts";
import { row } from "./row.ts";
import { run } from "./run.ts";
import { scene } from "./scene.ts";
import { screen } from "./screen.ts";
import { secret } from "./secret.ts";
import { section } from "./section.ts";
import { sheet } from "./sheet.ts";
import { stat } from "./stat.ts";
import { table } from "./table.ts";
import { steps } from "./steps.ts";
import { text } from "./text.ts";
import { timeline } from "./timeline.ts";
import { toast } from "./toast.ts";
import { web } from "./web.ts";

export { type Blk, blks, isBlk, named };
export type { OnFile, Picked } from "../core/field/files.ts";
export type Post = { action: unknown; block?: unknown; values?: unknown; confirm?: unknown };
export type Store = { get(key: string): string | null; put(key: string, value: string | null): void };
export type Renderer = (b: Blk, c: Ctx) => HTMLElement | null;
export type Ctx = {
  screen: string;
  locale?: Locale;
  act: (a: Post, el?: HTMLElement) => Promise<boolean>;
  tap: (t: unknown) => void;
  open: Set<string>;
  theme: Theme;
  store: Store;
  apps?: Record<string, Renderer>;
  drop?: (what: string) => void;
  held?: Map<string, Held>;
  view?: Map<string, Record<string, unknown>>;
  file?: OnFile;
};

export const obj = (v: unknown): Blk => (isBlk(v) ? v : {});
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
export { linkable };
export const urlOf = (t?: Tap | null): string | undefined => (t?.url != null && linkable(t.url) ? t.url : undefined);
/// The action a tap sends: the tap's own when it goes nowhere else, else `action`.
export const sends = (t?: Tap | null, action?: unknown): unknown => (t ? (t.url != null || t.open != null || t.sheet != null ? null : t.action) : action);
/// Marks `e` with the action a tap on it sends, as `data-action`.
export const acts = <E extends HTMLElement>(e: E, action: unknown): E => {
  if (typeof action === "string" && action) e.dataset.action = action;
  return e;
};
/// Marks an act's button with the action its `enabled` turns off, as `data-act`.
export const offable = <E extends HTMLElement>(e: E, a: Act): E => {
  const k = actionOf(a);
  if (k) e.dataset.act = k;
  return e;
};
export const btn = (label: unknown, cls = "", url?: string, action?: unknown) => {
  const b = url ? href(el("a", `btn ${cls}`), url) : Object.assign(el("button", cls), { type: "button" });
  b.append(h("span", "", String(label ?? "")));
  return acts(b, action);
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

export const ticked = (v: unknown): Node | string => {
  if (isBlk(v) && typeof v.get === "string") {
    const s = el("span", "");
    s.dataset.get = v.get;
    return s;
  }
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
  config,
  secret,
  run,
  button,
  chips,
  stat,
  text,
  images,
  web,
  diff,
  editor,
  scene,
  diagram,
  chart,
  composer,
  lines,
  prose,
  hero,
  media,
  nav,
  island: (b, c) =>
    isTag(b.name)
      ? island(b, [...fallback(b, c).childNodes], (action, values) => void c.act({ action, block: b.id, values }), (n) => c.drop?.(`event ${b.id ?? ""} ${n}`))
      : fallback(b, c),
  table,
  steps,
  toast,
  pages,
  timeline,
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
  const native = e.tagName === "BUTTON" ? "button" : e.tagName === "A" && e.hasAttribute("href") ? "link" : null;
  e.setAttribute("role", e.getAttribute("role") ?? native ?? roles[t] ?? "group");
  e.setAttribute("aria-label", named(b, t));
  return e;
}

export function kids(bs: unknown, c: Ctx): HTMLElement[] {
  return blks(bs)
    .map((b) => render(b, c))
    .filter((e): e is HTMLElement => e !== null);
}
