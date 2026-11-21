import type { Op, Part, Span } from "../../gen/types.ts";

export type Append = Extract<Op, { op: "append" }>;

const tail = (spans: Span[] | undefined): Span | undefined => spans?.[spans.length - 1];

/// Grows `parts` by an `append` as the crate's `Prose::grow` does: keep, then parts, then text on the last part; undefined when it does not fit.
export function grow(parts: Part[], op: Append): Part[] | undefined {
  if (op.keep != null && op.keep > parts.length) return undefined;
  const out = [...parts.slice(0, op.keep ?? parts.length), ...structuredClone(op.parts ?? [])];
  if (!op.text) return out;
  const last = out[out.length - 1];
  if (!last || last.part === "rule") return undefined;
  if (last.part === "code") {
    out[out.length - 1] = { ...last, text: last.text + op.text };
    return out;
  }
  const spans = last.part === "list" ? last.items[last.items.length - 1] : last.spans;
  const end = tail(spans);
  if (!spans || !end) return undefined;
  const grown = [...spans.slice(0, -1), { ...end, text: end.text + op.text }];
  out[out.length - 1] = last.part === "list" ? { ...last, items: [...last.items.slice(0, -1), grown] } : { ...last, spans: grown };
  return out;
}
