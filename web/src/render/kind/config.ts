import type { Form } from "../../gen/types.ts";
import { field, values } from "./form.ts";
import { type Ctx, sent } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";

const focused = new Set<string>();

export function config(b: Form, c: Ctx): HTMLElement {
  const f = el("div", "form cfg");
  f.dataset.id = b.id ?? "";
  const key = `draft:${c.screen}:${String(b.id)}:`;
  for (const x of b.fields) {
    const row = field(x, key, c.store);
    f.append(row);
    const i = row.querySelector<HTMLInputElement | HTMLSelectElement>("input, select");
    const n = row.querySelector<HTMLElement>("span.fn");
    if (!i || !n) continue;
    if (x.open && !focused.has(key + x.name)) {
      focused.add(key + x.name);
      queueMicrotask(() => i.focus());
    }
    const a = b.action;
    if (!a) continue;
    const [was, said] = [n.className, n.textContent];
    const say = (cls: string, text: string) => Object.assign(n, { className: cls, textContent: text });
    i.onchange = () => {
      const v = values(row);
      if (!Object.keys(v).length) return;
      say("fn", "saving…");
      void c.act({ action: a, block: b.id, values: v }).then((ok) => (ok ? (say(was, said), sent(row, c.store)) : say("fn err", "not saved")));
    };
  }
  const s = b.submit;
  if (!s) return f;
  const go = btn(s.label, "", undefined, s.action);
  if (s.off) go.setAttribute("disabled", "");
  go.onclick = () => void c.act({ action: s.action, block: b.id, values: { ...s.values, ...values(f) } }, go).then((ok) => ok && sent(f, c.store));
  f.append(h("div", "bar", go));
  return f;
}
