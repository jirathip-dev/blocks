import type { LayoutPlace, LayoutTransition } from "../gen/layout.ts";

/// A layout node as the server's checked `layout.json` writes it; `P` is its place, per size class or resolved.
export type Placed<P> = {
  type: string;
  id: string;
  source?: string;
  path?: string;
  label?: string;
  place: P;
  transition: LayoutTransition;
  config?: Record<string, unknown>;
  slots?: Record<string, Placed<P>[]>;
};
/// The checked `layout.json`: a `nav` root placed per size class.
export type Layout = { format: number; theme?: string; root: Placed<{ compact: LayoutPlace; wide: LayoutPlace }> };
/// The tree with one place per node, which is all the shell reads.
export type Resolved = Placed<LayoutPlace>;

export const ALWAYS: LayoutPlace[] = ["cards", "column", "panel", "inline"];
export const SHEET: LayoutPlace[] = ["menu", "sheet", "push"];

/// The tree for one size class: each node keeps the place the file gave that size.
export function resolved(n: Layout["root"], wide: boolean): Resolved {
  const { slots, ...rest } = n;
  return { ...rest, place: wide ? n.place.wide : n.place.compact, ...(slots && { slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, v.map((x) => resolved(x, wide))])) }) };
}

export const walk = (n: Resolved): Resolved[] => Object.values(n.slots ?? {}).flatMap((ns) => ns.flatMap((x) => [x, ...walk(x)]));
export const isScreen = (n: Resolved): n is Resolved & { source: string; path: string } => n.type === "screen" && !!n.source && !!n.path;
