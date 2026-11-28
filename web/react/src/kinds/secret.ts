import { type KeyboardEvent, useContext, useRef, useState } from "react";
import type { Secret } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { h } from "../h.ts";

export function secret({ b, hooks }: V<Secret>) {
  const cx = useContext(Cx);
  const [v, setV] = useState("");
  const [sending, setSending] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const send = () => {
    if (!v) return field.current?.focus();
    setSending(true);
    void cx
      .act({ action: b.action, block: b.id, values: { ...b.values, [b.name]: v } })
      .then((ok) => ok && setV(""))
      .finally(() => setSending(false));
  };
  const enter = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    send();
  };
  const own = { ref: field, type: "password", name: b.name, value: v, placeholder: b.set ? "paste to replace" : (b.placeholder ?? ""), autoComplete: "new-password", spellCheck: false };
  const input = h("input", "", { ...own, onChange: (e: { target: { value: string } }) => setV(e.target.value), onKeyDown: enter });
  const k = h("span", "fk", null, b.label ?? b.name, b.set ? h("span", "set", null, "set ✓") : null);
  const note = h("div", "ra", null, h("p", "m sn", null, "sent to the app only, never to the agent"), btn(sending ? "sending…" : "send", "", undefined, b.action, { onClick: send }));
  return h("div", "secret as-surface", hooks, h("label", "fd", null, k, input), note);
}
