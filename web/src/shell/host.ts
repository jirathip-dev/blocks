import type { OnFile } from "../core/field/files.ts";
import type { Held } from "../gesture.ts";
import type { Block, Kind, Locale } from "../gen/types.ts";
import { patcher } from "../patch.ts";
import { render } from "../render/block.ts";
import type { Ctx, Renderer, Store } from "../render/ctx.ts";
import { sync } from "../render/kind/plot.ts";
import { grow } from "../render/kind/prose.ts";
import type { Theme } from "../theme.ts";

/// An app's own block kinds: a core kind's name here does not compile.
export type AppBlocks = Record<string, Renderer> & { [K in Kind]?: never };
/// The page's parts every screen on it shares.
export type Own = { theme: Theme; store: Store; apps?: AppBlocks | undefined; file?: OnFile | undefined };
/// What a screen hands `host`: its id and locale now, and what its blocks do when tapped or posted.
export type Screen = { screen: () => string; locale?: () => Locale | undefined; act: Ctx["act"]; tap: Ctx["tap"] };
/// A screen's drawing: its kept open set, its Ctx now, and a patcher over a root.
export type Host = ReturnType<typeof host>;

/// The one place a screen's Ctx, its patcher and its kept state are made.
export function host(own: Own, s: Screen) {
  const open = new Set<string>();
  const held = new Map<string, Held>();
  const view = new Map<string, Record<string, unknown>>();
  const ctx = (): Ctx => ({ screen: s.screen(), locale: s.locale?.(), act: s.act, tap: s.tap, open, theme: own.theme, store: own.store, apps: own.apps, held, view, file: own.file });
  const draw = (b: Block) => render(b, ctx());
  const patch = (root: HTMLElement, model: () => Block, saved?: () => void) => patcher({ root, model, draw, grow, sync: { plot: sync }, ...(saved && { saved }) });
  return { open, ctx, draw, patch };
}
