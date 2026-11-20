import { isBlk } from "./tree.ts";

const GLYPH: Record<string, string> = { working: "●", needs: "!", fail: "✗", done: "✓", merged: "✓", idle: "○" };
const WORD: Record<string, string> = { working: "working", needs: "needs you", fail: "failed", done: "done", merged: "merged", idle: "idle" };
const TONE: Record<string, string> = { working: "g", needs: "r", fail: "r", done: "mute", idle: "mute", merged: "g" };

/// A figure's state as the plain theme draws it: its glyph, its word and its tone.
export const figured = (s: string) => ({ glyph: GLYPH[s] ?? "·", word: WORD[s] ?? s, tone: TONE[s] ?? "mute" });

/// `{since}` as an age, `{since, label}` its label with `{}` the age, `{until, label}` with `{rel}` the minutes left, else the value.
export function value(v: unknown): string {
  if (isBlk(v) && "until" in v) return String(v.label ?? "").replace("{rel}", `${Math.max(0, Math.round((Date.parse(String(v.until)) - Date.now()) / 60000))}m`);
  if (isBlk(v) && "since" in v) {
    const s = Math.max(0, (Date.now() - Date.parse(String(v.since))) / 1000);
    if (v.label != null) return String(v.label).replace("{}", s < 120 ? `${Math.floor(s)}s` : s < 7200 ? `${Math.floor(s / 60)}m` : s < 172800 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`);
    return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d`;
  }
  return String(v ?? "");
}
