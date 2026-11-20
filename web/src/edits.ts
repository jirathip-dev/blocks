import type { LayoutEdit, LayoutPlace, SizeClass } from "./gen/layout.ts";
import { type Nudge, type Rules, same } from "./core/gesture.ts";
import { places, stay, type Tree } from "./core/layout.ts";
import { gestured } from "./gesture.ts";

/// What a host hands the shell to offer an edit mode: the slots each component holds, and where an edit is saved.
export type Editing = { slots: Record<string, string[]>; save: (e: LayoutEdit) => Promise<boolean | string> };
/// A layout node with its place resolved for the size on screen, as the edit list draws it.
export type Placed = Omit<Tree, "slots"> & { label?: string; place: LayoutPlace; slots?: Record<string, Placed[]> };

const PLACES: LayoutPlace[] = ["push", "sheet", "panel", "column", "strip", "cards", "menu", "inline", "hidden"];
const STEPS: [string, Nudge][] = [
  ["Move earlier", { dir: "up" }],
  ["Move later", { dir: "down" }],
  ["Swap with the previous", { dir: "left" }],
  ["Swap with the next", { dir: "right" }],
  ["Move to the previous slot", { dir: "up", big: true }],
  ["Move to the next slot", { dir: "down", big: true }],
];

const read = (n: Placed, depth = 0): [Placed, number][] => [[n, depth], ...Object.keys(n.slots ?? {}).sort().flatMap((k) => (n.slots?.[k] ?? []).flatMap((c) => read(c, depth + 1)))];
const slotOf = (e: LayoutEdit) => (e.edit === "move" ? `${e.into}\n${e.slot}` : "");

/// The edit list's rows in reading order: each node's id, depth, label and the places it may take.
export const rows = (tree: Placed) => read(tree).map(([n, depth]) => ({ id: n.id, depth, label: n.label ?? n.id, places: PLACES.filter((p) => depth > 0 || p !== "hidden") }));

function rules(tree: Placed, slots: Record<string, string[]>, name: (id: string) => string): Rules<{ id: string }, string, number, LayoutEdit> {
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

/// Runs a drawn edit list (rows by `data-id`, each with its place `select`): a handle and one machine per node but the root, the picks and Escape; returns its undo.
export function wire(list: HTMLElement, tree: Placed, size: SizeClass, o: Editing, refuse: (why: string) => void, done: () => void): () => void {
  const nodes = read(tree);
  const name = (id: string) => nodes.find(([n]) => n.id === id)?.[0].label ?? id;
  const rows = new Map(Array.from(list.children).flatMap((e) => (e instanceof HTMLElement && e.dataset["id"] ? [[e.dataset["id"], e] as const] : [])));
  const r = rules(tree, o.slots, name);
  let out: LayoutEdit | null = null;
  const deliver = async (e: LayoutEdit) => {
    const got = await o.save(e).catch((x: unknown) => String(x));
    if (got !== true) refuse(typeof got === "string" ? got : "not saved");
    return got === true;
  };
  const ctx = { act: () => (out ? deliver(out) : Promise.resolve(false)) };
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
    at.dataset["drop"] = e.edit === "swap" ? "onto" : e.edit === "move" && e.before ? "before" : "after";
    me.style.transform = `translateY(${at.offsetTop + (at.dataset["drop"] === "after" ? at.offsetHeight : 0) - me.offsetTop}px)`;
  };
  const esc = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && done();
  list.addEventListener("keydown", esc);
  const added: Element[] = [];
  for (const [n, depth] of nodes) {
    const row = rows.get(n.id);
    const pick = row?.querySelector("select");
    if (!row || !pick) continue;
    pick.value = n.place;
    pick.onchange = () => {
      const place = PLACES.find((p) => p === pick.value);
      if (place) void deliver({ edit: "show", id: n.id, size, place }).then((ok) => ok || (pick.value = n.place));
    };
    if (depth === 0) continue;
    const hd = Object.assign(document.createElement("button"), { className: "b-hd", type: "button", textContent: "≡" });
    hd.setAttribute("aria-label", `Move ${n.label ?? n.id}`);
    const mine = row.children.length;
    row.append(hd);
    gestured(hd, ctx, { block: { id: "layout" }, gesture: { action: "layout", name: "edit" }, rules: r, grab: n.id, item: n.id, reach: (_, dy) => Math.round(dy / ((row.offsetHeight || 2) / 2)), show: show(n.id) });
    added.push(...Array.from(row.children).slice(mine));
  }
  return () => {
    list.removeEventListener("keydown", esc);
    added.forEach((x) => x.remove());
    for (const x of rows.values()) x.style.transform = "";
  };
}
