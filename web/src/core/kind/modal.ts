import type { Modal } from "../../gen/types.ts";
import type { Nudge, Rules } from "../gesture.ts";

/// Where a modal is: its offset from the viewport's centre and its size.
export type Place = { x: number; y: number; w: number; h: number };
/// The part grabbed: the header moves it, a tool window's corner or right edge resizes it, the phone handle swipes it away.
export type ModalGrab = "head" | "corner" | "edge" | "handle";
/// What a modal's rules read: the block, its place now and the viewport.
export type Framed = { b: Modal; at: Place; vw: number; vh: number };
/// How far the pointer went since the press.
export type ModalReach = { dx: number; dy: number };

const MIN = { w: 280, h: 200, margin: 16 };
const STEP = 16;
const BIG = 64;

/// The modal's variant: a dialog unless it says alert or tool.
export const variant = (b: Modal): "dialog" | "alert" | "tool" => (b.variant === "alert" || b.variant === "tool" ? b.variant : "dialog");

const fit = (v: number, lo: number, hi: number) => Math.round(Math.min(Math.max(v, lo), Math.max(lo, hi)));

/// The place kept inside the viewport with the margin: a size no bigger than it, an offset that keeps every edge on screen.
export function clamp(p: Place, vw: number, vh: number): Place {
  const w = Math.min(p.w, vw - 2 * MIN.margin);
  const h = Math.min(p.h, vh - 2 * MIN.margin);
  const mx = Math.max(0, (vw - w) / 2 - MIN.margin);
  const my = Math.max(0, (vh - h) / 2 - MIN.margin);
  return { x: fit(p.x, -mx, mx), y: fit(p.y, -my, my), w: Math.round(w), h: Math.round(h) };
}

const sized = (f: Framed, dw: number, dh: number): Place => {
  const w = fit(f.at.w + dw, MIN.w, f.vw - 2 * MIN.margin);
  const h = fit(f.at.h + dh, MIN.h, f.vh - 2 * MIN.margin);
  return clamp({ x: f.at.x + (w - f.at.w) / 2, y: f.at.y + (h - f.at.h) / 2, w, h }, f.vw, f.vh);
};

/// How far down a swipe on the handle must go to close the sheet: a third of its height, at most 120 px.
export const gone = (f: Framed) => Math.min(f.at.h / 3, 120);

const MOVES: [string, Nudge][] = [
  ["move left", { dir: "left" }],
  ["move right", { dir: "right" }],
  ["move up", { dir: "up" }],
  ["move down", { dir: "down" }],
];
const SIZES: [string, Nudge][] = [
  ["narrower", { dir: "left" }],
  ["wider", { dir: "right" }],
  ["shorter", { dir: "up" }],
  ["taller", { dir: "down" }],
];

const BY: Record<Nudge["dir"], [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const toward = (n: Nudge) => {
  const d = n.big ? BIG : STEP;
  const [x, y] = BY[n.dir];
  return { dx: x * d, dy: y * d };
};

const said = (d: number, less: string, more: string) => {
  if (d === 0) return "";
  return d < 0 ? less : more;
};

/// A modal's gesture rules over `gesture::step`: a header drag is `move`, a tool window's corner or edge is `stretch`, the phone handle is `remove`.
export const modal: Rules<Framed, ModalGrab, ModalReach, Place> = {
  word: (f, g) => {
    const v = variant(f.b);
    if (g === "head") return v === "alert" ? null : "move";
    if (g === "handle") return v === "alert" ? null : "remove";
    return v === "tool" ? "stretch" : null;
  },
  start: (f, g) => {
    if (!modal.word(f, g)) return null;
    return g === "handle" ? { ...f.at, x: 0, y: 0 } : f.at;
  },
  candidate: (f, g, r) => {
    if (!modal.word(f, g)) return null;
    if (g === "head") return clamp({ ...f.at, x: f.at.x + r.dx, y: f.at.y + r.dy }, f.vw, f.vh);
    if (g === "handle") return { ...f.at, x: 0, y: Math.max(0, Math.round(r.dy)) };
    return sized(f, r.dx, g === "corner" ? r.dy : 0);
  },
  nudge: (f, g, from, by) => {
    if (!modal.word(f, g) || g === "handle") return null;
    const { dx, dy } = toward(by);
    if (g === "edge" && dy !== 0) return null;
    return g === "head" ? clamp({ ...from, x: from.x + dx, y: from.y + dy }, f.vw, f.vh) : sized({ ...f, at: from }, dx, dy);
  },
  steps: (f, g) => {
    if (!modal.word(f, g)) return [];
    if (g === "head") return MOVES;
    return g === "corner" ? SIZES : [];
  },
  says: (f, g, c) => {
    if (g === "handle") return c.y >= gone(f) ? "closes" : "springs back";
    if (g !== "head") return `${c.w} by ${c.h}`;
    const where = [said(c.x - f.at.x, "left", "right"), said(c.y - f.at.y, "up", "down")].filter(Boolean).join(" and ");
    return where ? `moved ${where}` : "in place";
  },
};
