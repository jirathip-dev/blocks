import type { Import } from "../../gen/types.ts";
import type { Ctx } from "../ctx.ts";
import { el } from "../dom.ts";

type View = typeof import("../../lazy/import.ts");
let loaded: View | null = null;
let loading: Promise<View> | null = null;

/// The import kind: its view is its own chunk, fetched on the first draw so a screen without it loads none of it.
export function import_(b: Import, c: Ctx): HTMLElement {
  const box = el("section", "im");
  if (loaded) loaded.draw(box, b, c);
  else void (loading ??= import("../../lazy/import.ts")).then((m) => ((loaded = m), m.draw(box, b, c)));
  return box;
}
