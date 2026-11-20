import type { TreeDrawn, TreeNode } from "./gen/types.ts";

const under = (e: Element, top: Element | null): HTMLElement[] =>
  Array.from(e.querySelectorAll<HTMLElement>("[data-block]")).filter((c) => (c.parentElement?.closest("[data-block]") ?? null) === top);

const drawn = (e: HTMLElement): TreeDrawn =>
  e.closest("[hidden]") || getComputedStyle(e).display === "none" ? "hidden" : e.dataset["fallback"] === undefined ? "native" : "fallback";

const node = (e: HTMLElement): TreeNode => {
  const r = e.getBoundingClientRect();
  const d = drawn(e);
  const children = d === "hidden" ? [] : under(e, e).map(node);
  return { kind: e.dataset["block"] ?? "", id: e.dataset["id"] || null, variant: e.dataset["variant"] ?? null, drawn: d, role: e.getAttribute("role") ?? "", name: e.getAttribute("aria-label") ?? "", rect: [r.x, r.y, r.width, r.height], text: (e.textContent ?? "").trim(), children };
};

/// The drawn tree under `root`, for the harness: each `[data-block]` in drawn order, with its role, name, rect and text.
export const dump = (root: Element): TreeNode[] => under(root, null).map(node);
