import { fill } from "../../core/field/files.ts";
import { lit, view } from "../../core/eval.ts";
import { views } from "../../gen/fields.ts";
import type { Field, Form } from "../../gen/types.ts";
import { type FieldView, word } from "../field/_view.ts";
import { text } from "../field/text.ts";
import { type Ctx, sent } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";

/// A drawn field: its `.fd` row, its name, the value it sends and the files it waits on.
export type Drawn = { row: HTMLElement; name: string; sent(): unknown; busy?(): { up: number; failed: number } };

export function form(b: Form, c: Ctx): HTMLElement {
  const f = el("div", `form${b.submit ? " say" : ""}`);
  f.dataset.id = b.id ?? "";
  const all = b.fields.map((x) => field(x, `draft:${c.screen}:${String(b.id)}:`, c, undefined, b.id ?? undefined));
  f.append(...all.map((d) => d.row));
  const s = b.submit;
  if (!s) return f;
  const go = btn(s.label, "", undefined, s.action);
  go.dataset.submit = "";
  const face = go.firstElementChild ?? go;
  const fc0 = { locale: c.locale ?? {}, store: c.store, key: "", screen: c.screen };
  const wait = el("span", "say-busy");
  const hold = () => {
    const up = all.reduce((n, d) => n + (d.busy?.().up ?? 0), 0), bad = all.some((d) => (d.busy?.().failed ?? 0) > 0);
    f.toggleAttribute("data-busy", up > 0 || bad);
    if (go instanceof HTMLButtonElement) go.disabled = up > 0 || bad;
    wait.className = `say-busy${bad ? " bad" : ""}`;
    wait.textContent = bad ? word(fc0, "stuck") : up ? fill(word(fc0, up > 1 ? "waitN" : "wait1"), { n: up }) : "";
  };
  const send = () => {
    const v = values(all);
    if (f.hasAttribute("data-busy")) return;
    const state = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, lit(null, x)]));
    if (Object.values(v).every((x) => !String(x || "").trim()) || Object.keys(view(b, state).says).length) return;
    face.textContent = "sending…";
    c.act({ action: s.action, block: b.id, values: { ...s.values, ...v } }, go)
      .then((ok) => ok && sent(f, c.store))
      .finally(() => (face.textContent = s.label));
  };
  go.onclick = send;
  if (all.some((d) => d.busy)) f.addEventListener("field", hold);
  f.querySelector("input")?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    send();
  });
  f.append(...(all.some((d) => d.busy) ? [wait] : []), go);
  return f;
}

const note = (x: Field, was: string): [string, string] => (x.error ? ["fn err", x.error] : x.was != null ? ["fn was", `${was} ${x.was}`] : ["fn", x.doc ?? ""]);

/// A field as a `.fd` label: its name and note, then the control its type's view draws; `set` hears each committed value.
export function field(x: Field, key: string, c: Ctx, set?: (v: unknown) => void, block?: string): Drawn {
  const fc = { locale: c.locale ?? {}, store: c.store, key, set, screen: c.screen, block, file: c.file };
  const v: FieldView = views[x.type] ?? text;
  const [cls, say] = note(v.group ? { ...x, error: null } : x, word(fc, "was"));
  const l = h(v.group ? "div" : "label", `fd${v.row ?? ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`, h("span", "fl", h("span", "fk", x.label ?? x.name), h("span", cls, say)));
  const out = v.draw(x, fc);
  if (out.el instanceof HTMLInputElement || out.el instanceof HTMLSelectElement) out.el.name = x.name;
  if (x.error) out.el.setAttribute("aria-invalid", "true");
  l.append(out.el);
  return { row: l, name: x.name, sent: out.sent, busy: out.busy };
}

/// The values the fields send, as an action's `values` (a toggle is a bool, an upload its ids, an empty secret is left out).
export function values(all: Drawn[]): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const d of all) {
    const s = d.sent();
    if (typeof s === "string" || typeof s === "boolean" || typeof s === "number" || Array.isArray(s)) v[d.name] = s;
  }
  return v;
}
