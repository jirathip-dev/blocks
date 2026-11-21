import type { Scheme } from "../gen/schemes.ts";
import type { Answer, Block, Toast } from "../gen/types.ts";
import { type Editing, editor } from "../arrange.ts";
import { behave } from "../behave.ts";
import { apply } from "../core/apply.ts";
import type { OnFile } from "../core/field/files.ts";
import { type Blk, isBlk } from "../core/tree.ts";
import { settle } from "../motion.ts";
import { obj, type Post, posted, type Store } from "../render/ctx.ts";
import { btn, el, h } from "../render/dom.ts";
import { tick } from "../render/text.ts";
import { stream } from "../stream.ts";
import { plain, type Theme } from "../theme.ts";
import { toasts } from "../toasts.ts";
import { type AppBlocks, type Host, host } from "./host.ts";
import { ALWAYS, isScreen, type Layout, type Resolved, resolved, SHEET, walk } from "./layout.ts";
import { looks, row, wearer } from "./look.ts";
import { confirmer, type Sheet, sheet } from "./sheet.ts";
import { local } from "./store.ts";

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

type Wear = (name: string | null, keep?: Store) => void;
type View = { source: string; path: string; back: string[]; box: HTMLElement; body: HTMLElement; model?: Block | undefined; built: Set<string>; host: Host; stop?: (() => void) | undefined; sync: () => void };
type Tab = { node: Resolved; button: HTMLElement; pane: HTMLElement; view?: View | undefined };
type Shell = {
  o: Mount;
  store: Store;
  theme: Theme;
  live: (source: string) => ReturnType<typeof stream>;
  notes: ReturnType<typeof toasts>;
  ask: (c: Blk) => Promise<boolean>;
  sheet: Sheet;
  sheetView?: View | undefined;
};

/// Draws `o.layout` into `o.root`: its tabs, cards and menu, each screen kept and live on its source's one stream.
export function mount(o: Mount): { layout(next: Layout): void; close(): void } {
  const store = o.store ?? local();
  const theme = o.theme ?? plain;
  for (const href of o.css ?? []) document.head.append(Object.assign(el("link"), { rel: "stylesheet", href }));
  const { look, wear } = wearer(o.schemes ?? {}, theme);
  wear(store.get("b:look"));
  const wide = matchMedia("(min-width: 1000px)");
  const ed = o.edit && editor(o.edit, o.root);
  let shell: { close(): void } = { close() {} };
  const change = () => {
    shell.close();
    shell = draw(o, store, theme, wear, wide.matches, ed ? [ed.tab] : []);
    ed?.draw(resolved(o.layout.root, wide.matches), wide.matches ? "wide" : "compact");
  };
  change();
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

const say = (s: Shell, v: View, t: Toast, first = false) => {
  const u = t.undo;
  s.notes.say(t, u ? (b) => act(s, v, { action: u.action, values: u.values, confirm: u.confirm }, b, true) : undefined, first);
};

function paint(s: Shell, v: View) {
  const e = v.model ? v.host.draw(v.model) : null;
  v.body.replaceChildren(...(e ? [e] : []));
  v.sync();
  const b = btn("‹ back", "b-back");
  b.onclick = () => back(s, v);
  v.box.replaceChildren(...(v.back.length && v !== s.sheetView ? [b] : []), v.body);
  if (v === s.sheetView) s.sheet.frame(String(obj(v.model)["title"] ?? ""), v.back.length ? () => back(s, v) : undefined, v.model?.type === "modal" || v.model?.type === "sheet");
  if (!e || v.built.has(v.path)) return;
  v.built.add(v.path);
  requestAnimationFrame(() => settle(v.body));
}

function view(s: Shell, source: string, path: string, box: HTMLElement): View {
  const body = el("div", "b-view");
  const screen = () => String(v.model?.id ?? v.path);
  const locale = () => (v.model && (v.model.type === "screen" || v.model.type === "modal" || v.model.type === "sheet") ? (v.model.locale ?? undefined) : undefined);
  const own = { theme: s.theme, store: s.store, apps: s.o.blocks, file: s.o.file };
  const v: View = { source, path, back: [], box, body, built: new Set(), host: host(own, { screen, locale, act: (a, b) => act(s, v, a, b), tap: (t) => tap(s, v, t) }), sync: () => {} };
  v.sync = behave(body, () => v.model);
  v.body.addEventListener("redraw", () => paint(s, v));
  return v;
}

function show(s: Shell, v: View) {
  const kept = `b:${v.source}${v.path}`;
  const was = s.store.get(kept);
  if (!v.model && was) v.model = JSON.parse(was);
  paint(s, v);
  const p = v.host.patch(v.body, () => v.model ?? { type: "screen" }, v.sync);
  const st = s.live(v.source);
  st.open(v.path, (screen, ops) => {
    v.model = screen;
    s.store.put(kept, JSON.stringify(screen));
    if (!ops) return paint(s, v);
    p.queue(ops);
    p.flush();
  });
  v.stop = () => {
    p.drop();
    st.close(v.path);
  };
}

const hide = (v?: View) => {
  v?.stop?.();
  if (v) v.stop = undefined;
};

function go(s: Shell, v: View, path: string, push = true) {
  hide(v);
  if (push) v.back.push(v.path);
  v.path = path;
  v.model = undefined;
  v.host.open.clear();
  show(s, v);
}

const back = (s: Shell, v: View) => {
  const p = v.back.pop();
  if (p !== undefined) go(s, v, p, false);
};

function openSheet(s: Shell, source: string, path: string) {
  if (s.sheetView && !s.sheet.box.hidden) return go(s, s.sheetView, path);
  s.sheet.close();
  const v = view(s, source, path, s.sheet.body);
  s.sheetView = v;
  s.sheet.box.hidden = false;
  show(s, v);
}

function tap(s: Shell, v: View, t: unknown) {
  const x = obj(t);
  if (typeof x["sheet"] === "string") openSheet(s, v.source, x["sheet"]);
  else if (typeof x["open"] === "string") go(s, v, x["open"]);
  else if (typeof x["copy"] === "string") void navigator.clipboard?.writeText(x["copy"]).then(() => say(s, v, { title: "copied" }));
  else if (typeof x["action"] === "string") void act(s, v, { action: x["action"], values: x["values"] });
}

async function act(s: Shell, v: View, a: Post, b?: HTMLElement, first = false): Promise<boolean> {
  if (isBlk(a.confirm) && !(await s.ask(a.confirm))) return false;
  b?.setAttribute("aria-busy", "true");
  try {
    const body = posted(v.host.ctx().screen, a);
    const r = await fetch(s.o.url(v.source, "/action"), { method: "POST", headers: { "content-type": "application/json" }, body });
    const j: Answer = await r.json().catch(() => ({}));
    if (!r.ok) {
      say(s, v, { title: `action failed: ${r.status}`, ...j.toast, tone: "bad" }, first);
      return false;
    }
    const next = v.model && j.ops?.length ? apply(v.model, j.ops) : undefined;
    if (next) {
      v.model = next;
      paint(s, v);
    }
    if (j.close && v === s.sheetView) s.sheet.close();
    if (j.open) tap(s, v, { open: j.open });
    if (j.toast) say(s, v, j.toast, first);
    return true;
  } catch (e) {
    say(s, v, { title: e instanceof Error ? e.message : String(e), tone: "bad" }, first);
    return false;
  } finally {
    b?.removeAttribute("aria-busy");
  }
}

function part(s: Shell, n: Resolved, box: HTMLElement): View | undefined {
  box.dataset["place"] = n.place;
  box.dataset["id"] = n.id;
  if (!isScreen(n)) {
    const c = s.o.components?.[n.type]?.(n);
    box.replaceChildren(...(c ? [c] : []));
    return undefined;
  }
  const v = view(s, n.source, n.path, box);
  show(s, v);
  return v;
}

function strip(s: Shell, nodes: Resolved[], main: HTMLElement, bar: HTMLElement) {
  const tabs: Tab[] = nodes.filter((n) => n.place === "strip").map((node) => ({ node, button: btn(node.label ?? node.id, "b-tab"), pane: el("section", "b-pane") }));
  let cur: Tab | undefined;
  const pick = (t: Tab) => {
    const was = cur;
    if (was === t) return;
    cur = t;
    t.pane.hidden = false;
    t.button.classList.add("on");
    if (t.view) show(s, t.view);
    else t.view = part(s, t.node, t.pane);
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
    bar.append(t.button);
    main.append(t.pane);
  }
  return { tabs, pick, cur: () => cur };
}

function menu(s: Shell, listed: Resolved[], wear: Wear, cur: () => Tab | undefined) {
  const lookSheet = () => s.sheet.show("look", [looks(s.o.schemes ?? {}, s.store, wear, lookSheet)], all);
  const all = () => {
    const open = (n: Resolved) => () => {
      if (!isScreen(n)) return s.sheet.show(n.label ?? n.id, [s.o.components?.[n.type]?.(n) ?? el("div")], all);
      const at = cur()?.view;
      if (n.place === "push" && at) {
        s.sheet.close();
        return go(s, at, n.path);
      }
      openSheet(s, n.source, n.path);
    };
    s.sheet.show("menu", [h("div", "list", ...listed.map((n) => row(n.label ?? n.id, open(n))), row("look", lookSheet))]);
  };
  return all;
}

function draw(o: Mount, store: Store, theme: Theme, wear: Wear, wide: boolean, extra: HTMLElement[]): { close(): void } {
  const nodes = walk(resolved(o.layout.root, wide)).filter((n) => n.place !== "hidden");
  const streams = new Map<string, ReturnType<typeof stream>>();
  const live = (source: string) => {
    const st = streams.get(source) ?? stream({ url: o.url(source, "/stream"), state: (x) => (o.root.dataset["stream"] = x) });
    streams.set(source, st);
    return st;
  };
  const ask = confirmer();
  const s: Shell = {
    o,
    store,
    theme,
    live,
    notes: toasts(),
    ask: ask.ask,
    sheet: sheet(() => {
      hide(s.sheetView);
      s.sheetView = undefined;
    }),
  };
  const bar = el("nav", "b-tabs");
  const main = el("main", "b-main");
  const { tabs, pick, cur } = strip(s, nodes, main, bar);
  const placed = nodes.filter((n) => ALWAYS.includes(n.place));
  const parts = placed.map(() => el("section", "b-part"));
  const always = placed.map((n, i) => part(s, n, parts[i] ?? el("section")));
  const more = btn("menu", "b-tab b-menu");
  more.onclick = menu(s, nodes.filter((n) => SHEET.includes(n.place)), wear, cur);
  bar.append(more, ...extra);
  o.root.append(...parts, bar, main, s.sheet.box, ask.box, s.notes.box);
  const first = tabs.find((t) => `#${t.node.id}` === location.hash) ?? tabs[0];
  if (first) pick(first);
  return {
    close() {
      for (const v of [...tabs.map((t) => t.view), ...always, s.sheetView]) hide(v);
      for (const e of [...parts, bar, main, s.sheet.box, ask.box]) e.remove();
      s.notes.close();
    },
  };
}
