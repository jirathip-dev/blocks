import { createElement, type ReactNode } from "react";

export type Attrs = Record<string, unknown> & { className?: string };

/// An element as the HTML renderer's `h` writes one: a tag, its classes after `attrs`' own, then its children.
export const h = (tag: string, cls: string, attrs: Attrs | null, ...kids: ReactNode[]) =>
  createElement(tag, { ...attrs, className: [attrs?.className, cls].filter(Boolean).join(" ") || undefined }, ...kids);
