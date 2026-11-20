import { type FormEvent, useContext, useState } from "react";
import type { Choice } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { btn, ticked, type V } from "../draw.ts";
import { h } from "../h.ts";

export function choice({ b, hooks }: V<Choice>) {
  const cx = useContext(Cx);
  const [v, setV] = useState("");
  const opts = [...b.options].sort((x, y) => Number(y.value === b.recommended) - Number(x.value === b.recommended));
  const picks = opts.map((o) => {
    const go = () => void cx.act({ action: b.action, block: b.id, values: { ...b.values, ...o.values, choice: o.value }, confirm: o.confirm });
    return btn(`${o.label}${o.value === b.recommended ? " · recommended" : ""}`, "pick", undefined, b.action, { key: o.value, name: "choice", onClick: go });
  });
  const other = b.other;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (other && v.trim()) void cx.act({ action: b.action, block: b.id, values: { ...b.values, choice: other.for ?? "", other: v } }).then((ok) => ok && setV(""));
  };
  const draft = `draft:${cx.screen}:${String(b.id)}:other`;
  const input = h("input", "", { name: "other", value: v, placeholder: other?.placeholder ?? "other…", autoComplete: "off", "data-draft": draft, onChange: (e: { target: { value: string } }) => setV(e.target.value) });
  const form = other ? h("form", "other", { onSubmit: submit }, input, btn("send", "", undefined, b.action, { type: "submit" })) : null;
  const d = b.default;
  return h("div", "choice", hooks, ...picks, d ? h("p", "m", null, ticked({ until: d.until, label: d.label }, cx)) : null, form);
}
