import type { LayoutPlace, LayoutTransition } from "./gen/layout.ts";
import type { Scheme } from "./gen/schemes.ts";
import type { Answer, Block, Kind, Op, Toast } from "./gen/types.ts";
import { type Editing, editor } from "./arrange.ts";
import { behave } from "./behave.ts";
import type { Held } from "./gesture.ts";
import { choose, type Pair, type Scale } from "./core/look.ts";
import { apply, patcher } from "./patch.ts";
import { type Blk, blks, btn, type Ctx, el, h, isBlk, linkable, obj, type OnFile, type Post, type Renderer, render, type Store, tick } from "./render/index.ts";
import { settle } from "./motion.ts";
import { stream } from "./stream.ts";
import { toasts } from "./toasts.ts";
import { plain, type Theme, tiles } from "./theme.ts";

export type { Editing } from "./arrange.ts";
export { behave } from "./behave.ts";
export { evaluate, start, view } from "./core/eval.ts";
export { dump } from "./dump.ts";
export { settle } from "./motion.ts";
export { apply, patcher } from "./patch.ts";
export { el, h, kids, render, type OnFile, type Picked } from "./render/index.ts";
export { packs, plain, tiles } from "./theme.ts";

/// A layout node as the server's checked `layout.json` writes it; `P` is its place, per size class or resolved.
export type Placed<P> = {
  type: string;
  id: string;
  source?: string;
  path?: string;
  label?: string;
  place: P;
  transition: LayoutTransition;
  config?: Record<string, unknown>;
  slots?: Record<string, Placed<P>[]>;
};
/// The checked `layout.json`: a `nav` root placed per size class.
export type Layout = { format: number; theme?: string; root: Placed<{ compact: LayoutPlace; wide: LayoutPlace }> };
/// The tree with one place per node, which is all the shell reads.
export type Resolved = Placed<LayoutPlace>;
/// An app's own block kinds: a core kind's name here does not compile.
export type AppBlocks = Record<string, Renderer> & { [K in Kind]?: never };
/// What a page hands `mount`: where to draw, the layout, where a source's screens live, and the app's own parts.
export type Mount = {
  root: HTMLElement;
  layout: Layout;
  url: (source: string, path: string) => string;
  blocks?: AppBlocks;
  components?: Record<string, (n: Resolved) => HTMLElement | null>;
  css?: string[];
  theme?: Theme;
  schemes?: Record<string, Scheme>;
  store?: Store;
  edit?: Editing;
  file?: OnFile;
};

type View = { source: string; path: string; back: string[]; open: Set<string>; box: HTMLElement; body: HTMLElement; model?: Block; built: Set<string>; held: Map<string, Held>; view: Map<string, Record<string, unknown>>; stop?: () => void; sync: () => void };
type Tab = { node: Resolved; button: HTMLElement; pane: HTMLElement; view?: View };

const ALWAYS: LayoutPlace[] = ["cards", "column", "panel", "inline"];
const SHEET: LayoutPlace[] = ["menu", "sheet", "push"];

/// The tree for one size class: each node keeps the place the file gave that size.
export function resolved(n: Layout["root"], wide: boolean): Resolved {
  const slots = n.slots && Object.fromEntries(Object.entries(n.slots).map(([k, v]) => [k, v.map((x) => resolved(x, wide))]));
  return { ...n, place: wide ? n.place.wide : n.place.compact, slots };
}

const walk = (n: Resolved): Resolved[] => Object.values(n.slots ?? {}).flatMap((ns) => ns.flatMap((x) => [x, ...walk(x)]));
const isScreen = (n: Resolved): n is Resolved & { source: string; path: string } => n.type === "screen" && !!n.source && !!n.path;

function local(): Store {
  return {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    put: (k, v) => {
      try {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch {
        return;
      }
    },
  };
}

const row = (label: string, f: () => void, on = false) => {
  const r = h("div", `row tap${on ? " on" : ""}`, h("span", "rm", h("span", "rt", `${on ? "✓ " : ""}${label}`)));
  r.tabIndex = 0;
  r.setAttribute("role", "button");
  r.onclick = f;
  return r;
};

/// A look on offer: one scheme, or a light and dark pair with the style it wears.
export type Worn = Scheme | (Pair & { style?: Scale });

function wearer(schemes: Record<string, Worn>, theme: Theme, own: Element | null = null) {
  const look = el("style");
  look.id = "b-look";
  document.head.append(look);
  const base = own?.textContent ?? "";
  const wear = (name: string | null, keep?: Store) => {
    keep?.put("b:look", name);
    const dark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
    const w = name !== null && Object.prototype.hasOwnProperty.call(schemes, name) ? schemes[name] : undefined;
    if (own) own.textContent = w && !("tokens" in w) ? "" : base;
    look.textContent = tiles + (!w ? (name ? theme.css(choose(name, dark)) : "") : "tokens" in w ? theme.css(w) : theme.css(w, w.style));
    if (w && name) document.documentElement.dataset.look = name;
    else document.documentElement.removeAttribute("data-look");
  };
  return { look, wear };
}

function looks(schemes: Record<string, Worn>, store: Store, wear: (name: string | null, keep?: Store) => void, again: () => void): HTMLElement {
  const now = store.get("b:look");
  const pick = (name: string | null) => () => {
    wear(name, store);
    again();
  };
  const rows = Object.entries(schemes).map(([name, s]) => row("tokens" in s ? s.label : name, pick(name), name === now));
  return h("div", "list", row("the app's own", pick(null), !now), ...rows);
}

/// Draws `o.layout` into `o.root`: its tabs, cards and menu, each screen kept and live on its source's one stream.
export function mount(o: Mount): { layout(next: Layout): void; close(): void } {
  const store = o.store ?? local();
  const theme = o.theme ?? plain;
  for (const href of o.css ?? []) document.head.append(Object.assign(el("link"), { rel: "stylesheet", href }));
  const { look, wear } = wearer(o.schemes ?? {}, theme);
  wear(store.get("b:look"));
  const wide = matchMedia("(min-width: 1000px)");
  const ed = o.edit && editor(o.edit, { theme, store });
  const drawn = () => {
    const s = draw(o, store, theme, wear, wide.matches, ed ? [ed.tab] : []);
    if (ed) o.root.append(ed.sheet);
    ed?.draw(resolved(o.layout.root, wide.matches), wide.matches ? "wide" : "compact");
    return s;
  };
  let shell = drawn();
  const change = () => {
    shell.close();
    shell = drawn();
  };
  wide.addEventListener("change", change);
  const timer = setInterval(() => tick(o.root), 1000);
  return {
    layout(next) {
      o = { ...o, layout: next };
      change();
    },
    close() {
      ed?.sheet.remove();
      wide.removeEventListener("change", change);
      clearInterval(timer);
      shell.close();
      look.remove();
    },
  };
}

function draw(o: Mount, store: Store, theme: Theme, wear: (name: string | null, keep?: Store) => void, wide: boolean, extra: HTMLElement[]): { close(): void } {
  const nodes = walk(resolved(o.layout.root, wide)).filter((n) => n.place !== "hidden");
  const streams = new Map<string, ReturnType<typeof stream>>();
  const live = (source: string) => {
    const s = streams.get(source) ?? stream({ url: o.url(source, "/stream"), state: (st) => (o.root.dataset.stream = st) });
    streams.set(source, s);
    return s;
  };
  const strip = el("nav", "b-tabs");
  const main = el("main", "b-main");
  const notes = toasts();
  const ask = el("div", "b-confirm");
  const sheet = el("div", "b-sheet");
  const head = el("header", "b-sheet__head");
  const sheetBody = el("div", "b-sheet__body");
  ask.hidden = sheet.hidden = true;
  sheet.append(h("div", "b-sheet__card", head, sheetBody));
  sheet.addEventListener("click", (e) => e.target === sheet && closeSheet());
  let sheetView: View | undefined;
  const say = (v: View, t: Toast, first = false) => {
    const u = t.undo;
    notes.say(t, u ? (b) => act(v, { action: u.action, values: u.values, confirm: u.confirm }, b, true) : undefined, first);
  };

  const confirmed = (c: Blk): Promise<boolean> =>
    new Promise((done) => {
      const no = btn("cancel");
      const yes = btn(c.ok ?? "ok", c.destructive ? "bad" : "");
      const end = (v: boolean) => {
        ask.hidden = true;
        done(v);
      };
      no.onclick = () => end(false);
      yes.onclick = () => end(true);
      ask.replaceChildren(h("p", "", h("b", "", String(c.title ?? ""))), ...(c.message ? [h("p", "m", String(c.message))] : []), h("div", "bar", no, yes));
      ask.hidden = false;
      yes.focus();
    });

  const ctx = (v: View): Ctx => ({
    screen: String(v.model?.id ?? v.path),
    locale: v.model && (v.model.type === "screen" || v.model.type === "sheet") ? (v.model.locale ?? undefined) : undefined,
    act: (a, b) => act(v, a, b),
    tap: (t) => tap(v, t),
    open: v.open,
    theme,
    store,
    apps: o.blocks,
    held: v.held,
    view: v.view,
    file: o.file,
  });

  const paint = (v: View) => {
    const e = v.model ? render(v.model, ctx(v)) : null;
    v.body.replaceChildren(...(e ? [e] : []));
    v.sync();
    const b = btn("‹ back", "b-back");
    b.onclick = () => back(v);
    v.box.replaceChildren(...(v.back.length && v !== sheetView ? [b] : []), v.body);
    if (v === sheetView) heading(v);
    if (!e || v.built.has(v.path)) return;
    v.built.add(v.path);
    requestAnimationFrame(() => settle(v.body));
  };

  const view = (source: string, path: string, box: HTMLElement): View => {
    const body = el("div", "b-view");
    const v: View = { source, path, back: [], open: new Set(), box, body, built: new Set(), held: new Map(), view: new Map(), sync: () => {} };
    v.sync = behave(body, () => v.model);
    v.body.addEventListener("redraw", () => paint(v));
    return v;
  };

  const show = (v: View) => {
    const kept = `b:${v.source}${v.path}`;
    const was = store.get(kept);
    if (!v.model && was) v.model = JSON.parse(was);
    paint(v);
    const p = patcher({ root: v.body, model: () => v.model ?? { type: "screen" }, draw: (b) => render(b, ctx(v)), saved: v.sync });
    const s = live(v.source);
    s.open(v.path, (screen, ops) => {
      v.model = screen;
      store.put(kept, JSON.stringify(screen));
      if (!ops) return paint(v);
      p.queue(ops);
      p.flush();
    });
    v.stop = () => {
      p.drop();
      s.close(v.path);
    };
  };
  const hide = (v?: View) => {
    v?.stop?.();
    if (v) v.stop = undefined;
  };
  const go = (v: View, path: string, push = true) => {
    hide(v);
    if (push) v.back.push(v.path);
    v.path = path;
    v.model = undefined;
    v.open.clear();
    show(v);
  };
  const back = (v: View) => {
    const p = v.back.pop();
    if (p !== undefined) go(v, p, false);
  };

  const closeSheet = () => {
    hide(sheetView);
    sheetView = undefined;
    sheet.hidden = true;
  };
  const sheetWith = (title: string, body: HTMLElement[], prev?: () => void) => {
    hide(sheetView);
    sheetView = undefined;
    frame(title, prev);
    sheetBody.replaceChildren(...body);
    sheet.hidden = false;
  };
  const frame = (title: string, prev?: () => void) => {
    const x = btn("close", "b-sheet__close");
    x.onclick = closeSheet;
    const b = btn("‹ back", "b-back");
    if (prev) b.onclick = prev;
    head.replaceChildren(...(prev ? [b] : []), h("b", "b-sheet__title", title), x);
  };
  const heading = (v: View) => frame(String(obj(v.model).title ?? ""), v.back.length ? () => back(v) : undefined);
  const openSheet = (source: string, path: string) => {
    if (sheetView && !sheet.hidden) return go(sheetView, path);
    closeSheet();
    const v = view(source, path, sheetBody);
    sheetView = v;
    sheet.hidden = false;
    show(v);
  };

  const tap = (v: View, t: unknown) => {
    const x = obj(t);
    if (typeof x.sheet === "string") openSheet(v.source, x.sheet);
    else if (typeof x.open === "string") go(v, x.open);
    else if (typeof x.copy === "string") void navigator.clipboard?.writeText(x.copy).then(() => say(v, { title: "copied" }));
    else if (typeof x.action === "string") void act(v, { action: x.action, values: x.values });
  };

  const act = async (v: View, a: Post, b?: HTMLElement, first = false): Promise<boolean> => {
    if (isBlk(a.confirm) && !(await confirmed(a.confirm))) return false;
    b?.setAttribute("aria-busy", "true");
    try {
      const body = JSON.stringify({ action: a.action, block: a.block ?? undefined, values: a.values ?? undefined, screen: ctx(v).screen });
      const r = await fetch(o.url(v.source, "/action"), { method: "POST", headers: { "content-type": "application/json" }, body });
      const j: Answer = await r.json().catch(() => ({}));
      if (!r.ok) {
        say(v, { title: `action failed: ${r.status}`, ...j.toast, tone: "bad" }, first);
        return false;
      }
      const next = v.model && j.ops?.length ? apply(v.model, j.ops) : undefined;
      if (next) {
        v.model = next;
        paint(v);
      }
      if (j.close && v === sheetView) closeSheet();
      if (j.open) tap(v, { open: j.open });
      if (j.toast) say(v, j.toast, first);
      return true;
    } catch (e) {
      say(v, { title: e instanceof Error ? e.message : String(e), tone: "bad" }, first);
      return false;
    } finally {
      b?.removeAttribute("aria-busy");
    }
  };

  const part = (n: Resolved, box: HTMLElement): View | undefined => {
    box.dataset.place = n.place;
    box.dataset.id = n.id;
    if (!isScreen(n)) {
      const c = o.components?.[n.type]?.(n);
      box.replaceChildren(...(c ? [c] : []));
      return undefined;
    }
    const v = view(n.source, n.path, box);
    show(v);
    return v;
  };

  const tabs: Tab[] = nodes.filter((n) => n.place === "strip").map((node) => ({ node, button: btn(node.label ?? node.id, "b-tab"), pane: el("section", "b-pane") }));
  let cur: Tab | undefined;
  const pick = (t: Tab) => {
    const was = cur;
    if (was === t) return;
    cur = t;
    t.pane.hidden = false;
    t.button.classList.add("on");
    if (t.view) show(t.view);
    else t.view = part(t.node, t.pane);
    if (was) {
      hide(was.view);
      was.pane.hidden = true;
      was.button.classList.remove("on");
    }
    history.replaceState(null, "", `#${t.node.id}`);
  };
  for (const t of tabs) {
    t.button.onclick = () => pick(t);
    t.pane.hidden = true;
    strip.append(t.button);
    main.append(t.pane);
  }

  const parts = nodes.filter((n) => ALWAYS.includes(n.place)).map(() => el("section", "b-part"));
  const always = nodes.filter((n) => ALWAYS.includes(n.place)).map((n, i) => part(n, parts[i] ?? el("section")));
  const listed = nodes.filter((n) => SHEET.includes(n.place));
  const lookSheet = () => sheetWith("look", [looks(o.schemes ?? {}, store, wear, lookSheet)], menu);
  const menu = () => {
    const open = (n: Resolved) => () => {
      if (!isScreen(n)) return sheetWith(n.label ?? n.id, [o.components?.[n.type]?.(n) ?? el("div")], menu);
      if (n.place === "push" && cur?.view) {
        closeSheet();
        return go(cur.view, n.path);
      }
      openSheet(n.source, n.path);
    };
    sheetWith("menu", [h("div", "list", ...listed.map((n) => row(n.label ?? n.id, open(n))), row("look", lookSheet))]);
  };
  const more = btn("menu", "b-tab b-menu");
  more.onclick = menu;
  strip.append(more, ...extra);

  o.root.append(...parts, strip, main, sheet, ask, notes.box);
  const first = tabs.find((t) => `#${t.node.id}` === location.hash) ?? tabs[0];
  if (first) pick(first);

  return {
    close() {
      for (const v of [...tabs.map((t) => t.view), ...always, sheetView]) hide(v);
      for (const e of [...parts, strip, main, sheet, ask]) e.remove();
      notes.close();
    },
  };
}

const drawn = (b: Blk): [string, string][] =>
  [...(typeof b.id === "string" ? [[b.id, String(b.type)] satisfies [string, string]] : []), ...["blocks", "rows", "buttons"].flatMap((k) => (Array.isArray(b[k]) ? b[k].filter(isBlk).flatMap(drawn) : []))];

/// Takes over a page `site` wrote without redrawing it: its forms post in place and the stream patches it; false: it stays static.
export function adopt(o: { theme?: Theme; store?: Store; blocks?: AppBlocks } = {}): boolean {
  const data = document.getElementById("blocks-screen");
  const root = document.querySelector("main");
  if (!data || !root) return false;
  let model: Block = JSON.parse(data.textContent ?? "null");
  const want = new Map(drawn(obj(model)));
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-block]"));
  const top = [obj(model), ...blks(obj(model).blocks)];
  const off =
    els.find((e) => e.dataset.id && want.get(e.dataset.id) !== e.dataset.block)?.dataset.id ??
    top.find((b) => typeof b.id === "string" && !els.some((e) => e.dataset.id === b.id && e.dataset.block === b.type))?.id;
  if (off !== undefined) {
    console.warn(`blocks: the page stays static, block ${off} is missing or differs`);
    return false;
  }
  const screen = String(obj(model).id ?? "");
  const theme = o.theme ?? plain;
  const store = o.store ?? local();
  const schemes: Record<string, Worn> = JSON.parse(data.dataset.looks || "{}");
  const { wear } = wearer(schemes, theme, document.head.querySelector("style"));
  wear(store.get("b:look"));
  const sheet = el("div", "b-sheet");
  const lookSheet = () => {
    const x = btn("close", "b-sheet__close");
    x.onclick = () => (sheet.hidden = true);
    sheet.replaceChildren(h("div", "b-sheet__card", h("header", "b-sheet__head", h("b", "b-sheet__title", "look"), x), h("div", "b-sheet__body", looks(schemes, store, wear, lookSheet))));
    sheet.hidden = false;
    if (!sheet.isConnected) document.body.append(sheet);
  };
  sheet.addEventListener("click", (e) => e.target === sheet && (sheet.hidden = true));
  document.addEventListener("click", (e) => {
    const s = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-sheet]") : null;
    if (s) tap({ sheet: s.dataset.sheet });
  });
  const p = patcher({ root, model: () => model, draw: (b) => render(b, ctx) });
  behave(root, () => model);
  const take = (ops: Op[]) => {
    model = apply(model, ops) ?? model;
    p.queue(ops);
  };
  const act = async (a: Post): Promise<boolean> => {
    if (isBlk(a.confirm) && !confirm(String(a.confirm.title ?? ""))) return false;
    const body = JSON.stringify({ screen, action: a.action, block: a.block ?? undefined, values: a.values ?? undefined });
    const r = await fetch(data.dataset.action ?? "", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => undefined);
    const j: Answer = (await r?.json().catch(() => undefined)) ?? {};
    if (j.ops?.length) take(j.ops);
    if (j.open && linkable(j.open)) location.assign(j.open);
    return !!r?.ok;
  };
  const tap = (t: unknown) => {
    const x = obj(t);
    if (typeof x.url === "string") {
      if (linkable(x.url)) open(x.url, "_blank", "noopener");
    } else if (typeof x.open === "string") {
      if (linkable(x.open)) location.assign(x.open);
    }
    else if (typeof x.action === "string") void act({ action: x.action, values: x.values });
    else if (x.sheet === "look") lookSheet();
    else if (typeof x.sheet === "string" && x.sheet.startsWith("look:")) wear(x.sheet.slice(5), store);
  };
  const ctx: Ctx = { screen, act, tap, open: new Set(), theme, store, apps: o.blocks, held: new Map(), view: new Map() };
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (!(f instanceof HTMLFormElement) || !f.elements.namedItem("_action")) return;
    e.preventDefault();
    const v: Blk = {};
    new FormData(f).forEach((x, k) => (v[k] = x));
    const { _block, _action, _screen, ...values } = v;
    void act({ action: _action, block: _block || undefined, values });
  });
  if (data.dataset.stream)
    stream({ url: data.dataset.stream }).open(location.pathname, (s, ops) => {
      const same = JSON.stringify(s) === JSON.stringify(model);
      model = s;
      if (ops) return p.queue(ops);
      if (same) return;
      root.replaceChildren(...[render(s, ctx)].filter((e): e is HTMLElement => e !== null));
    });
  return true;
}

if (typeof document !== "undefined" && document.getElementById?.("blocks-screen")) adopt();
