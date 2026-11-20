import { hooks, names, roles } from "../gen/hooks.ts";
import type { Block, Lit, TreeDrawn, TreeNode } from "../gen/types.ts";
import { evaluate, type State } from "./eval.ts";

export type Blk = { [k: string]: unknown };
export const isBlk = (v: unknown): v is Blk => typeof v === "object" && v !== null;
export const blks = (v: unknown): Blk[] => (Array.isArray(v) ? v.filter(isBlk) : []);
/// The accessible name of block `b` of kind `t`: its first set name field, else its id, else its kind.
export const named = (b: Blk, t: string) => String(names.map((k) => b[k]).find((v) => typeof v === "string" && v) ?? (typeof b.id === "string" && b.id ? b.id : t));

const isLit = (v: unknown): v is Lit => v === null || ["boolean", "number", "string"].includes(typeof v);
const isExpr = (v: unknown) => v !== undefined && !Array.isArray(v);

const str = (b: Blk, k: string) => (typeof b[k] === "string" && b[k] !== "" ? String(b[k]) : null);

function under(b: Blk, drawn: TreeDrawn): unknown[] {
  if (drawn === "fallback") return Array.isArray(b.blocks) ? b.blocks : [];
  if (drawn === "hidden") return [];
  const lists = ["blocks", b.type === "table" ? "" : "rows", "buttons"].flatMap((k) => (Array.isArray(b[k]) ? b[k] : []));
  return lists.concat(blks(b.rounds).flatMap((r) => (Array.isArray(r.blocks) ? r.blocks : [])));
}

/// The role block `b` of `kind` is drawn with, as the crate's `tree::expect` reads it.
export function role(b: Blk, kind: string): string {
  const tap = isBlk(b.tap) ? b.tap : null;
  const wrapped = ["rounds", "swipe"].some((k) => Array.isArray(b[k]) && b[k].length > 0);
  if ((kind === "button" || kind === "row") && tap?.url != null && !wrapped) return "link";
  if ((kind === "row" && tap && !wrapped) || kind === "button" || kind === "editor") return "button";
  return roles[kind] ?? "group";
}

function node(v: unknown, kinds: readonly string[], state: State): TreeNode {
  const b = isBlk(v) ? v : {};
  const kind = str(b, "type") ?? "";
  const field = Object.entries(hooks).find(([k]) => k === kind)?.[1].variant;
  const variant = field ? str(b, field) : null;
  const shown = "show" in b && isExpr(b.show) ? evaluate(b.show, state) : true;
  const off = shown === null || shown === false;
  const drawn: TreeDrawn = off ? "hidden" : kinds.includes(kind) ? "native" : "fallback";
  return { kind, id: str(b, "id"), variant, drawn, role: role(b, kind), name: named(b, kind), children: under(b, drawn).map((c) => node(c, kinds, state)) };
}

/// The tree a renderer drawing `kinds` natively must draw for `screen`, roles and names included, as the crate's `tree::expect`: no rect, no text.
export function tree(screen: Block, kinds: readonly string[], state?: State): TreeNode {
  const b: Blk = screen;
  const own: State = {};
  for (const [k, v] of Object.entries(isBlk(b.state) ? b.state : {})) if (isLit(v)) own[k] = v;
  return node(b, kinds, state ?? own);
}

const who = (n: TreeNode) => `${n.kind}${n.id ? `#${n.id}` : ""}`;

/// Where `got` differs from `want` in kind, id, drawn, role, name or child count, as the crate's `tree::check` words it.
export function expect(got: TreeNode | undefined, want: TreeNode, at = "tree", out: string[] = []): string[] {
  if (!got || want.kind !== got.kind || (want.id ?? null) !== (got.id ?? null) || want.drawn !== got.drawn) {
    out.push(`${at}: drew ${got ? `${who(got)} ${got.drawn}` : "nothing"}, expected ${who(want)} ${want.drawn}`);
    return out;
  }
  const here = `${at}/${who(got)}`;
  if (want.role !== got.role || want.name !== got.name) out.push(`${here}: drew ${got.role} "${got.name}", expected ${want.role} "${want.name}"`);
  if (want.children.length !== got.children.length) out.push(`${here}: ${got.children.length} children, expected ${want.children.length}`);
  want.children.forEach((c, i) => expect(got.children[i], c, here, out));
  return out;
}
