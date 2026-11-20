import { type KeyboardEvent, useContext } from "react";
import type { Field, Form, Lit } from "../../../src/core/index.ts";
import { type Ctx, Cx } from "../act.ts";
import { btn, type V } from "../draw.ts";
import { type FieldView, word } from "../fields/_view.ts";
import { text } from "../fields/text.ts";
import { views } from "../gen/fields.ts";
import { h } from "../h.ts";

const viewOf = (x: Field): FieldView => views[x.type] ?? text;
const note = (x: Field, was: string): [string, string] => (x.error ? ["fn err", x.error] : x.was != null ? ["fn was", `${was} ${x.was}`] : ["fn", x.doc ?? ""]);

function field(x: Field, key: string, cx: Ctx) {
  const v = viewOf(x);
  const [cls, say] = note(x, word(cx, "was"));
  const said = Object.prototype.hasOwnProperty.call(cx.edits, x.name) ? cx.v.says[x.name] : undefined;
  const attrs = { name: x.name, disabled: cx.v.disabled.has(x.name) || undefined, "aria-invalid": x.error ? "true" : undefined };
  const control = v.draw(x, { locale: cx.locale, key, value: cx.state[x.name] ?? null, put: (to: Lit) => cx.put(x.name, to) }, attrs);
  const l = `fd${v.row ?? ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`;
  return h("label", l, { key: x.name, hidden: cx.v.hidden.has(x.name) || undefined }, h("span", "fl", null, h("span", "fk", null, x.label ?? x.name), h("span", cls, null, say)), control, said ? h("span", "fe", null, said) : null);
}

export function form({ b, hooks }: V<Form>) {
  const cx = useContext(Cx);
  const s = b.submit;
  const rows = b.fields.map((x) => field(x, `draft:${cx.screen}:${String(b.id)}:`, cx));
  if (!s) return h("div", "form", { ...hooks, "data-id": b.id ?? "" }, ...rows);
  const values = () => {
    const v: Record<string, unknown> = {};
    for (const x of b.fields) {
      const own = viewOf(x).sent;
      const got = own ? own(x, cx.state[x.name] ?? null) : cx.state[x.name];
      if (typeof got === "string" || typeof got === "boolean" || typeof got === "number") v[x.name] = got;
    }
    return v;
  };
  const send = () => {
    const v = values();
    if (Object.values(v).every((x) => !String(x || "").trim())) return;
    void cx.act({ action: s.action, block: b.id, values: { ...s.values, ...v } }).then((ok) => ok && b.fields.forEach((x) => cx.put(x.name, undefined)));
  };
  const enter = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement) || e.target.type === "checkbox") return;
    e.preventDefault();
    send();
  };
  const busy = cx.busy.has(b.id ?? s.action);
  const off = b.id != null && cx.v.disabled.has(b.id);
  const go = btn(busy ? "sending…" : s.label, "", undefined, s.action, { "data-submit": "", onClick: send }, off);
  return h("div", "form say", { ...hooks, "data-id": b.id ?? "", onKeyDown: enter }, ...rows, go);
}
