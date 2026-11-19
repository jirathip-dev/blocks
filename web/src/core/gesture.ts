/// The gesture words, as the crate's `gesture::Word`: each is the name of a field on the kinds that take it.
export const WORDS = ["reorder", "move", "stretch", "edit", "draw", "remove"] as const;
/// One gesture word.
export type Word = (typeof WORDS)[number];
/// Where one item's gesture is, as the crate's `gesture::Phase`.
export type Phase<C> = { at: "idle" } | { at: "pressed" } | { at: "dragging" } | { at: "previewing"; c: C } | { at: "sent"; c: C } | { at: "confirmed" } | { at: "refused"; why: string };
/// What happens to it, as the crate's `gesture::Event`.
export type Event<C> = { on: "press" } | { on: "move"; c?: C | null } | { on: "release" } | { on: "cancel" } | { on: "answer"; ok: boolean; why?: string | null } | { on: "settled" };
/// What the renderer must do after a step, besides drawing the phase.
export type Effect<C> = "tap" | { send: C };
/// A nudge by a key or a named accessibility action; `big` is Shift's.
export type Nudge = { dir: "left" | "right" | "up" | "down"; big?: boolean };
/// What a kind that takes gestures answers, as the crate's `gesture::Rules`; no pixels, no time.
export type Rules<B, G, R, C> = {
  word(b: B, g: G): Word | null;
  start(b: B, g: G): C | null;
  candidate(b: B, g: G, r: R): C | null;
  nudge(b: B, g: G, from: C, by: Nudge): C | null;
  steps(b: B, g: G): [string, Nudge][];
  says(b: B, g: G, c: C): string;
};

/// Whether two results are the same value.
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/// One step, as the crate's `gesture::step`: total, no clock, no I/O. `start` is the item as the data has it.
export function step<C>(p: Phase<C>, e: Event<C>, start: C): [Phase<C>, Effect<C> | null] {
  const live = p.at === "pressed" || p.at === "dragging" || p.at === "previewing";
  if (p.at === "idle" && e.on === "press") return [{ at: "pressed" }, null];
  if (p.at === "pressed" && e.on === "release") return [{ at: "idle" }, "tap"];
  if (live && e.on === "move") return e.c == null ? [{ at: "dragging" }, null] : [{ at: "previewing", c: e.c }, null];
  if ((live && e.on === "cancel") || (p.at === "dragging" && e.on === "release")) return [{ at: "idle" }, null];
  if (p.at === "previewing" && e.on === "release") return same(p.c, start) ? [{ at: "idle" }, null] : [{ at: "sent", c: p.c }, { send: p.c }];
  if (p.at === "sent" && e.on === "answer") return e.ok ? [{ at: "confirmed" }, null] : [{ at: "refused", why: e.why ?? "" }, null];
  if ((p.at === "confirmed" || p.at === "refused") && e.on === "settled") return [{ at: "idle" }, null];
  return [p, null];
}
