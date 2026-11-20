import type { OnFile } from "../core/field/files.ts";
import { type Blk, isBlk } from "../core/tree.ts";
import type { Held } from "../gesture.ts";
import type { Locale } from "../gen/types.ts";
import type { Theme } from "../theme.ts";

export type Post = { action: unknown; block?: unknown; values?: unknown; confirm?: unknown };
export type Store = { get(key: string): string | null; put(key: string, value: string | null): void };
export type Renderer = (b: Blk, c: Ctx) => HTMLElement | null;
export type Ctx = {
  screen: string;
  locale?: Locale | undefined;
  act: (a: Post, el?: HTMLElement) => Promise<boolean>;
  tap: (t: unknown) => void;
  open: Set<string>;
  theme: Theme;
  store: Store;
  apps?: Record<string, Renderer> | undefined;
  drop?: (what: string) => void;
  held?: Map<string, Held>;
  view?: Map<string, Record<string, unknown>>;
  file?: OnFile | undefined;
};

export const obj = (v: unknown): Blk => (isBlk(v) ? v : {});
export const draft = (i: HTMLInputElement, key: string, store: Store) => {
  i.dataset["draft"] = key;
  i.value = store.get(key) ?? i.value;
  i.addEventListener("input", () => store.put(key, i.value || null));
};
/// Clears the drafts of the fields under `box`, here and in any copy on the page, once their action succeeded.
export const sent = (box: Element, store: Store) =>
  box.querySelectorAll<HTMLInputElement>("[data-draft]").forEach((i) => {
    const k = i.dataset["draft"] ?? "";
    store.put(k, null);
    document.querySelectorAll<HTMLInputElement>(`[data-draft="${CSS.escape(k)}"]`).forEach((x) => {
      x.value = x.dataset["was"] ?? "";
    });
  });
