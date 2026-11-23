import { type KeyboardEvent, useContext, useRef, useState } from "react";
import { type Field, fill, type Form, type Lit, lit } from "../../../src/core/index.ts";
import { type Ctx, Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { type FieldView, word } from "../fields/_view.ts";
import { text } from "../fields/text.ts";
import { views } from "../gen/fields.ts";
import { h } from "../h.ts";

const viewOf = (x: Field): FieldView => views[x.type] ?? text;
const note = (x: Field, was: string): [string, string] => (x.error ? ["fn err", x.error] : x.was != null ? ["fn was", `${was} ${x.was}`] : ["fn", x.doc ?? ""]);

type Wait = { up: number; failed: number };
/// Where a form's fields put what they send and the files they wait on.
export type Held = { sent: Record<string, unknown>; wait(name: string, w: Wait): void; block?: string | undefined; send?: ((name: string, v: unknown) => unknown) | undefined; solo?: boolean };

/// A field as a `.fd` label: its name and note (`shown` over it), then the control its type's view draws.
export function field(x: Field, key: string, cx: Ctx, held: Held, shown?: [string, string]) {
  const v = viewOf(x);
  const [cls, say] = shown ?? note(v.group ? { ...x, error: null } : x, word(cx, "was"));
  const said = Object.prototype.hasOwnProperty.call(cx.edits, x.name) ? cx.v.says[x.name] : undefined;
  const attrs = { name: x.name, disabled: cx.v.disabled.has(x.name) || undefined, "aria-invalid": x.error ? "true" : undefined };
  const hold = (sent: unknown, w: Wait) => {
    held.sent[x.name] = sent;
    held.wait(x.name, w);
    cx.put(x.name, lit(x, sent));
  };
  const c = { locale: cx.locale, key, value: cx.state[x.name] ?? null, put: (to: Lit) => cx.put(x.name, to), screen: cx.screen, block: held.block, file: cx.file, hold, send: held.send && ((v: unknown) => held.send?.(x.name, v)), found: "filters" in x && typeof x.filters === "string" ? cx.seek[x.filters] : undefined };
  const control = v.draw(x, c, attrs);
  const l = `fd${v.row ?? ""}${held.solo ? " solo" : ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`;
  return h(v.group ? "div" : "label", l, { key: x.name, hidden: cx.v.hidden.has(x.name) || undefined }, h("span", "fl", null, h("span", "fk", null, x.label ?? x.name), h("span", cls, null, say)), control, said ? h("span", "fe", null, said) : null);
}

/// The values the fields send, as an action's `values` (a toggle is a bool, an upload its ids, an empty secret is left out).
export function values(fields: Field[], sent: Record<string, unknown>, cx: Ctx): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const x of fields) {
    const own = viewOf(x).sent;
    const got = Object.prototype.hasOwnProperty.call(sent, x.name) ? sent[x.name] : own ? own(x, cx.state[x.name] ?? null) : cx.state[x.name];
    if (typeof got === "string" || typeof got === "boolean" || typeof got === "number" || Array.isArray(got)) v[x.name] = got;
  }
  return v;
}

export function form({ b, hooks }: V<Form>) {
  const cx = useContext(Cx);
  const s = b.submit;
  const sent = useRef<Record<string, unknown>>({});
  const [waits, setWaits] = useState<Record<string, Wait>>({});
  const live = s ? undefined : b.action;
  const out = live ? (name: string, v: unknown) => cx.act({ action: live, block: b.id, values: { [name]: v } }) : undefined;
  const held: Held = { sent: sent.current, wait: (n, w) => setWaits((o) => ({ ...o, [n]: w })), block: b.id ?? undefined, send: out, solo: !s && b.fields.length === 1 };
  const rows = b.fields.map((x) => field(x, `draft:${cx.screen}:${String(b.id)}:`, cx, held));
  if (!s) return h("div", "form", { ...hooks, "data-id": b.id ?? "" }, ...rows);
  const send = () => {
    const v = values(b.fields, sent.current, cx);
    if (Object.values(v).every((x) => !String(x || "").trim())) return;
    void cx.act({ action: s.action, block: b.id, values: { ...s.values, ...v } }).then((ok) => ok && b.fields.forEach((x) => cx.put(x.name, undefined)));
  };
  const enter = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement) || e.target.type === "checkbox") return;
    e.preventDefault();
    send();
  };
  const busy = cx.busy.has(b.id ?? s.action);
  const all = Object.values(waits), up = all.reduce((n, w) => n + w.up, 0), bad = all.some((w) => w.failed > 0);
  const off = (b.id != null && cx.v.disabled.has(b.id)) || up > 0 || bad;
  const go = btn(busy ? "sending…" : s.label, "", undefined, s.action, { "data-submit": "", onClick: send }, off);
  const line = bad ? word(cx, "stuck") : up ? fill(word(cx, up > 1 ? "waitN" : "wait1"), { n: up }) : "";
  const wait = b.fields.some((x) => viewOf(x).group) ? h("span", `say-busy${bad ? " bad" : ""}`, null, line) : null;
  return h("div", "form say", { ...hooks, "data-id": b.id ?? "", onKeyDown: enter }, ...rows, wait, go);
}
