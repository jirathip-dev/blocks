const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/// `next`, with every part equal to `prev`'s kept as `prev`'s object, so an unchanged block is the same object.
export function share<T>(prev: T | undefined, next: T): T {
  if (!isObj(prev) || !isObj(next) || Array.isArray(prev) !== Array.isArray(next)) return next;
  const out: Record<string, unknown> = next;
  const keys = Object.keys(next);
  let same = keys.length === Object.keys(prev).length;
  for (const k of keys) {
    const v = share(prev[k], next[k]);
    if (v !== next[k]) out[k] = v;
    same = same && k in prev && v === prev[k];
  }
  return same ? prev : next;
}
