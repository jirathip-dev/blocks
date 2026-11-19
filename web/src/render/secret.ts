import type { Secret } from "../gen/types.ts";
import { btn, type Ctx, el, h } from "./index.ts";

export function secret(b: Secret, c: Ctx): HTMLElement {
  const i = el("input");
  Object.assign(i, { type: "password", name: b.name, placeholder: b.set ? "paste to replace" : (b.placeholder ?? ""), autocomplete: "new-password", spellcheck: false });
  const k = h("span", "fk", b.label ?? b.name);
  if (b.set) k.append(h("span", "set", "set ✓"));
  const go = btn("send");
  const word = go.firstElementChild ?? go;
  const send = () => {
    if (!i.value) return i.focus();
    word.textContent = "sending…";
    c.act({ action: b.action, block: b.id, values: { ...b.values, [b.name]: i.value } }, go)
      .then((ok) => ok && (i.value = ""))
      .finally(() => (word.textContent = "send"));
  };
  go.onclick = send;
  i.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    send();
  });
  return h("div", "secret", h("label", "fd", k, i), h("div", "ra", h("p", "m sn", "sent to the app only, never to the agent"), go));
}
