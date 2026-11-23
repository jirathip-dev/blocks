import { defs, type Fault, kinds, type Shape } from "../gen/shapes.ts";
import type { Built } from "./built.ts";
import { WORDS } from "./gesture.ts";

type Obj = Record<string, unknown>;

const LISTS = ["blocks", "rows", "buttons"];
const LINKS = ["url", "href", "link", "open", "src"];
const KINDS = Object.keys(kinds);

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const sorted = (o: Obj) => Object.keys(o).sort();

/// Whether a link may be written or opened: http, https, mailto or relative, as the crate's `linkable`.
export const linkable = (url: string): boolean => {
  const head = url.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").split(/[/?#]/, 1)[0] ?? "";
  const at = head.indexOf(":");
  return at < 0 || ["http", "https", "mailto"].includes(head.slice(0, at).toLowerCase());
};

const typed = (t: string, v: unknown) =>
  t === "null" ? v === null : t === "array" ? Array.isArray(v) : t === "object" ? isObj(v) : t === "integer" ? Number.isInteger(v) : typeof v === t;

function fits(s: Shape, v: unknown): boolean {
  if (typeof s === "boolean") return s;
  if (s.$ref !== undefined && !fits(defs[s.$ref.replace("#/$defs/", "")] ?? false, v)) return false;
  if (s.type !== undefined && ![s.type].flat().some((t) => typed(t, v))) return false;
  if ("const" in s && s.const !== v) return false;
  if (s.enum && !s.enum.includes(v)) return false;
  if (s.not !== undefined && fits(s.not, v)) return false;
  const alts = s.anyOf ?? s.oneOf;
  if (alts && !alts.some((a) => fits(a, v))) return false;
  if (typeof v === "number" && (v < (s.minimum ?? -Infinity) || v > (s.maximum ?? Infinity))) return false;
  if (Array.isArray(v)) {
    if (v.length < (s.minItems ?? 0) || v.length > (s.maxItems ?? Infinity)) return false;
    const items = s.items;
    return items === undefined || v.every((x) => fits(items, x));
  }
  if (!isObj(v)) return true;
  if (s.required?.some((k) => !(k in v))) return false;
  return Object.entries(v).every(([k, x]) => {
    const p = s.properties?.[k] ?? s.additionalProperties;
    return p === undefined || fits(p, x);
  });
}

function shallow(o: Obj): Obj {
  const top: Obj = { ...o };
  for (const k of LISTS) if (k in top) top[k] = [];
  if (Array.isArray(top["rounds"])) top["rounds"] = top["rounds"].map((r) => (isObj(r) && "blocks" in r ? { ...r, blocks: [] } : r));
  return top;
}

function sentOnce(top: Obj): Obj {
  const seen = new Set<unknown>();
  const action = (w: string) => (isObj(top[w]) ? str(top[w]["action"]) : undefined);
  const twice = WORDS.filter((w) => {
    const a = action(w);
    return a !== undefined && (seen.has(a) || !seen.add(a));
  });
  const v = { ...top };
  for (const w of twice) delete v[w];
  return v;
}

function placed(o: Obj): [string, unknown][] {
  const lists: [string, unknown][] = LISTS.filter((k) => (o["type"] !== "table" || k !== "rows") && k in o).map((k) => [k, o[k]]);
  const rounds = Array.isArray(o["rounds"]) ? o["rounds"] : [];
  rounds.forEach((r, i) => isObj(r) && "blocks" in r && lists.push([`rounds/${i}/blocks`, r["blocks"]]));
  return lists.flatMap(([at, l]) => (Array.isArray(l) ? l.map((v, i): [string, unknown] => [`${at}/${i}`, v]) : []));
}

function unplaced(s: Obj): string | undefined {
  const steps = Array.isArray(s["steps"]) ? s["steps"] : [];
  if (steps.length === 0) return undefined;
  const at = s["current"] == null ? undefined : steps.some((x) => isObj(x) && x["id"] === s["current"]);
  const done = s["done"] === true;
  if (s["bars"] != null) return "a steps block with both steps and bars";
  if (at === false) return "a stepper whose current names no step";
  if (at === true && done) return "a stepper both done and at a current step";
  if (at === undefined && !done) return "a stepper with neither a current step nor done";
  return undefined;
}

class Walk {
  ids = new Map<string, string>();
  acts = new Map<string, string>();
  keys: string[] = [];
  rows = new Set<string>();
  aims: [string, string][] = [];
  out: Fault[] = [];
  app: readonly string[];
  constructor(app: readonly string[]) {
    this.app = app;
  }

  block(v: unknown, at: string, scope: string): void {
    if (!isObj(v)) {
      this.out.push({ fault: "shape", kind: "", why: "a block that is no object" });
      return;
    }
    const kind = str(v["type"]) ?? "";
    const id = str(v["id"]);
    if (id === "") this.out.push({ fault: "unnamed", kind });
    else if (id !== undefined) {
      const first = this.ids.get(id);
      this.ids.set(id, at);
      if (first !== undefined) this.out.push({ fault: "twice", id, at: [first, at] });
    } else if (kind === "island" || WORDS.some((w) => isObj(v[w]))) this.out.push({ fault: "unnamed", kind });
    const core = KINDS.includes(kind);
    const fallback = isObj(v["fallback"]) ? str(v["fallback"]["title"]) : undefined;
    if ((kind === "island" || (this.app.includes(kind) && !core)) && !fallback) this.out.push({ fault: "bare", kind, id: id ?? "" });
    if (core) {
      const inner = id || scope;
      const top = shallow(v);
      this.sends(sentOnce(top), at, inner);
      this.core(kind, v, top);
      const own = kind === "screen" && v["focus"] !== true;
      for (const [p, c] of placed(v)) {
        if (isObj(c) && c["type"] === "section" && c["side"] === true && !(own && p.startsWith("blocks/")))
          this.out.push({ fault: "shape", kind: "section", why: "side is set on a section that is not a non-focus screen's own block" });
        this.block(c, `${at}/${p}`, inner);
      }
    } else if (!this.app.includes(kind)) this.out.push({ fault: "unknown", kind });
  }

  sends(v: unknown, at: string, scope: string) {
    if (Array.isArray(v)) return v.forEach((x, i) => (isObj(x) || Array.isArray(x)) && this.sends(x, `${at}/${i}`, scope));
    if (!isObj(v)) return;
    for (const k of LINKS) {
      const url = str(v[k]);
      if (url !== undefined && !linkable(url)) this.out.push({ fault: "link", at, url });
    }
    const action = str(v["action"]);
    if (action !== undefined) {
      const key = JSON.stringify([scope, action]);
      const first = this.acts.get(key);
      this.acts.set(key, at);
      if (first !== undefined) this.out.push({ fault: "act-twice", block: scope, action, at: [first, at] });
    }
    for (const k of sorted(v)) if (k !== "fallback" && (isObj(v[k]) || Array.isArray(v[k]))) this.sends(v[k], `${at}/${k}`, scope);
  }

  core(kind: string, o: Obj, top: Obj) {
    const def = defs[kinds[kind] ?? ""];
    if (!fits({ $ref: "#/$defs/Block" }, top) || typeof def !== "object") {
      this.out.push({ fault: "shape", kind, why: "a block that does not fit its kind" });
    } else {
      const known = def.properties ?? {};
      for (const field of sorted(top)) if (!(field in known) && field !== "type" && field !== "fallback") this.out.push({ fault: "extra", kind, field });
      const why = kind === "steps" ? unplaced(top) : undefined;
      if (why !== undefined) this.out.push({ fault: "shape", kind, why });
    }
    const fields = kind === "form" || kind === "config" ? (Array.isArray(o["fields"]) ? o["fields"] : []) : [];
    const names = kind === "chips" ? [o["name"]] : fields.map((f) => (isObj(f) ? f["name"] : undefined));
    for (const n of names) if (typeof n === "string") this.keys.push(n);
    const id = str(o["id"]);
    if ((kind === "list" || kind === "table") && id !== undefined) this.rows.add(id);
    for (const f of fields) if (isObj(f) && f["type"] === "search" && typeof f["name"] === "string" && typeof f["filters"] === "string") this.aims.push([f["name"], f["filters"]]);
  }
}

function gets(v: unknown, out: string[]) {
  if (Array.isArray(v)) return v.forEach((x) => gets(x, out));
  if (!isObj(v)) return;
  const keys = Object.keys(v);
  const get = str(v["get"]);
  if (keys.length === 1 && get !== undefined) return out.push(get);
  for (const k of keys) if (k !== "calc") gets(v[k], out);
}

/// Every fault of the screen, given the app's own kinds, as the crate's `Built::check`; takes JSON from anywhere.
export function check(screen: unknown, app: readonly string[] = []): Fault[] {
  const w = new Walk(app);
  for (const kind of app) if (KINDS.includes(kind)) w.out.push({ fault: "clash", kind });
  if (isObj(screen) && isObj(screen["state"])) w.keys.push(...sorted(screen["state"]));
  w.block(screen, "", "");
  for (const [field, id] of w.aims) if (!w.rows.has(id)) w.out.push({ fault: "aim", field, id });
  const declared = new Set<string>();
  const twice = w.keys.filter((k) => declared.has(k) || !declared.add(k));
  const used: string[] = [];
  gets(screen, used);
  const state = new Set([...twice, ...used.filter((k) => !declared.has(k))]);
  for (const key of [...state].sort()) w.out.push({ fault: "state", key });
  return w.out;
}

function named(v: unknown, out: Set<string>) {
  if (Array.isArray(v)) return v.forEach((x) => named(x, out));
  if (!isObj(v)) return;
  const action = str(v["action"]);
  if (action !== undefined) out.add(action);
  for (const x of Object.values(v)) named(x, out);
}

/// Every action name the screen can send, sorted, each once.
export function actions(screen: Built): string[] {
  const out = new Set<string>();
  named(screen, out);
  return [...out].sort();
}
