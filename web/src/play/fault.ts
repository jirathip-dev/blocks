import { check } from "../core/check.ts";
import type { Fault } from "../gen/shapes.ts";

/// Where a screen's text goes wrong: its line and column from 1, how many characters to mark, and why.
export type Mark = { line: number; col: number; len: number; why: string };

const STR = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const WORD = /true|false|null/y;
const TOKEN = /"(?:[^"\\\n]|\\.)*"?|[^\s,:{}[\]]+|\S/y;

function stop(t: string): { at: number; want: string } {
  let i = 0;
  let want = "the end";
  const ws = () => {
    while (i < t.length && " \t\n\r".includes(t.charAt(i))) i++;
  };
  const eat = (re: RegExp) => {
    re.lastIndex = i;
    const m = re.exec(t);
    if (m) i += m[0].length;
    return m !== null;
  };
  const member = () => {
    ws();
    if (!eat(STR)) return ((want = "a key in quotes"), false);
    ws();
    if (t.charAt(i) !== ":") return ((want = "a colon"), false);
    i++;
    return value();
  };
  const list = (end: string, item: () => boolean): boolean => {
    i++;
    ws();
    if (t.charAt(i) === end) return (i++, true);
    for (;;) {
      if (!item()) return false;
      ws();
      if (t.charAt(i) === ",") i++;
      else if (t.charAt(i) === end) return (i++, true);
      else return ((want = `a comma or ${end}`), false);
    }
  };
  function value(): boolean {
    ws();
    const c = t.charAt(i);
    if (c === "{") return list("}", member);
    if (c === "[") return list("]", value);
    if (eat(STR) || eat(NUM) || eat(WORD)) return true;
    want = "a value";
    return false;
  }
  if (value()) ws();
  return { at: i, want };
}

function at(text: string, i: number, why: string, len?: number): Mark {
  const before = text.slice(0, i);
  TOKEN.lastIndex = i;
  return { line: before.split("\n").length, col: i - before.lastIndexOf("\n"), len: len ?? TOKEN.exec(text)?.[0].length ?? 1, why };
}

const q = (s: string) => JSON.stringify(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const typed = (kind: string) => `"type"\\s*:\\s*${q(kind)}`;

function said(f: Fault): [string, number, string] {
  switch (f.fault) {
    case "twice":
      return [`"id"\\s*:\\s*${q(f.id)}`, 1, `two blocks have the id ${f.id}`];
    case "act-twice":
      return [`"action"\\s*:\\s*${q(f.action)}`, 1, `${f.block} sends ${f.action} twice`];
    case "unknown":
      return [typed(f.kind), 0, `"${f.kind}" is not a kind`];
    case "extra":
      return [`${q(f.field)}\\s*:`, 0, `a ${f.kind} has no field ${f.field}`];
    case "link":
      return [q(f.url), 0, `${f.url} is no link a page may open`];
    case "state":
      return [q(f.key), 0, `the state key ${f.key} is not declared once`];
    case "unnamed":
      return [typed(f.kind), 0, `a ${f.kind} with no id`];
    case "bare":
      return [typed(f.kind), 0, `the ${f.kind} ${f.id} has no fallback`];
    case "shape":
    case "clash":
      return [typed(f.kind), 0, `${f.kind || "the screen"}: ${f.fault === "shape" ? f.why : "an app kind with a core kind's name"}`];
  }
}

/// The screen in `text`, or the first place it is not JSON or breaks the schema.
export function read(text: string): { value: unknown } | { mark: Mark } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    const s = stop(text);
    return { mark: at(text, s.at, `not JSON: expected ${s.want}`) };
  }
  const f = check(value)[0];
  if (!f) return { value };
  const [re, nth, why] = said(f);
  const hits = [...text.matchAll(new RegExp(re, "g"))];
  const hit = hits[nth] ?? hits[0];
  return { mark: at(text, hit?.index ?? 0, `schema: ${why}`, hit?.[0].length) };
}
