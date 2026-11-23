import { createElement, type KeyboardEvent, useRef, useState } from "react";
import { fill, type SearchField, typing } from "../../../src/core/index.ts";
import { btn } from "../draw.ts";
import { h } from "../h.ts";
import { type FieldCx, type FieldView, word } from "./_view.ts";

type Search = Omit<SearchField, "value"> & { value?: unknown };

function Search({ x, c, attrs }: { x: Search; c: FieldCx; attrs: Record<string, unknown> }) {
  const w = (k: string) => word(c, k);
  const [busy, setBusy] = useState(false);
  const out = useRef(c.send);
  out.current = c.send;
  const sender = useRef<ReturnType<typeof typing> | null>(null);
  const send = (sender.current ??= typing((q) => out.current?.(q), setBusy));
  const input = useRef<HTMLInputElement | null>(null);
  const live = !!c.send && x.filters == null;
  const q = c.value == null ? "" : String(c.value);
  const f = c.found;
  const hit = f && q && (f.n ? fill(w("hits"), { n: f.n, m: f.m }) : w("none"));
  const line = busy ? w("busy") : hit || "";
  const wipe = () => {
    c.put("");
    if (live) send.now("");
    input.current?.focus();
  };
  const enter = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || !live) return;
    e.preventDefault();
    send.now(q);
  };
  const own = { ref: input, type: "search", value: q, placeholder: x.placeholder ?? "", autoComplete: "off", "data-draft": c.key + x.name, "data-was": String(x.value ?? "") };
  const typed = (e: { target: { value: string } }) => (c.put(e.target.value), live && send.key(e.target.value));
  return h(
    "span",
    "sb",
    { "aria-busy": busy ? "true" : undefined, "aria-invalid": attrs["aria-invalid"] },
    h("input", "", { ...attrs, ...own, onChange: typed, onKeyDown: enter }),
    h("span", "sbn", { "aria-live": "polite" }, line),
    btn(w("clear"), "sbx", undefined, undefined, { hidden: !q, onClick: wipe }),
  );
}

export const search: FieldView<Search> = { row: " sr", draw: (x, c, attrs) => createElement(Search, { x, c, attrs }) };
