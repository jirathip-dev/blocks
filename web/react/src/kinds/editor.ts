import { type KeyboardEvent, useContext, useEffect, useRef, useState } from "react";
import type { Editor } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

export function editor({ b, hooks }: V<Editor>) {
  const cx = useContext(Cx);
  const [text, setText] = useState<string | null>(null);
  const live = useRef({ b, cx });
  live.current = { b, cx };
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => area.current?.focus(), [text === null]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const first = b.first ?? 1;
  const lines = b.text.split("\n");
  const errs = new Map<number, string>();
  for (const e of b.errors ?? []) if (!errs.has(e.line)) errs.set(e.line, e.message);
  const notes = (cls: string, keep: (n: number) => boolean) => [...errs].filter(([n]) => keep(n)).sort((x, y) => x[0] - y[0]).map(([n, m]) => h("p", cls, { key: `e${n}` }, `line ${n} · ${m}`));
  if (text !== null) {
    const edit = (e: { target: { value: string } }) => {
      const v = e.target.value;
      setText(v);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const o = live.current;
        if (v !== o.b.text) void o.cx.act({ action: o.b.action, block: o.b.id, values: { [o.b.name]: v } });
      }, 400);
    };
    const ta = h("textarea", "", { ref: area, name: b.name, value: text, spellCheck: false, "aria-label": b.name, onChange: edit });
    return h("div", "ed on", { ...hooks, role: "group" }, ta, ...notes("ede", () => true));
  }
  const start = () => setText(b.text);
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    start();
  };
  const rows = lines.flatMap((t, i) => {
    const m = errs.get(first + i);
    return [h("div", m == null ? "edl" : "edl err", null, h("i", "", null, String(first + i)), h("span", "", null, t || " ")), m == null ? null : h("p", "ede", null, m)];
  });
  const far = notes("ede far", (n) => n < first || n >= first + lines.length);
  return h("div", "ed", { ...hooks, role: "button", tabIndex: 0, onClick: start, onKeyDown: key }, ...rows, ...far);
}
