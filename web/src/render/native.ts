import { fallback, R } from "./index.ts";

/// The kinds the HTML renderer draws natively: the others, and an island with no component, draw their fallback.
export const native: readonly string[] = Object.entries(R)
  .filter(([k, r]) => r !== fallback && k !== "island")
  .map(([k]) => k);
