import type { Gesture, Mark, MarkKind, Media } from "../../gen/types.ts";
import type { Nudge, Rules, Word } from "../gesture.ts";

/// A place on the picture, `[x, y]` from 0 to 1 of it.
export type Spot = [number, number];
/// What a draw, a move or a stretch gives, as the crate's `MarkChange`; a remove gives `id` alone.
export type MarkChange = { id?: string; kind?: MarkKind; at?: number[]; to?: number[]; text?: string; group?: string };
/// What a new mark is made with, as the crate's `Pen`: its tool, and for keys and named actions where it goes.
export type Pen = { tool: MarkKind; at?: Spot; text?: string; group?: string };
/// What a gesture on a picture's marks holds, as the crate's `MarkGrab`.
export type MarkGrab = { body: string } | { start: string } | { end: string } | { remove: string } | { draw: Pen };
/// A pointer over the picture: where it was pressed and where it is now.
export type MarkReach = { from: Spot; to: Spot };

const SMALL = 0.02;
const SIDE = 0.05;
const MIDDLE: Spot = [0.5, 0.5];
const WORDS: Record<MarkKind, string> = { arrow: "Arrow", box: "Box", ellipse: "Ellipse", text: "Text", pin: "Pin", highlight: "Highlight", line: "Line" };
const TWO = new Set<MarkKind>(["arrow", "box", "ellipse", "highlight", "line"]);

const round = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 10000) / 10000 + 0;
const snap = ([x, y]: Spot): Spot => [round(x), round(y)];
const spot = (p?: number[] | null): Spot | null => (p?.length === 2 && p[0] !== undefined && p[1] !== undefined ? [p[0], p[1]] : null);
const ends = (c: MarkChange): [Spot, Spot | null] | null => {
  const at = spot(c.at);
  const to = c.to === undefined ? null : spot(c.to);
  return at && (c.to === undefined || to) ? [at, to] : null;
};
const big = ([ax, ay]: Spot, [tx, ty]: Spot) => Math.max(Math.abs(tx - ax), Math.abs(ty - ay)) >= SMALL;
const placed = (c: MarkChange, at: Spot, to: Spot | null): MarkChange => {
  const { to: _, ...rest } = c;
  return to ? { ...rest, at: snap(at), to: snap(to) } : { ...rest, at: snap(at) };
};
const moved = (c: MarkChange, [dx, dy]: Spot): MarkChange | null => {
  const e = ends(c);
  if (!e) return null;
  const [[ax, ay], to] = e;
  const [tx, ty] = to ?? [ax, ay];
  const x = Math.min(Math.max(dx, -Math.min(ax, tx)), 1 - Math.max(ax, tx));
  const y = Math.min(Math.max(dy, -Math.min(ay, ty)), 1 - Math.max(ay, ty));
  return placed(c, [ax + x, ay + y], to && [tx + x, ty + y]);
};
const stretched = (c: MarkChange, end: boolean, [dx, dy]: Spot): MarkChange | null => {
  const e = ends(c);
  if (!e?.[1]) return null;
  const [at, to] = [e[0], e[1]];
  const [[x, y], fixed] = end ? [to, at] : [at, to];
  const pulled = snap([x + dx, y + dy]);
  const [a, t] = end ? [fixed, pulled] : [pulled, fixed];
  return big(a, t) ? placed(c, a, t) : null;
};
const made = (p: Pen, at: Spot, to: Spot | null): MarkChange | null => {
  const text = p.tool === "text" ? p.text?.trim() && p.text : undefined;
  if (p.tool === "text" && !text) return null;
  const c: MarkChange = { kind: p.tool };
  if (text) c.text = text;
  if (p.group != null) c.group = p.group;
  return placed(c, at, to);
};
const drawn = (p: Pen, from: Spot, to: Spot): MarkChange | null => {
  const [f, t] = [snap(from), snap(to)];
  if (p.tool === "pin" || p.tool === "text") return made(p, t, null);
  return TWO.has(p.tool) && big(f, t) ? made(p, f, t) : null;
};
const keyed = (p: Pen): MarkChange | null => {
  const [x, y] = p.at ?? MIDDLE;
  return TWO.has(p.tool) ? made(p, [x - SIDE, y - SIDE], [x + SIDE, y + SIDE]) : made(p, [x, y], null);
};
const toward = ([dx, dy]: Spot): Nudge["dir"] => (Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up");
const BACK = { left: "right", right: "left", up: "down", down: "up" } as const;
const idOf = (g: MarkGrab): string | null => ("body" in g ? g.body : "start" in g ? g.start : "end" in g ? g.end : "remove" in g ? g.remove : null);
const of = (b: Media, id: string): Mark | undefined => b.marks?.find((m) => m.id === id);
const live = (b: Media, id: string, g?: Gesture | null) => (g ? of(b, id) : undefined);

/// The word a mark's kind is spoken as.
export const said = (k: MarkKind): string => WORDS[k] ?? k;

/// The ninth of the picture a place is in: "upper left", "centre", "middle right".
export const ninth = ([x, y]: Spot): string => {
  const row = y < 1 / 3 ? "upper" : y < 2 / 3 ? "middle" : "lower";
  const col = x < 1 / 3 ? "left" : x < 2 / 3 ? "centre" : "right";
  return row === "middle" && col === "centre" ? "centre" : `${row} ${col}`;
};

/// A mark's spoken name, as the crate's `Media::named`: its group, its kind and number, and its ninth.
export const named = (b: Media, id: string): string | null => {
  const m = of(b, id);
  if (!m) return null;
  const n = (b.marks ?? []).filter((o) => o.kind === m.kind).findIndex((o) => o.id === id) + 1;
  const group = m.group != null ? `${m.group}, ` : "";
  const place = ninth(spot(m.at) ?? MIDDLE);
  const text = m.text ?? "";
  if (m.kind === "text") return `${group}Text “${text}”, ${place}`;
  if (m.kind === "pin" && text) return `${group}Pin ${text}, ${place}`;
  return `${group}${said(m.kind)} ${n}, ${place}`;
};

/// A picture's mark rules, as the crate's `impl Rules for Media`: a grab is a mark's body, an end, its removal or a pen.
export const media: Rules<Media, MarkGrab, MarkReach, MarkChange> = {
  word: (b, g): Word | null => {
    const id = idOf(g);
    const m = id === null ? null : live(b, id, "body" in g ? b.move : "remove" in g ? b.remove : b.stretch);
    if ("draw" in g) return b.draw != null && b.tools?.includes(g.draw.tool) && g.draw.tool in WORDS ? "draw" : null;
    if (!m || m.fixed === true) return null;
    if ("body" in g) return "move";
    if ("remove" in g) return "remove";
    return m.to != null ? "stretch" : null;
  },
  start: (b, g) => {
    if (!media.word(b, g)) return null;
    const m = of(b, idOf(g) ?? "");
    if (!m) return {};
    const c: MarkChange = m.to != null ? { id: m.id, at: m.at, to: m.to } : { id: m.id, at: m.at };
    const e = ends(c);
    return e && placed(c, e[0], e[1]);
  },
  candidate: (b, g, r) => {
    const s = media.start(b, g);
    if (!s) return null;
    const d: Spot = [r.to[0] - r.from[0], r.to[1] - r.from[1]];
    if ("body" in g) return moved(s, d);
    if ("start" in g) return stretched(s, false, d);
    if ("end" in g) return stretched(s, true, d);
    if ("remove" in g) return { id: g.remove };
    return r.from.every((v) => v >= 0 && v <= 1) ? drawn(g.draw, r.from, r.to) : null;
  },
  nudge: (b, g, from, by) => {
    const s = media.start(b, g);
    if (!s) return null;
    const k = by.big ? 0.1 : 0.01;
    const d: Spot = by.dir === "left" ? [-k, 0] : by.dir === "right" ? [k, 0] : by.dir === "up" ? [0, -k] : [0, k];
    const next =
      "draw" in g && JSON.stringify(from) === JSON.stringify(s)
        ? keyed(g.draw)
        : "body" in g || "draw" in g
          ? moved(from, d)
          : "start" in g
            ? stretched(from, false, d)
            : "end" in g
              ? stretched(from, true, d)
              : { id: g.remove };
    return next && JSON.stringify(next) !== JSON.stringify(from) ? next : null;
  },
  steps: (b, g) => {
    const s = media.start(b, g);
    if (!s) return [];
    let ways: [string, Nudge["dir"]][];
    if ("body" in g) ways = [["Move up", "up"], ["Move down", "down"], ["Move left", "left"], ["Move right", "right"]];
    else if ("remove" in g) ways = [["Delete", "right"]];
    else if ("draw" in g) ways = [[`Add ${said(g.draw.tool).toLowerCase()}`, "right"]];
    else {
      const e = ends(s);
      if (!e?.[1]) return [];
      const [[ax, ay], [tx, ty]] = [e[0], e[1]];
      const d = toward("end" in g ? [tx - ax, ty - ay] : [ax - tx, ay - ty]);
      ways = [["Longer", d], ["Shorter", BACK[d]]];
    }
    return ways.map(([n, dir]): [string, Nudge] => [n, { dir }]).filter(([, n]) => media.nudge(b, g, s, n) !== null);
  },
  says: (b, g, c) => {
    const id = idOf(g);
    const m = id === null ? undefined : of(b, id);
    if ("remove" in g && c.at === undefined) return `Delete ${named(b, g.remove) ?? ""}`;
    const kind = c.kind ?? m?.kind ?? "arrow";
    const text = c.text ?? m?.text;
    const what = kind === "text" && text != null ? `Text “${text}”` : said(kind);
    const e = ends(c);
    if (!e) return what;
    return e[1] ? `${what}, ${ninth(e[0])} to ${ninth(e[1])}` : `${what}, ${ninth(e[0])}`;
  },
};
