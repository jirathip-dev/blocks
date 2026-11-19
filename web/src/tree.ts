import { hooks } from "./gen/hooks.ts";
import type { Block, Lit, TreeDrawn, TreeNode } from "./gen/types.ts";
import { fallback, R, type Blk, isBlk, blks } from "./render/index.ts";

type State = Record<string, Lit>;

/// The kinds the HTML renderer draws natively: the others draw their fallback.
export const native: readonly string[] = Object.entries(R)
  .filter(([, r]) => r !== fallback)
  .map(([k]) => k);

const isLit = (v: unknown): v is Lit => v === null || ["boolean", "number", "string"].includes(typeof v);
const isExpr = (v: unknown) => v !== undefined && !Array.isArray(v);
const flag = (l: Lit) => (l === null ? false : typeof l === "boolean" ? l : undefined);
const tri = (b: boolean | undefined): Lit => (b === undefined ? null : b);
const num = (f: number): Lit => (Number.isFinite(f) ? f : null);
const text = (l: Lit) => (l === null ? "" : String(l));
const numeric = (s: string) => /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) && Number.isFinite(Number(s));

function email(s: string): boolean {
  const at = s.indexOf("@");
  if (at < 0) return false;
  const [user, host] = [s.slice(0, at), s.slice(at + 1)];
  const dot = host.indexOf(".");
  return user !== "" && dot > 0 && dot + 1 < host.length && !host.endsWith(".") && !host.includes("@") && !/\s/.test(s);
}

function url(s: string): boolean {
  const rest = s.startsWith("https://") ? s.slice(8) : s.startsWith("http://") ? s.slice(7) : undefined;
  return rest !== undefined && rest !== "" && !rest.startsWith("/") && !/\s/.test(s);
}

function is(l: Lit, p: string): Lit {
  if (p === "filled") return typeof l === "string" ? l.trim() !== "" : l !== null;
  if (p === "number") return typeof l === "number" || (typeof l === "string" ? numeric(l.trim()) : null);
  if (typeof l !== "string" || (p !== "email" && p !== "url")) return null;
  return p === "email" ? email(l) : url(l);
}

const ARITY: Record<string, number> = { eq: 2, lt: 2, has: 2, add: 2, sub: 2, pick: 3 };

/// The value of `e` in `state`, as the crate's `expr::eval`: a wrong shape or type gives null, null is false.
export function evaluate(e: unknown, state: State): Lit {
  if (isLit(e)) return e;
  if (!isBlk(e)) return null;
  const keys = Object.keys(e);
  const [op] = keys;
  const x = e[op];
  if (keys.length !== 1) return null;
  if (op === "get") return typeof x === "string" ? (state[x] ?? null) : null;
  if (op === "not" || op === "len") {
    if (!isExpr(x)) return null;
    const v = evaluate(x, state);
    return op === "not" ? tri(flag(v) === undefined ? undefined : !flag(v)) : typeof v === "string" ? [...v].length : null;
  }
  if (op === "is") {
    const ok = isBlk(x) && isExpr(x.value) && typeof x.pattern === "string";
    return ok ? is(evaluate(x.value, state), String(x.pattern)) : null;
  }
  if (!Array.isArray(x) || !x.every(isExpr) || (op in ARITY && x.length !== ARITY[op])) return null;
  const vs = (): Lit[] => x.map((v) => evaluate(v, state));
  const flags = () => {
    const fs = vs().map(flag);
    return fs.every((f) => f !== undefined) ? fs : undefined;
  };
  if (op === "all") return tri(flags()?.every(Boolean));
  if (op === "any") return tri(flags()?.some(Boolean));
  if (op === "cat") return vs().map(text).join("");
  if (op === "pick") {
    const c = flag(evaluate(x[0], state));
    return c === undefined ? null : evaluate(c ? x[1] : x[2], state);
  }
  const [a, b] = vs();
  if (op === "eq") return a === b;
  const nums = typeof a === "number" && typeof b === "number";
  if (op === "lt") return nums ? a < b : typeof a === "string" && typeof b === "string" ? a < b : null;
  if (op === "has") return typeof a === "string" && typeof b === "string" ? a.includes(b) : null;
  if (op === "add" || op === "sub") return nums ? num(op === "add" ? a + b : a - b) : null;
  return null;
}

const str = (b: Blk, k: string) => (typeof b[k] === "string" && b[k] !== "" ? String(b[k]) : null);

function under(b: Blk, drawn: TreeDrawn): unknown[] {
  if (drawn === "fallback") return Array.isArray(b.blocks) ? b.blocks : [];
  if (drawn === "hidden") return [];
  const lists = ["blocks", "rows", "buttons"].flatMap((k) => (Array.isArray(b[k]) ? b[k] : []));
  return lists.concat(blks(b.rounds).flatMap((r) => (Array.isArray(r.blocks) ? r.blocks : [])));
}

function node(v: unknown, kinds: readonly string[], state: State): TreeNode {
  const b = isBlk(v) ? v : {};
  const kind = str(b, "type") ?? "";
  const field = Object.entries(hooks).find(([k]) => k === kind)?.[1].variant;
  const variant = field ? str(b, field) : null;
  const shown = "show" in b && isExpr(b.show) ? flag(evaluate(b.show, state)) : true;
  const drawn: TreeDrawn = shown === false ? "hidden" : kinds.includes(kind) ? "native" : "fallback";
  return { kind, id: str(b, "id"), variant, drawn, children: under(b, drawn).map((c) => node(c, kinds, state)) };
}

/// The tree a renderer drawing `kinds` natively must draw for `screen`, as the crate's `tree::expect`: no rect, no text.
export function tree(screen: Block, kinds: readonly string[] = native, state?: State): TreeNode {
  const b: Blk = screen;
  const own: State = {};
  for (const [k, v] of Object.entries(isBlk(b.state) ? b.state : {})) if (isLit(v)) own[k] = v;
  return node(b, kinds, state ?? own);
}

const who = (n: TreeNode) => `${n.kind}${n.id ? `#${n.id}` : ""}`;

/// Where `got` differs from `want` in kind, id, drawn or child count, as the crate's `tree::check` words it.
export function expect(got: TreeNode | undefined, want: TreeNode, at = "tree", out: string[] = []): string[] {
  if (!got || want.kind !== got.kind || (want.id ?? null) !== (got.id ?? null) || want.drawn !== got.drawn) {
    out.push(`${at}: drew ${got ? `${who(got)} ${got.drawn}` : "nothing"}, expected ${who(want)} ${want.drawn}`);
    return out;
  }
  const here = `${at}/${who(got)}`;
  if (want.children.length !== got.children.length) out.push(`${here}: ${got.children.length} children, expected ${want.children.length}`);
  want.children.forEach((c, i) => expect(got.children[i], c, here, out));
  return out;
}
