import type { SideBadge, Sidebar } from "../../gen/types.ts";

/// The title a phone's sidebar bar shows: the current page's label, else the brand's, else the sidebar's name.
export const sideTitle = (b: Sidebar): string => [...b.groups.flatMap((g) => g.links.flatMap((l) => [l, ...(l.children ?? [])])), ...(b.footer ?? [])].find((l) => l.current)?.label ?? b.brand?.label ?? b.label;
/// A link's icon as its glyph and whether it is two capitals drawn as initials; no icon is the label's first letter.
export const sideIcon = (l: { label: string; icon?: string | null | undefined }): [string, boolean] => [l.icon || l.label.slice(0, 1).toUpperCase(), /^[A-Z]{2}$/.test(l.icon ?? "")];
/// A badge as drawn, capped at 99+, and as read, with the true count.
export const sideCount = (b: SideBadge): [string, string] => [b.count > 99 ? "99+" : String(b.count), `${b.count} ${b.tone === "bad" ? "need attention" : "new"}`];
