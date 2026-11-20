import { type State, view } from "../../core/eval.ts";
import { views } from "../../gen/fields.ts";
import type { Field, Form } from "../../gen/types.ts";
import { type FieldView, word } from "../field/_view.ts";
import { text } from "../field/text.ts";
import { type Ctx, sent } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";

/// A drawn field: its `.fd` row, its name, and the value it sends.
export type Drawn = { row: HTMLElement; name: string; sent(): unknown };

export function form(b: Form, c: Ctx): HTMLElement {
  const f = el("div", `form${b.submit ? " say" : ""}`);
  f.dataset.id = b.id ?? "";
  const all = b.fields.map((x) => field(x, `draft:${c.screen}:${String(b.id)}:`, c));
  f.append(...all.map((d) => d.row));
  const s = b.submit;
  if (!s) return f;
  const go = btn(s.label, "", undefined, s.action);
  go.dataset.submit = "";
  const word = go.firstElementChild ?? go;
  const send = () => {
    const v = values(all);
    if (Object.values(v).every((x) => !String(x || "").trim()) || Object.keys(view(b, v).says).length) return;
    word.textContent = "sending…";
    c.act({ action: s.action, block: b.id, values: { ...s.values, ...v } }, go)
      .then((ok) => ok && sent(f, c.store))
      .finally(() => (word.textContent = s.label));
  };
  go.onclick = send;
  f.querySelector("input")?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    send();
  });
  f.append(go);
  return f;
}

const note = (x: Field, was: string): [string, string] => (x.error ? ["fn err", x.error] : x.was != null ? ["fn was", `${was} ${x.was}`] : ["fn", x.doc ?? ""]);

/// A field as a `.fd` label: its name and note, then the control its type's view draws; `set` hears each committed value.
export function field(x: Field, key: string, c: Ctx, set?: (v: unknown) => void): Drawn {
  const fc = { locale: c.locale ?? {}, store: c.store, key, set };
  const v: FieldView = views[x.type] ?? text;
  const [cls, say] = note(x, word(fc, "was"));
  const l = h("label", `fd${v.row ?? ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`, h("span", "fl", h("span", "fk", x.label ?? x.name), h("span", cls, say)));
  const out = v.draw(x, fc);
  out.el.name = x.name;
  if (x.error) out.el.setAttribute("aria-invalid", "true");
  l.append(out.el);
  return { row: l, name: x.name, sent: out.sent };
}

/// The values the fields send, as an action's `values` (a toggle is a bool, an empty secret is left out).
export function values(all: Drawn[]): State {
  const v: State = {};
  for (const d of all) {
    const s = d.sent();
    if (typeof s === "string" || typeof s === "boolean" || typeof s === "number") v[d.name] = s;
  }
  return v;
}
