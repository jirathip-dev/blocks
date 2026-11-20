import type { LayoutEdit, LayoutPlace, SizeClass } from "./gen/layout.ts";
import { type Nudge, type Rules, same } from "./core/gesture.ts";
import { places, stay, type Tree } from "./core/layout.ts";
import { gestured } from "./gesture.ts";
import type { Ctx } from "./render/ctx.ts";
import { btn, el, h } from "./render/dom.ts";

/// What a host hands the shell to offer an edit mode: the slots each component holds, and where an edit is saved.
export type Editing = { slots: Record<string, string[]>; save: (e: LayoutEdit) => Promise<boolean | string> };
type Node = Omit<Tree, "slots"> & { label?: string; place: LayoutPlace; slots?: Record<string, Node[]> };

const PLACES: LayoutPlace[] = ["push", "sheet", "panel", "column", "strip", "cards", "menu", "inline", "hidden"];
const STEPS: [string, Nudge][] = [
  ["Move earlier", { dir: "up" }],
  ["Move later", { dir: "down" }],
  ["Swap with the previous", { dir: "left" }],
  ["Swap with the next", { dir: "right" }],
  ["Move to the previous slot", { dir: "up", big: true }],
  ["Move to the next slot", { dir: "down", big: true }],
];

const read = (n: Node, depth = 0): [Node, number][] => [[n, depth], ...Object.keys(n.slots ?? {}).sort().flatMap((k) => (n.slots?.[k] ?? []).flatMap((c) => read(c, depth + 1)))];
const slotOf = (e: LayoutEdit) => (e.edit === "move" ? `${e.into}\n${e.slot}` : "");

function rules(tree: Node, slots: Record<string, string[]>, name: (id: string) => string): Rules<{ id: string }, string, number, LayoutEdit> {
  const walk = (g: string, from: LayoutEdit, step: number, ok: (e: LayoutEdit) => boolean) => {
    const all = places(tree, slots, g);
    for (let i = all.findIndex((p) => same(p, from)) + step; i >= 0 && i < all.length; i += step) {
      const e = all[i];
      if (e && ok(e)) return e;
    }
    return null;
  };
  return {
    word: (_, g) => (stay(tree, g) ? "move" : null),
    start: (_, g) => stay(tree, g),
    candidate: (_, g, r) => {
      const s = stay(tree, g);
      const all = places(tree, slots, g);
      return s ? (all[all.findIndex((p) => same(p, s)) + r] ?? null) : null;
    },
    nudge: (_, g, from, n) => {
      const step = n.dir === "up" || n.dir === "left" ? -1 : 1;
      if (n.dir === "left" || n.dir === "right") return walk(g, from, step, (e) => e.edit === "swap");
      return walk(g, from, step, (e) => e.edit === "move" && (!n.big || slotOf(e) !== slotOf(from)));
    },
    steps: () => STEPS,
    says: (_, __, c) => (c.edit === "swap" ? `swapped with ${name(c.b)}` : c.edit === "move" ? `${c.before ? `before ${name(c.before)}` : "last"} in ${c.slot} of ${name(c.into)}` : c.place),
  };
}

function arrange(tree: Node, size: SizeClass, o: Editing, c: Pick<Ctx, "theme" | "store">, refuse: (why: string) => void, done: () => void): HTMLElement {
  const nodes = read(tree);
  const name = (id: string) => nodes.find(([n]) => n.id === id)?.[0].label ?? id;
  const rows = new Map<string, HTMLElement>();
  const r = rules(tree, o.slots, name);
  let out: LayoutEdit | null = null;
  const deliver = async (e: LayoutEdit) => {
    const got = await o.save(e).catch((x: unknown) => String(x));
    if (got !== true) refuse(typeof got === "string" ? got : "not saved");
    return got === true;
  };
  const ctx: Ctx = { ...c, screen: "layout", act: () => (out ? deliver(out) : Promise.resolve(false)), tap: () => {}, open: new Set(), held: new Map() };
  const end = (host: string, slot: string): HTMLElement | undefined => {
    const kids = nodes.find(([n]) => n.id === host)?.[0].slots?.[slot] ?? [];
    const last = kids[kids.length - 1];
    const deep = last ? read(last) : [];
    return rows.get(deep[deep.length - 1]?.[0].id ?? host);
  };
  const show = (g: string) => (e: LayoutEdit | null) => {
    out = e;
    for (const x of rows.values()) {
      x.style.transform = "";
      x.removeAttribute("data-drop");
    }
    const me = rows.get(g);
    const at = !e || e.edit === "show" ? undefined : e.edit === "swap" ? rows.get(e.b) : e.before ? rows.get(e.before) : end(e.into, e.slot);
    if (!me || !at || !e) return;
    at.dataset.drop = e.edit === "swap" ? "onto" : e.edit === "move" && e.before ? "before" : "after";
    me.style.transform = `translateY(${at.offsetTop + (at.dataset.drop === "after" ? at.offsetHeight : 0) - me.offsetTop}px)`;
  };
  const list = h("div", "list b-arrange");
  list.setAttribute("aria-label", `layout on ${size}`);
  list.addEventListener("keydown", (e) => e.key === "Escape" && !e.defaultPrevented && done());
  for (const [n, depth] of nodes) {
    const row = h("div", "row", h("span", "rm", h("span", "rt", n.label ?? n.id)));
    row.dataset.id = n.id;
    row.style.paddingInlineStart = `calc(var(--s3) * ${depth + 1})`;
    rows.set(n.id, row);
    const pick = el("select");
    pick.setAttribute("aria-label", `${n.label ?? n.id} shows on ${size} as`);
    pick.append(...PLACES.filter((p) => depth > 0 || p !== "hidden").map((p) => Object.assign(el("option"), { value: p, textContent: p })));
    pick.value = n.place;
    pick.onchange = () => {
      const place = PLACES.find((p) => p === pick.value);
      if (place) void deliver({ edit: "show", id: n.id, size, place }).then((ok) => ok || (pick.value = n.place));
    };
    row.append(pick);
    list.append(row);
    if (depth === 0) continue;
    const hd = Object.assign(el("button", "b-hd"), { type: "button", textContent: "≡" });
    hd.setAttribute("aria-label", `Move ${n.label ?? n.id}`);
    row.append(hd);
    gestured(hd, ctx, { block: { id: "layout" }, gesture: { action: "layout", name: "edit" }, rules: r, grab: n.id, item: n.id, reach: (_, dy) => Math.round(dy / ((row.offsetHeight || 2) / 2)), show: show(n.id) });
  }
  return list;
}

/// The edit mode's sheet and the tab that opens it; `draw` hands it the tree and size on screen, and redraws it while open.
export function editor(o: Editing, c: Pick<Ctx, "theme" | "store">, root: HTMLElement): { tab: HTMLElement; sheet: HTMLElement; draw(tree: Node, size: SizeClass): void } {
  const sheet = el("div", "b-sheet");
  sheet.hidden = true;
  let now: [Node, SizeClass] | undefined;
  const close = () => (sheet.hidden = true);
  const draw = (tree: Node, size: SizeClass) => {
    now = [tree, size];
    root.append(sheet);
    if (sheet.hidden) return;
    const why = h("p", "m");
    why.setAttribute("role", "alert");
    const x = btn("done", "b-sheet__close");
    x.onclick = close;
    const head = h("header", "b-sheet__head", h("b", "b-sheet__title", `layout on ${size}`), x);
    sheet.replaceChildren(h("div", "b-sheet__card", head, h("div", "b-sheet__body", arrange(tree, size, o, c, (w) => (why.textContent = w), close), why)));
  };
  const tab = btn("edit layout", "b-tab");
  tab.onclick = () => {
    sheet.hidden = false;
    if (now) draw(...now);
  };
  return { tab, sheet, draw };
}
