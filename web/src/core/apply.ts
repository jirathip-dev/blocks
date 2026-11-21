import type { Block, Op } from "../gen/types.ts";
import { grow } from "./kind/prose.ts";

export type Rec = { [key: string]: unknown };
type Spot = { list: unknown[]; at: number } | "root";

const walked = ["blocks", "rows", "buttons", "rounds"];
const hosts: Record<string, string> = { screen: "blocks", sheet: "blocks", section: "blocks", card: "blocks", message: "blocks", list: "rows", scene: "lanes", row: "rounds", table: "rows" };
export const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

function locate(node: Rec, id: string): Spot | undefined {
  if (node["id"] === id) return "root";
  for (const key of walked) {
    const list = node[key];
    if (!Array.isArray(list)) continue;
    for (let at = 0; at < list.length; at++) {
      const x: unknown = list[at];
      if (!isRec(x)) continue;
      if (x["id"] === id) return { list, at };
      const deeper = locate(x, id);
      if (deeper && deeper !== "root") return deeper;
    }
  }
  return undefined;
}

export function get(root: Rec, id: string): Rec | undefined {
  const s = locate(root, id);
  const v: unknown = s === "root" ? root : s?.list[s.at];
  return isRec(v) ? v : undefined;
}

function place(root: Rec, into: string, child: unknown, before?: string | null, after?: string | null): boolean {
  const host = get(root, into);
  const key = host && typeof host["type"] === "string" ? hosts[host["type"]] : undefined;
  if (!host || !key) return false;
  const list = host[key] ?? (host[key] = []);
  if (!Array.isArray(list)) return false;
  const find = (id?: string | null) => (id ? list.findIndex((x) => isRec(x) && x["id"] === id) : -1);
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
      case "append": {
        const t = get(root, op.id);
        const parts = t?.["type"] === "prose" && Array.isArray(t["parts"]) ? grow(t["parts"], op) : undefined;
        if (!t || !parts) return undefined;
        t["parts"] = parts;
        break;
      }
      case "badge":
        if (root["type"] === "screen") root["badge"] = op.count;
        break;
      default:
        if (op.op !== "dot") return undefined;
    }
  }
  return out;
}
