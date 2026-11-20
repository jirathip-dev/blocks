import type { Form } from "../gen/types.ts";
import { type Drawn, field, values } from "./form.ts";
import { btn, type Ctx, el, h, sent } from "./index.ts";

const focused = new Set<string>();

export function config(b: Form, c: Ctx): HTMLElement {
  const f = el("div", "form cfg");
  f.dataset.id = b.id ?? "";
  const key = `draft:${c.screen}:${String(b.id)}:`;
  const live = (d: Drawn) => {
    const [a, n] = [b.action, d.row.querySelector<HTMLElement>("span.fn")];
    const v = values([d]);
    if (!a || !n || !Object.keys(v).length) return;
    const [was, said] = [n.className, n.textContent];
    const say = (cls: string, text: string) => Object.assign(n, { className: cls, textContent: text });
    say("fn", "saving…");
    void c.act({ action: a, block: b.id, values: v }).then((ok) => (ok ? (say(was, said), sent(d.row, c.store)) : say("fn err", "not saved")));
  };
  const all = b.fields.map((x) => {
    const d: Drawn = field(x, key, c, b.action ? () => live(d) : undefined);
    const i = d.row.querySelector<HTMLElement>("input, select");
    if (i && x.open && !focused.has(key + x.name)) {
      focused.add(key + x.name);
      queueMicrotask(() => i.focus());
    }
    return d;
  });
  f.append(...all.map((d) => d.row));
  const s = b.submit;
  if (!s) return f;
  const go = btn(s.label, "", undefined, s.action);
  if (s.off) go.setAttribute("disabled", "");
  go.onclick = () => void c.act({ action: s.action, block: b.id, values: { ...s.values, ...values(all) } }, go).then((ok) => ok && sent(f, c.store));
  f.append(h("div", "bar", go));
  return f;
}
