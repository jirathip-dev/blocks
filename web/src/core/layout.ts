import type { LayoutEdit } from "../gen/layout.ts";

/// A layout node as the edit rules read it: its kind, its id and what its slots hold.
export type Tree = { type: string; id: string; slots?: Record<string, Tree[]> };

const MAX_DEPTH = 6;
const kids = (n: Tree) => Object.values(n.slots ?? {}).flat();
const height = (n: Tree): number => 1 + Math.max(0, ...kids(n).map(height));
const move = (id: string, into: string, slot: string, before: string | null): LayoutEdit => ({ edit: "move", id, into, slot, before });

function path(n: Tree, id: string): string[] | null {
  if (n.id === id) return [n.id];
  for (const k of kids(n)) {
    const p = path(k, id);
    if (p) return [n.id, ...p];
  }
  return null;
}

/// Where a grabbed node is now, as the move that leaves it there; null for the root.
export function stay(n: Tree, grabbed: string): LayoutEdit | null {
  for (const [slot, list] of Object.entries(n.slots ?? {})) {
    const i = list.findIndex((k) => k.id === grabbed);
    if (i >= 0) return move(grabbed, n.id, slot, list[i + 1]?.id ?? null);
  }
  for (const k of kids(n)) {
    const s = stay(k, grabbed);
    if (s) return s;
  }
  return null;
}

/// Every place a grabbed node can go, where it is now included, in reading order: the list the arrow keys walk.
export function places(tree: Tree, slots: Record<string, string[]>, grabbed: string): LayoutEdit[] {
  const at = path(tree, grabbed);
  const g = at && at.length > 1 ? walkTo(tree, grabbed) : undefined;
  if (!at || !g) return [];
  const [h, depth, above] = [height(g), at.length, at.slice(0, -1)];
  const out: LayoutEdit[] = [];
  const walk = (host: Tree, d: number) => {
    if (host.type === "screen") return;
    const fits = d + h <= MAX_DEPTH;
    for (const slot of [...(slots[host.type] ?? [])].sort()) {
      for (const k of host.slots?.[slot] ?? []) {
        if (k.id === grabbed) continue;
        if (fits) out.push(move(grabbed, host.id, slot, k.id));
        if (fits && !above.includes(k.id) && depth + height(k) <= MAX_DEPTH + 1) out.push({ edit: "swap", a: grabbed, b: k.id });
        walk(k, d + 1);
      }
      if (fits) out.push(move(grabbed, host.id, slot, null));
    }
  };
  walk(tree, 1);
  return out;
}

function walkTo(n: Tree, id: string): Tree | undefined {
  if (n.id === id) return n;
  for (const k of kids(n)) {
    const f = walkTo(k, id);
    if (f) return f;
  }
  return undefined;
}

/// Every edit a grabbed node can end in, in reading order, as the crate's `layout::drops`.
export function drops(tree: Tree, slots: Record<string, string[]>, grabbed: string): LayoutEdit[] {
  const now = JSON.stringify(stay(tree, grabbed));
  return places(tree, slots, grabbed).filter((e) => JSON.stringify(e) !== now);
}
