import { Component, createElement, memo, type ReactNode, useContext } from "react";
import { type Fallback, hooks, type Kind, named, type Of, role } from "../../src/core/index.ts";
import { type Ctx, Cx } from "./act.ts";
import { press } from "./draw.ts";
import { views } from "./gen/views.ts";
import { type Attrs, h } from "./h.ts";
import { Isle } from "./island.ts";

export type Blk = Record<string, unknown>;
/// The views this adapter draws natively, one per file in `kinds/`, each given its block and the hooks for its root.
export type Views = { [K in Kind]?: (p: { b: Of<K>; hooks: Attrs }) => ReactNode };

const isBlk = (v: unknown): v is Blk => typeof v === "object" && v !== null && !Array.isArray(v);
const core = (b: Blk): b is Of<Kind> => Object.prototype.hasOwnProperty.call(hooks, String(b["type"]));
const isIsland = (b: Blk): b is Of<"island"> & Blk => b["type"] === "island" && typeof b["name"] === "string" && isBlk(b["fallback"]);
const isFallback = (v: unknown): v is Fallback => isBlk(v) && typeof v["title"] === "string";

/// What a block's root carries in any adapter: its classes, `data-*`, `hidden`, `aria-busy`, role and name.
export function hooksOf(b: Blk, cx: Ctx, fallback: boolean, cont = false): Attrs {
  const t = String(b["type"]);
  const id = typeof b["id"] === "string" ? b["id"] : undefined;
  const v = core(b) ? hooks[b.type].variant : null;
  return {
    className: `b${core(b) ? "" : " b-app"} b-${t}${cont ? " cont" : ""}`,
    "data-block": t,
    "data-id": id,
    "data-variant": v && b[v] != null ? String(b[v]) : undefined,
    "data-tone": typeof b["tone"] === "string" ? b["tone"] : undefined,
    "data-fallback": fallback ? "" : undefined,
    hidden: id !== undefined && cx.v.hidden.has(id) ? true : undefined,
    "aria-busy": id !== undefined && cx.busy.has(id) ? true : undefined,
    role: role(b, t),
    "aria-label": named(b, t),
  };
}

/// A fallback's row: its title and subtitle, pressable when it has a tap.
export function row(f: Fallback, cx: Ctx): ReactNode {
  const tap = f.tap;
  const pressed = tap ? press(() => cx.tap(tap)) : null;
  const sub = f.subtitle != null ? h("span", "rs b-row__subtitle", null, f.subtitle) : null;
  return h("div", tap ? "row tap" : "row", pressed, h("span", "rm", null, h("span", "rt b-row__title as-title-label", null, f.title), sub));
}

const said = (a: Blk | undefined, b: Blk) => b["type"] === "message" && a?.["type"] === "message" && a["role"] === b["role"] && a["name"] === b["name"];

/// Each block of `bs` drawn by the draw rule, keyed by its id.
export const kids = (bs: unknown): ReactNode[] => {
  const all = Array.isArray(bs) ? bs.filter(isBlk) : [];
  return all.map((b, i) => createElement(Block, { key: typeof b["id"] === "string" ? b["id"] : `~${i}`, b, cont: said(all[i - 1], b) }));
};

/// A block's fallback row, then its children.
export function Fallen({ b }: { b: Blk }): ReactNode {
  const cx = useContext(Cx);
  const f = b["fallback"] ?? { title: String(b["type"]) };
  return h("div", "", hooksOf(b, cx, true), isFallback(f) ? row(f, cx) : null, ...kids(b["blocks"]));
}

type Caught = { b: Blk; report: Ctx["report"]; fallback: ReactNode; children?: ReactNode };

/// Draws `fallback` in place of children that threw, reports it, and tries again when the block's data changes.
export class Boundary extends Component<Caught, { threw: boolean }> {
  override state = { threw: false };
  static getDerivedStateFromError() {
    return { threw: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.report({ what: "threw", block: String(this.props.b["id"] ?? this.props.b["type"]), error });
  }
  override componentDidUpdate(was: Caught) {
    if (was.b !== this.props.b && this.state.threw) this.setState({ threw: false });
  }
  override render() {
    return this.state.threw ? this.props.fallback : this.props.children;
  }
}

const own = <K extends Kind>(t: K, b: Of<K>, attrs: Attrs): ReactNode => {
  const V = views[t];
  return V ? createElement(V, { b, hooks: attrs }) : undefined;
};

function Draw({ b, cont }: { b: Blk; cont: boolean }): ReactNode {
  const cx = useContext(Cx);
  if (isIsland(b)) return createElement(Isle, { b, attrs: hooksOf(b, cx, false) });
  if (core(b)) return own(b.type, b, hooksOf(b, cx, false, cont)) ?? createElement(Fallen, { b });
  const K = cx.kinds[String(b["type"])];
  const act = (a: Parameters<Ctx["act"]>[0]) => cx.act({ ...a, block: typeof b["id"] === "string" ? b["id"] : null });
  return K ? h("div", "", hooksOf(b, cx, false), createElement(K, { block: { ...b, type: String(b["type"]) }, act })) : createElement(Fallen, { b });
}

/// One block by the draw rule: its kind's view, else the app's, else its fallback and then its children; one that throws draws its fallback.
export const Block = memo(function Block({ b, cont = false }: { b: Blk; cont?: boolean }): ReactNode {
  const cx = useContext(Cx);
  return createElement(Boundary, { b, report: cx.report, fallback: createElement(Fallen, { b }) }, createElement(Draw, { b, cont }));
});

