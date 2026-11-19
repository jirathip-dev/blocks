import { createElement, type ReactNode, useMemo, useRef, useSyncExternalStore } from "react";
import { type Built, hooks, type Kind, type Look, share } from "../../src/core/index.ts";
import { Cx, type KindProps, type Props, useCx } from "./act.ts";
import { Block } from "./block.ts";
import { views } from "./gen/views.ts";
import { h } from "./h.ts";

/// An app's own kinds; a core kind's name here does not compile, as in the HTML shell's `AppBlocks`.
export type AppKinds = Record<string, (p: KindProps) => ReactNode> & { [K in Kind]?: never };
export type BlocksViewProps = Props & { screen: Built; kinds?: AppKinds; look?: Look; mode?: "auto" | "light" | "dark" };

/// The kinds this adapter draws natively; the others draw their fallback.
export const native: readonly Kind[] = Object.keys(hooks).filter((k): k is Kind => Object.prototype.hasOwnProperty.call(views, k));

const DARK = "(prefers-color-scheme: dark)";
const watch = (on: () => void) => {
  const m = matchMedia(DARK);
  m.addEventListener("change", on);
  return () => m.removeEventListener("change", on);
};

/// Draws a checked screen and draws it again when handed the next one, keeping each unchanged block as it was.
export function BlocksView(p: BlocksViewProps): ReactNode {
  const last = useRef<Built | undefined>(undefined);
  const screen = useMemo(() => (last.current = share(last.current, p.screen)), [p.screen]);
  const { cx, ask } = useCx(p, screen);
  const dark = useSyncExternalStore(watch, () => matchMedia(DARK).matches, () => false);
  const s = p.look?.[p.mode === "dark" || (p.mode !== "light" && dark) ? "dark" : "light"];
  const style = s ? { ...s.tokens, colorScheme: s["color-scheme"] } : undefined;
  return h("div", "b-view", { style }, createElement(Cx.Provider, { value: cx }, createElement(Block, { b: screen })), ask);
}
