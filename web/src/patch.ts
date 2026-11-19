import type { Block, Op } from "./gen/types.ts";
import { enter } from "./motion.ts";

type Rec = { [key: string]: unknown };
type Spot = { list: unknown[]; at: number } | "root";

export type Draw = (block: Block) => HTMLElement | null;

const walked = ["blocks", "rows", "buttons", "rounds"];
const hosts: Record<string, string> = { screen: "blocks", sheet: "blocks", section: "blocks", card: "blocks", list: "rows", scene: "lanes", row: "rounds" };
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

function locate(node: Rec, id: string): Spot | undefined {
  if (node.id === id) return "root";
  for (const key of walked) {
    const list = node[key];
    if (!Array.isArray(list)) continue;
    for (let at = 0; at < list.length; at++) {
      const x: unknown = list[at];
      if (!isRec(x)) continue;
      if (x.id === id) return { list, at };
      const deeper = locate(x, id);
      if (deeper && deeper !== "root") return deeper;
    }
  }
  return undefined;
}

function get(root: Rec, id: string): Rec | undefined {
  const s = locate(root, id);
  const v: unknown = s === "root" ? root : s?.list[s.at];
  return isRec(v) ? v : undefined;
}

function place(root: Rec, into: string, child: unknown, before?: string | null, after?: string | null): boolean {
  const host = get(root, into);
  const key = host && typeof host.type === "string" ? hosts[host.type] : undefined;
  if (!host || !key) return false;
  const list = host[key] ?? (host[key] = []);
  if (!Array.isArray(list)) return false;
  const find = (id?: string | null) => (id ? list.findIndex((x) => isRec(x) && x.id === id) : -1);
  const b = find(before);
  const a = find(after);
  list.splice(b >= 0 ? b : a >= 0 ? a + 1 : list.length, 0, child);
  return true;
}

/// Applies `ops` to a copy of `screen` as the crate's `apply` does; undefined when one does not fit or is unknown.
export function apply(screen: Block, ops: Op[]): Block | undefined {
  let out = structuredClone(screen);
  for (const op of ops) {
    const root: Rec = out;
    switch (op.op) {
      case "merge": {
        const t = get(root, op.id);
        if (!t) return undefined;
        for (const [k, v] of Object.entries(op.fields)) if (v === null) delete t[k];
        else t[k] = v;
        break;
      }
      case "replace": {
        const s = locate(root, op.id);
        if (!s) return undefined;
        if (s === "root") out = structuredClone(op.block);
        else s.list[s.at] = structuredClone(op.block);
        break;
      }
      case "remove":
      case "move": {
        const s = locate(root, op.id);
        if (!s || s === "root") return undefined;
        const [b] = s.list.splice(s.at, 1);
        if (op.op === "move" && !place(root, op.into, b, op.before)) return undefined;
        break;
      }
      case "insert":
        if (!place(root, op.into, structuredClone(op.block), op.before, op.after)) return undefined;
        break;
      case "screen":
        out = structuredClone(op.screen);
        break;
      case "badge":
      case "dot":
        break;
      default:
        return undefined;
    }
  }
  return out;
}

function node(el: Element, id: string): Element | undefined {
  if (el.getAttribute("data-id") === id) return el;
  for (const c of Array.from(el.children)) {
    const n = node(c, id);
    if (n) return n;
  }
  return undefined;
}

const home = (el: Element): Element => Array.from(el.children).find((c) => c.hasAttribute("data-kids")) ?? el;

type View = { root: HTMLElement; draw: Draw };

function whole(v: View, model: Block): void {
  const n = v.draw(model);
  v.root.replaceChildren(...(n ? [n] : []));
}

function one(v: View, op: Op, model: Block): void {
  const redraw = (id: string): void => {
    const el = node(v.root, id);
    const b = get(model, id);
    if (!el) return;
    if (el === v.root || b === model) return whole(v, model);
    const n = b && isBlock(b) ? v.draw(b) : null;
    if (el.querySelector("iframe") && n?.isEqualNode(el)) return;
    if (n) el.replaceWith(n);
    else el.remove();
  };
  switch (op.op) {
    case "merge": {
      const el = node(v.root, op.id);
      if (el?.getAttribute("data-block") !== "island" || Object.keys(op.fields).some((k) => k !== "props")) return redraw(op.id);
      return void Reflect.set(el, "props", get(model, op.id)?.props ?? {});
    }
    case "replace":
      return redraw(op.id);
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
  return typeof r.type === "string";
}

/// Patches the view in `root` with every op queued within one animation frame, in one pass; over 500 it redraws.
export function patcher(o: { root: HTMLElement; model: () => Block; draw: Draw; saved?: () => void }) {
  let ops: Op[] = [];
  let over = false;
  let due = false;
  const run = (): void => {
    due = false;
    if (!ops.length && !over) return;
    const model = o.model();
    const todo = ops;
    ops = [];
    if (over) whole(o, model);
    else for (const op of todo) one(o, op, model);
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
