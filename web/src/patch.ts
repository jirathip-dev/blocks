import { get, type Rec } from "./core/apply.ts";
import type { Append } from "./core/kind/prose.ts";
import type { Block, Op } from "./gen/types.ts";
import { enter } from "./motion.ts";

export type Draw = (block: Block) => HTMLElement | null;
export type Grow = (el: HTMLElement, op: Append) => boolean;
/// A kind's in-place view: draws `block` into the element it drew before; false when it must be drawn again.
export type Sync = (el: HTMLElement, block: Block) => boolean;

function node(el: Element, id: string): Element | undefined {
  if (el.getAttribute("data-id") === id) return el;
  for (const c of Array.from(el.children)) {
    const n = node(c, id);
    if (n) return n;
  }
  return undefined;
}

const home = (el: Element): Element => Array.from(el.children).find((c) => c.hasAttribute("data-kids")) ?? el;

type View = { root: HTMLElement; draw: Draw; grow?: Grow | undefined; sync?: Record<string, Sync> | undefined; fresh: Set<Element>; late: Set<string> };

function whole(v: View, model: Block): void {
  const n = v.draw(model);
  v.root.replaceChildren(...(n ? [n] : []));
  if (n) v.fresh.add(n);
}

function redrawn(v: View, id: string, model: Block): void {
  const el = node(v.root, id);
  const b = get(model, id);
  if (!el) return;
  if (el === v.root || b === model) return whole(v, model);
  const n = b && isBlock(b) ? v.draw(b) : null;
  if (el.querySelector("iframe") && n?.isEqualNode(el)) return;
  if (n) el.replaceWith(n), v.fresh.add(n);
  else el.remove();
}

const isFresh = (v: View, el: Element | undefined) => {
  for (let e: Element | null | undefined = el; e && e !== v.root; e = e.parentElement) if (v.fresh.has(e)) return true;
  return false;
};

function late(v: View, id: string, model: Block): void {
  const el = node(v.root, id);
  const b = get(model, id);
  if (!(el instanceof HTMLElement) || isFresh(v, el)) return;
  if (!(b && isBlock(b) && v.sync?.[b.type]?.(el, b))) redrawn(v, id, model);
}

function one(v: View, op: Op, model: Block): void {
  const redraw = (id: string) => redrawn(v, id, model);
  const at = "id" in op ? node(v.root, op.id) : undefined;
  const host = at && !at.hasAttribute("data-block") ? at.parentElement?.closest<HTMLElement>("[data-block][data-id]")?.dataset["id"] : undefined;
  if (host && op.op !== "move") return redraw(host);
  switch (op.op) {
    case "points":
      return void v.late.add(op.id);
    case "merge": {
      const el = node(v.root, op.id);
      const kind = el?.getAttribute("data-block");
      if (kind && v.sync?.[kind]) return void v.late.add(op.id);
      if (el?.getAttribute("data-block") !== "island" || Object.keys(op.fields).some((k) => k !== "props")) return redraw(op.id);
      return void Reflect.set(el, "props", get(model, op.id)?.["props"] ?? {});
    }
    case "replace":
      return redraw(op.id);
    case "append": {
      const el = node(v.root, op.id);
      if (isFresh(v, el)) return;
      if (!(el instanceof HTMLElement && v.grow?.(el, op))) redraw(op.id);
      return;
    }
    case "remove":
      return node(v.root, op.id)?.remove();
    case "screen":
      return whole(v, model);
    case "insert":
    case "move": {
      const host = node(v.root, op.into);
      if (!host) return;
      const el = op.op === "move" ? node(v.root, op.id) : "type" in op.block ? v.draw(op.block) : undefined;
      if (op.op === "insert" && !("type" in op.block)) return redraw(op.into);
      if (!el) return;
      const at = op.before ? node(host, op.before) : undefined;
      const prev = !at && op.op === "insert" && op.after ? node(host, op.after) : undefined;
      const box = at?.parentElement ?? prev?.parentElement ?? home(host);
      box.insertBefore(el, at ?? prev?.nextElementSibling ?? null);
      if (op.op === "insert") enter(el);
      return;
    }
    default:
      return;
  }
}

function isBlock(r: Rec): r is Rec & Block {
  return typeof r["type"] === "string";
}

type Kept = { form: string; name: string; value: string; from: number | null; to: number | null };
const kept = (root: HTMLElement, a = globalThis.document?.activeElement): Kept | undefined => {
  const i = a && a instanceof HTMLInputElement && root.contains(a) ? a : undefined;
  const form = i?.closest<HTMLElement>(".form[data-id]")?.dataset["id"];
  return i && form ? { form, name: i.name, value: i.value, from: i.selectionStart, to: i.selectionEnd } : undefined;
};
const refocus = (root: HTMLElement, k: Kept, i = root.querySelector(`.form[data-id="${CSS.escape(k.form)}"] [name="${CSS.escape(k.name)}"]`)) =>
  i instanceof HTMLInputElement && i !== document.activeElement && ((i.value = k.value), i.focus(), k.from === null || i.setSelectionRange(k.from, k.to));

/// Patches the view in `root` with every op queued within one animation frame, in one pass; over 500 it redraws.
export function patcher(o: { root: HTMLElement; model: () => Block; draw: Draw; grow?: Grow; sync?: Record<string, Sync>; saved?: () => void }) {
  let ops: Op[] = [];
  let over = false;
  let due = false;
  const run = (): void => {
    due = false;
    if (!ops.length && !over) return;
    const [model, todo, k, v] = [o.model(), ops, kept(o.root), { ...o, fresh: new Set<Element>(), late: new Set<string>() }];
    ops = [];
    if (over) whole(v, model);
    else for (const op of todo) one(v, op, model);
    for (const id of v.late) late(v, id, model);
    if (k) refocus(o.root, k);
    over = false;
    o.saved?.();
  };
  return {
    queue(next: Op[]): void {
      if (!over) ops.push(...next);
      if (ops.length > 500) {
        ops = [];
        over = true;
      }
      if (!due) requestAnimationFrame(run);
      due = true;
    },
    flush: run,
    drop(): void {
      ops = [];
      over = false;
    },
  };
}
