import { type Blk, blks, btn, type Ctx, draft, el, h, isBlk, isList, obj, sent, type Store } from "./index.ts";

export function form(b: Blk, c: Ctx): HTMLElement {
  const f = el("div", `form${b.submit ? " say" : ""}`);
  f.dataset.id = String(b.id ?? "");
  for (const x of blks(b.fields)) f.append(field(x, `draft:${c.screen}:${String(b.id)}:`, c.store));
  const s = b.submit;
  if (!isBlk(s)) return f;
  const go = btn(s.label);
  const word = go.firstElementChild ?? go;
  const send = () => {
    const v = values(f);
    if (!String(v.text ?? "").trim()) return;
    word.textContent = "sending…";
    c.act({ action: s.action, block: b.id, values: { ...obj(s.values), ...v } }, go)
      .then((ok) => ok && sent(f, c.store))
      .finally(() => (word.textContent = String(s.label ?? "")));
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

function field(x: Blk, key: string, store: Store): HTMLElement {
  const l = h("label", "fd", h("span", "fk", String(x.label ?? x.name ?? "")));
  if (x.type === "toggle") {
    const i = el("input");
    Object.assign(i, { type: "checkbox", name: x.name, checked: !!x.value });
    l.append(i);
  } else if (x.type === "picker") {
    const s = el("select");
    s.name = String(x.name);
    const opts = [...new Set([x.value, ...(isList(x.options) ? x.options : [])].filter((o) => o != null && o !== ""))];
    for (const o of opts) s.append(Object.assign(el("option"), { value: o, textContent: o, selected: o === x.value }));
    l.append(s);
  } else {
    const i = el("input");
    Object.assign(i, { type: x.type === "secret" ? "password" : "text", name: x.name, value: x.value ?? "", placeholder: x.placeholder ?? "", autocomplete: "off" });
    i.dataset.was = i.value;
    if (x.type !== "secret") draft(i, key + String(x.name), store);
    l.append(i);
  }
  return l;
}

/// The values of every field under `root`, as an action's `values` (a toggle is a bool).
export function values(root: HTMLElement): Blk {
  const v: Blk = {};
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".fd input, .fd select").forEach((i) => {
    v[i.name] = i instanceof HTMLInputElement && i.type === "checkbox" ? i.checked : i.value;
  });
  return v;
}
