import { useContext, useEffect, useRef, useState } from "react";
import type { Form } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { h } from "../h.ts";
import { field, type Held, values } from "./form.ts";

const typed = (i: HTMLInputElement | HTMLSelectElement): string | number | boolean => {
  if (i instanceof HTMLSelectElement) return i.value;
  if (i.type === "checkbox") return i.checked;
  return i.type === "range" ? Number(i.value) : i.value;
};

export function config({ b, hooks }: V<Form>) {
  const cx = useContext(Cx);
  const live = useRef(cx);
  live.current = cx;
  const root = useRef<HTMLDivElement>(null);
  const sent = useRef<Record<string, unknown>>({});
  const [notes, setNotes] = useState<Record<string, [string, string]>>({});
  const save = (name: string, v: unknown) => {
    const a = b.action;
    if (!a || v === "" || v === undefined) return;
    const say = (n: [string, string] | null) => setNotes((o) => ({ ...Object.fromEntries(Object.entries(o).filter(([k]) => k !== name)), ...(n ? { [name]: n } : null) }));
    say(["fn", "saving…"]);
    void live.current.act({ action: a, block: b.id, values: { [name]: v } }).then((ok) => (ok ? (say(null), live.current.put(name, undefined)) : say(["fn err", "not saved"])));
  };
  const commit = useRef(save);
  commit.current = save;
  useEffect(() => {
    const f = root.current;
    const open = b.fields.find((x) => x.open);
    if (open) f?.querySelector<HTMLElement>(`[name="${CSS.escape(open.name)}"]`)?.focus();
    const heard = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type !== "file")) commit.current(t.name, typed(t));
    };
    f?.addEventListener("change", heard);
    return () => f?.removeEventListener("change", heard);
  }, []);
  const held: Held = { sent: sent.current, wait: (n, w) => w.up + w.failed === 0 && save(n, sent.current[n]), block: b.id ?? undefined };
  const rows = b.fields.map((x) => field(x, `draft:${cx.screen}:${String(b.id)}:`, cx, held, notes[x.name]));
  const s = b.submit;
  const go = () => s && void cx.act({ action: s.action, block: b.id, values: { ...s.values, ...values(b.fields, sent.current, cx) } }).then((ok) => ok && b.fields.forEach((x) => cx.put(x.name, undefined)));
  const bar = s ? h("div", "bar", null, btn(s.label, "", undefined, s.action, { onClick: go }, !!s.off)) : null;
  return h("div", "form cfg as-surface", { ...hooks, ref: root, "data-id": b.id ?? "" }, ...rows, bar);
}
