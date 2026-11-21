/// A tool's state as its glyph: ↻ running, ✓ done, ✕ failed.
export const glyph = (state: string): string => ({ running: "↻", done: "✓", failed: "✕" })[state] ?? "•";
/// The word drawn after a speaker's name: its role, or `agent` for a role this client does not know.
export const roleWord = (role: string): string => (["agent", "owner", "system"].includes(role) ? role : "agent");
/// A file name as its extension and the rest: `plan.pdf` is `["pdf", "plan"]`.
export const ext = (name: string): [string, string] => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(dot + 1), name.slice(0, dot)] : ["", name];
};
/// The letter that stands for a speaker with no avatar.
export const initial = (name: string): string => [...name.trim()][0] ?? "";
