import { createContext, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { type Action, type Built, check, type Confirm, evaluate, type Fault, type Lit, linkable, type Locale, type OnFile, start, type State, type Tap, view, type View } from "../../src/core/index.ts";
import { h } from "./h.ts";

export type Go = { open: string } | { sheet: string } | { thread: string };
export type Report =
  | { what: "fault"; fault: Fault }
  | { what: "dropped"; block: string; event: string }
  | { what: "failed"; action: string; error: unknown }
  | { what: "threw"; block: string; error: unknown };
export type Post = { action: string; block?: string | null; values?: Record<string, unknown> | null; confirm?: Confirm | null };
export type KindProps = { block: Record<string, unknown> & { type: string }; act: (a: Omit<Post, "block">) => Promise<boolean> };
export type IslandProps = { props: Record<string, unknown>; emit: (name: string, values?: Record<string, unknown>) => void };
export type Islands = Record<string, (p: IslandProps) => ReactNode>;
export type Ctx = {
  screen: string;
  locale: Locale;
  v: View;
  state: State;
  edits: State;
  put: (key: string, to: Lit | undefined) => void;
  busy: ReadonlySet<string>;
  act: (a: Post) => Promise<boolean>;
  tap: (t: Tap) => void;
  report: (r: Report) => void;
  kinds: Record<string, (p: KindProps) => ReactNode>;
  islands: Islands;
  file?: OnFile;
};
export type Props = {
  onAction: (a: Action) => Promise<boolean | void> | boolean | void;
  onOpen?: (go: Go) => void;
  kinds?: Record<string, (p: KindProps) => ReactNode>;
  islands?: Islands;
  onReport?: (r: Report) => void;
  onFile?: OnFile;
};

const none: View = { hidden: new Set(), disabled: new Set(), says: {}, acts: new Set(), values: {} };
/// What every block under a view reads: the local state's view, the busy senders and the way out.
export const Cx = createContext<Ctx>({ screen: "", locale: {}, v: none, state: {}, edits: {}, put: () => {}, busy: new Set(), act: async () => false, tap: () => {}, report: () => {}, kinds: {}, islands: {} });

const goOf = (t: Tap): Go | null => (t.open != null ? { open: t.open } : t.sheet != null ? { sheet: t.sheet } : t.thread != null ? { thread: t.thread } : null);

/// The view's state for `screen`: edits over `start()`, the senders in flight, the confirm being asked and the context built from them.
export function useCx(p: Props, screen: Built): { cx: Ctx; ask: ReactNode } {
  const props = useRef(p);
  props.current = p;
  const [edits, setEdits] = useState<State>({});
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [asking, setAsking] = useState<{ c: Confirm; done: (ok: boolean) => void } | null>(null);
  const state = start(screen);
  for (const [k, x] of Object.entries(edits)) if (Object.prototype.hasOwnProperty.call(state, k)) state[k] = x;
  const v = view(screen, state);
  const live = useRef({ screen, state, v, busy: new Set<string>() });
  live.current = { ...live.current, screen, state, v };
  useEffect(() => {
    const out = props.current.onReport;
    if (out) for (const fault of check(screen, Object.keys(props.current.kinds ?? {}))) out({ what: "fault", fault });
  }, [screen]);
  const key = JSON.stringify([[...v.hidden], [...v.disabled], v.says, [...v.acts], v.values, [...busy], state, edits]);
  const cx = useMemo((): Ctx => {
    const report = (r: Report) => props.current.onReport?.(r);
    const mark = (k: string, on: boolean) => {
      const b = live.current.busy;
      if (on) b.add(k);
      else b.delete(k);
      setBusy(new Set(b));
    };
    const act = async (a: Post): Promise<boolean> => {
      const k = a.block ?? a.action;
      if (live.current.busy.has(k) || (a.block != null && live.current.v.disabled.has(a.block))) return false;
      const c = a.confirm;
      if (c && !(await new Promise<boolean>((done) => setAsking({ c, done })))) return false;
      mark(k, true);
      try {
        const sent = { screen: String(live.current.screen.id ?? ""), action: a.action, block: a.block ?? null, values: a.values ?? null };
        return (await props.current.onAction(sent)) !== false;
      } catch (error) {
        report({ what: "failed", action: a.action, error });
        return false;
      } finally {
        mark(k, false);
      }
    };
    const tap = (t: Tap) => {
      const go = goOf(t);
      if (go) props.current.onOpen?.(go);
      if (t.url != null && linkable(t.url)) window.open(t.url, "_blank", "noopener");
      if (t.copy != null) void navigator.clipboard?.writeText(t.copy);
      const sets: Record<string, Lit> = {};
      for (const x of t.set ?? []) sets[x.key] = evaluate(x.to, live.current.state);
      if (t.set?.length) setEdits((e) => ({ ...e, ...sets }));
      if (!go && t.action) void act({ action: t.action, values: t.values });
    };
    const put = (k: string, to: Lit | undefined) =>
      setEdits((e) => ({ ...Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)), ...(to === undefined ? null : { [k]: to }) }));
    return { screen: String(screen.id ?? ""), locale: screen.locale ?? {}, v, state, edits, put, busy, act, tap, report, kinds: p.kinds ?? {}, islands: p.islands ?? {}, file: p.onFile };
  }, [key, screen.id, p.kinds, p.islands, p.onFile]);
  const end = (ok: boolean) => {
    asking?.done(ok);
    setAsking(null);
  };
  const button = (label: string, ok: boolean, cls = "") => h("button", cls, { type: "button", onClick: () => end(ok) }, h("span", "", null, label));
  const ask = asking
    ? h("div", "b-confirm", { role: "dialog" }, h("p", "", null, h("b", "", null, asking.c.title)), asking.c.message ? h("p", "m", null, asking.c.message) : null, h("div", "bar", null, button("cancel", false), button(asking.c.ok ?? "ok", true, asking.c.destructive ? "bad" : "")))
    : null;
  return { cx, ask };
}
