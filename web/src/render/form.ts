import type { Field, Form } from "../gen/types.ts";
import { type Blk, btn, type Ctx, draft, el, h, sent, type Store } from "./index.ts";

export function form(b: Form, c: Ctx): HTMLElement {
  const f = el("div", `form${b.submit ? " say" : ""}`);
  f.dataset.id = b.id ?? "";
  for (const x of b.fields) f.append(field(x, `draft:${c.screen}:${String(b.id)}:`, c.store));
  const s = b.submit;
  if (!s) return f;
  const go = btn(s.label, "", undefined, s.action);
  go.dataset.submit = "";
  const word = go.firstElementChild ?? go;
  const send = () => {
    const v = values(f);
    if (!String(v.text ?? "").trim()) return;
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

const note = (x: Field): [string, string] => (x.error ? ["fn err", x.error] : x.was != null ? ["fn was", `was ${x.was}`] : ["fn", x.doc ?? ""]);

/// A field as a `.fd` label: its name and note, then its control.
export function field(x: Field, key: string, store: Store): HTMLElement {
  const [cls, text] = note(x);
  const l = h("label", `fd${x.type === "toggle" ? " tg" : ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`, h("span", "fl", h("span", "fk", x.label ?? x.name), h("span", cls, text)));
  let i: HTMLInputElement | HTMLSelectElement;
  if (x.type === "toggle") {
    i = Object.assign(el("input"), { type: "checkbox", checked: !!x.value });
    i.setAttribute("role", "switch");
  } else if (x.type === "picker") {
    const s = el("select");
    const opts = [...new Set([x.value, ...(x.options ?? [])].filter((o) => o != null && o !== "").map(String))];
    for (const o of opts) s.append(Object.assign(el("option"), { value: o, textContent: o, selected: o === String(x.value) }));
    i = s;
  } else {
    const kb = x.keyboard ?? "default";
    const secret = x.type === "secret";
    const t = Object.assign(el("input"), {
      type: secret ? "password" : kb === "url" ? "url" : "text",
      value: secret ? "" : String(x.value ?? ""),
      placeholder: secret && x.set ? "set ✓ · type to replace" : (x.placeholder ?? (secret ? "not set" : "")),
      autocomplete: "off",
    });
    if (kb !== "default") t.inputMode = kb === "number" ? "decimal" : "url";
    t.dataset.was = t.value;
    if (!secret) draft(t, key + x.name, store);
    i = t;
  }
  i.name = x.name;
  if (x.error) i.setAttribute("aria-invalid", "true");
  l.append(i);
  return l;
}

/// The values of every field under `root`, as an action's `values` (a toggle is a bool, an empty secret is left out).
export function values(root: HTMLElement): Blk {
  const v: Blk = {};
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".fd input, .fd select").forEach((i) => {
    if (i.type === "password" && !i.value) return;
    v[i.name] = i instanceof HTMLInputElement && i.type === "checkbox" ? i.checked : i.value;
  });
  return v;
}
