/// Whether `text` holds every word of `q`, in any case: the rule a search's `filters` keeps a row by.
export function hits(text: string, q: string): boolean {
  const t = text.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w));
}

/// A typing sender: `key` sends the text 250 ms after the last key, `now` at once; one text is in flight at a time, only the newest waits behind it, and `busy` is on until the app has answered.
export function typing(send: (q: string) => unknown, busy: (on: boolean) => void) {
  let wait: ReturnType<typeof setTimeout> | undefined;
  let flying = false;
  let next: string | undefined;
  const go = (q: string) => {
    flying = true;
    busy(true);
    void Promise.resolve(send(q)).then(land, land);
  };
  const land = () => {
    flying = false;
    const q = next;
    next = undefined;
    if (q === undefined) busy(false);
    else go(q);
  };
  const now = (q: string) => {
    clearTimeout(wait);
    if (flying) next = q;
    else go(q);
  };
  const key = (q: string) => {
    clearTimeout(wait);
    wait = setTimeout(() => now(q), 250);
  };
  return { key, now };
}

type Blk = Record<string, unknown>;
/// A list or table a search filters: the search's name and text, and how many of its rows hit, of how many.
export type Seek = { name: string; q: string; n: number; m: number };

const rec = (v: unknown): v is Blk => typeof v === "object" && v !== null && !Array.isArray(v);
function text(v: unknown): string {
  if (typeof v === "string" || typeof v === "number") return String(v);
  return rec(v) ? text(v["text"]) : "";
}

/// The text a row is matched on: a table row's cells, else a row's title, subtitle and value.
export function said(r: unknown): string {
  if (!rec(r)) return "";
  return (rec(r["cells"]) ? Object.values(r["cells"]) : [r["title"], r["subtitle"], r["value"]]).map(text).join(" ");
}

function each(v: unknown, f: (b: Blk) => void) {
  if (Array.isArray(v)) return v.forEach((x) => each(x, f));
  if (!rec(v)) return;
  f(v);
  each(v["blocks"], f);
}

/// Each list or table a search on `screen` filters, by its id, with the search's text in `state`.
export function seeks(screen: unknown, state: Blk): Record<string, Seek> {
  const rows: Record<string, unknown[]> = {};
  const aims: [string, string][] = [];
  each(screen, (b) => {
    if ((b["type"] === "list" || b["type"] === "table") && typeof b["id"] === "string" && Array.isArray(b["rows"])) rows[b["id"]] = b["rows"];
    const fields = b["type"] === "form" || b["type"] === "config" ? b["fields"] : [];
    for (const x of Array.isArray(fields) ? fields : []) if (rec(x) && x["type"] === "search" && typeof x["name"] === "string" && typeof x["filters"] === "string") aims.push([x["name"], x["filters"]]);
  });
  const out: Record<string, Seek> = {};
  for (const [name, id] of aims) {
    const all = (rows[id] ?? []).filter((r) => !(rec(r) && r["group"]));
    const q = String(state[name] ?? "");
    out[id] = { name, q, n: all.filter((r) => hits(said(r), q)).length, m: all.length };
  }
  return out;
}
