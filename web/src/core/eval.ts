import type { Lit } from "../gen/types.ts";
import { WORDS } from "./gesture.ts";

/// A screen's local state: a value by key.
export type State = Record<string, Lit>;
/// What the state makes of a screen, as the crate's `behave::View`: by block id, field name, action or state key.
export type View = { hidden: Set<string>; disabled: Set<string>; says: Record<string, string>; acts: Set<string>; values: Record<string, string> };

type Rec = { [k: string]: unknown };
export const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
export const rec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const UNKNOWN: Rec = { "?": null };
const PAIRS: Record<string, number> = { eq: 2, lt: 2, has: 2, add: 2, sub: 2, mul: 2, div: 2, pick: 3 };
const PATTERNS = ["filled", "email", "url", "number"];

export function read(v: unknown): unknown {
  if (Array.isArray(v)) return undefined;
  if (!rec(v)) return v;
  const keys = Object.keys(v);
  const k = keys[0] ?? "";
  const a = v[k];
  const one = (x: unknown) => (x === undefined ? UNKNOWN : { [k]: x });
  const list = (n?: number) => {
    if (!Array.isArray(a) || (n !== undefined && a.length !== n)) return UNKNOWN;
    const xs = a.map(read);
    return xs.includes(undefined) ? UNKNOWN : { [k]: xs };
  };
  if (keys.length !== 1) return UNKNOWN;
  if (k === "get") return typeof a === "string" ? v : UNKNOWN;
  if (k === "not" || k === "len") return one(read(a));
  if (k === "all" || k === "any" || k === "cat") return list();
  if (own(PAIRS, k)) return list(PAIRS[k]);
  if (k === "is" && rec(a) && typeof a.pattern === "string" && "value" in a) {
    const x = read(a.value);
    return x === undefined ? UNKNOWN : { is: { value: x, pattern: a.pattern } };
  }
  return UNKNOWN;
}

export function sound(e: unknown): boolean {
  if (!rec(e)) return true;
  const [k = "", a] = Object.entries(e)[0] ?? [];
  if (k === "?") return false;
  if (k === "is") return rec(a) && PATTERNS.includes(String(a.pattern)) && sound(a.value);
  return Array.isArray(a) ? a.every(sound) : k === "get" || sound(a);
}

const flag = (l: Lit): boolean | undefined => (l === null ? false : typeof l === "boolean" ? l : undefined);
const or = (b: boolean | undefined): Lit => b ?? null;
const num = (f: number): Lit => (Number.isFinite(f) ? f : null);
const text = (l: Lit) => (l === null ? "" : String(l));
const blank = /\p{White_Space}/u;
const trim = (s: string) => s.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
const points = (s: string) => Array.from(s, (c) => c.codePointAt(0) ?? 0);

function before(a: string, b: string): boolean {
  const [x, y] = [points(a), points(b)];
  const i = x.findIndex((c, j) => c !== y[j]);
  return i < 0 ? x.length < y.length : i < y.length && (x[i] ?? 0) < (y[i] ?? 0);
}

function email(s: string): boolean {
  const at = s.indexOf("@");
  if (at < 0) return false;
  const [user, host] = [s.slice(0, at), s.slice(at + 1)];
  const dot = host.indexOf(".");
  return user !== "" && dot > 0 && dot + 1 < host.length && !host.endsWith(".") && !host.includes("@") && !blank.test(s);
}

function url(s: string): boolean {
  const rest = s.startsWith("https://") ? s.slice(8) : s.startsWith("http://") ? s.slice(7) : undefined;
  return rest !== undefined && rest !== "" && !rest.startsWith("/") && !blank.test(s);
}

function is(l: Lit, p: unknown): Lit {
  if (p === "filled") return typeof l === "string" ? trim(l) !== "" : l !== null;
  if (p === "number" && typeof l === "number") return true;
  if (typeof l !== "string") return null;
  const t = trim(l);
  if (p === "number") return /^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$/.test(t) && Number.isFinite(Number(t));
  return p === "email" ? email(l) : p === "url" ? url(l) : null;
}

export function ev(e: unknown, s: State): Lit {
  if (!rec(e)) return e === null || typeof e === "boolean" || typeof e === "number" || typeof e === "string" ? e : null;
  const [k = "", a] = Object.entries(e)[0] ?? [];
  const xs = (Array.isArray(a) ? a : [a]).map((x) => (k === "is" ? null : ev(x, s)));
  const [x = null, y = null] = xs;
  const n = typeof x === "number" && typeof y === "number" ? { x, y } : undefined;
  const flags = xs.map(flag);
  switch (k) {
    case "get":
      return typeof a === "string" && own(s, a) ? (s[a] ?? null) : null;
    case "not":
      return or(flag(x) === undefined ? undefined : !flag(x));
    case "all":
      return or(flags.includes(undefined) ? undefined : flags.every(Boolean));
    case "any":
      return or(flags.includes(undefined) ? undefined : flags.some(Boolean));
    case "eq":
      return x === y;
    case "lt":
      return n ? n.x < n.y : typeof x === "string" && typeof y === "string" ? before(x, y) : null;
    case "len":
      return typeof x === "string" ? points(x).length : null;
    case "has":
      return typeof x === "string" && typeof y === "string" ? x.includes(y) : null;
    case "is":
      return rec(a) ? is(ev(a.value, s), a.pattern) : null;
    case "add":
      return n ? num(n.x + n.y) : null;
    case "sub":
      return n ? num(n.x - n.y) : null;
    case "mul":
      return n ? num(n.x * n.y) : null;
    case "div":
      return n ? num(n.x / n.y) : null;
    case "cat":
      return xs.map(text).join("");
    case "pick":
      return flags[0] === undefined ? null : (xs[flags[0] ? 1 : 2] ?? null);
  }
  return null;
}

/// The value of `e` in `s`, as the crate's `eval`: total, a wrong type gives null, null is false.
export function evaluate(e: unknown, s: State): Lit {
  const x = read(e);
  return x === undefined ? null : ev(x, s);
}

function holds(e: unknown, s: State): boolean | undefined {
  const x = e == null ? undefined : read(e);
  return x === undefined || !sound(x) ? undefined : ev(x, s) === true;
}

export const list = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(rec) : []);
const kids = (b: Rec): Rec[] => [...list(b.blocks), ...list(b.rows), ...list(b.buttons), ...list(b.rounds).flatMap((r) => list(r.blocks))];
const named = (b: Rec) => list(b.fields).filter((f) => typeof f.name === "string");
/// The action an act sends, which its `enabled` turns off: its own, else its tap's.
export const actionOf = (a: Rec): string | undefined => {
  const k = a.action ?? (rec(a.tap) ? a.tap.action : undefined);
  return typeof k === "string" ? k : undefined;
};
const acts = (b: Rec): Rec[] => {
  const all = [...list(b.actions), ...list(b.swipe), ...list(b.menu), ...[b.button, ...WORDS.map((w) => b[w])].filter(rec)];
  return [...all, ...all.flatMap((a) => list(a.menu))];
};
const plain = (v: unknown): Lit => (v === null || typeof v === "boolean" || typeof v === "number" || typeof v === "string" ? v : null);
/// What `field` holding `held` puts in local state: null, a switch, a number or a string; a list puts its length, an empty one null.
export const lit = (_field: unknown, held: unknown): Lit => (Array.isArray(held) ? held.length || null : plain(held));

/// The screen's start state: its `state`, each field's `value` and each chips' first `selected`.
export function start(screen: unknown): State {
  const s: State = {};
  const seed = (b: Rec) => {
    for (const f of named(b)) s[String(f.name)] = lit(f, f.value ?? f.files);
    if (b.type === "chips" && typeof b.name === "string") s[b.name] = plain(Array.isArray(b.selected) ? b.selected[0] : null);
    kids(b).forEach(seed);
  };
  if (rec(screen)) {
    for (const [k, v] of Object.entries(rec(screen.state) ? screen.state : {})) s[k] = plain(v);
    seed(screen);
  }
  return s;
}

/// What `s` makes of `screen`, as the crate's `behave::view`.
export function view(screen: unknown, s: State): View {
  const v: View = { hidden: new Set(), disabled: new Set(), says: {}, acts: new Set(), values: {} };
  const walk = (b: Rec) => {
    const id = typeof b.id === "string" ? b.id : undefined;
    if (holds(b.show, s) === false) {
      if (id !== undefined) v.hidden.add(id);
      return;
    }
    if (holds(b.enabled, s) === false && id !== undefined) v.disabled.add(id);
    let failing = false;
    for (const f of named(b)) {
      const name = String(f.name);
      if (holds(f.show, s) === false) {
        v.hidden.add(name);
        continue;
      }
      if (holds(f.enabled, s) === false) v.disabled.add(name);
      const bad = list(f.checks).find((c) => typeof c.say === "string" && holds(c.ok, s) === false);
      if (bad) {
        failing = true;
        v.says[name] = String(bad.say);
      }
    }
    if (failing && id !== undefined) v.disabled.add(id);
    for (const a of acts(b)) {
      const k = actionOf(a);
      if (k !== undefined && holds(a.enabled, s) === false) v.acts.add(k);
    }
    for (const i of [b, ...list(b.items)]) {
      const k = rec(i.value) ? i.value.get : undefined;
      if (typeof k === "string") v.values[k] = text(own(s, k) ? (s[k] ?? null) : null);
    }
    kids(b).forEach(walk);
  };
  if (rec(screen)) walk(screen);
  return v;
}

export const find = (b: Rec, id: string): Rec | undefined => (b.id === id ? b : kids(b).reduce<Rec | undefined>((got, c) => got ?? find(c, id), undefined));
