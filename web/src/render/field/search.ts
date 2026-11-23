import { fill } from "../../core/field/files.ts";
import { hits, typing } from "../../core/field/match.ts";
import type { SearchField } from "../../gen/types.ts";
import { draft } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";
import { type FieldView, word } from "./_view.ts";

const rows = (t: HTMLElement) => Array.from(t.children).filter((e): e is HTMLElement => e instanceof HTMLElement && e.dataset["block"] != null);

function seek(t: HTMLElement, q: string, none: HTMLElement): [number, number] {
  t.dataset["seek"] = q;
  if (t.dataset["block"] === "table") {
    t.dispatchEvent(new Event("seek"));
    const [n, m] = (t.dataset["hits"] ?? "0/0").split("/").map(Number);
    return [n ?? 0, m ?? 0];
  }
  const all = rows(t);
  for (const r of all) r.toggleAttribute("data-miss", !hits(r.textContent, q));
  const n = all.filter((r) => !r.hasAttribute("data-miss")).length;
  if (q && !n) t.append(none);
  else none.remove();
  return [n, all.length];
}

export const search: FieldView<Omit<SearchField, "value"> & { value?: unknown }> = {
  row: " sr",
  draw(x, c) {
    const w = (k: string) => word(c, k);
    const i = Object.assign(el("input"), { type: "search", value: String(x.value ?? ""), placeholder: x.placeholder ?? "", autocomplete: "off" });
    i.dataset["was"] = i.value;
    i.name = x.name;
    if (x.error) i.setAttribute("aria-invalid", "true");
    draft(i, c.key + x.name, c.store);
    const n = el("span", "sbn");
    n.setAttribute("aria-live", "polite");
    const clear = btn(w("clear"), "sbx");
    const box = h("span", "sb", i, n, clear);
    const none = h("div", "lsm sm");
    const aim = () => {
      const root = box.isConnected ? box.getRootNode() : null;
      const t = root && x.filters != null && (root instanceof Document || root instanceof ShadowRoot) ? root.querySelector<HTMLElement>(`[data-block][data-id="${CSS.escape(x.filters)}"]`) : null;
      return t?.dataset["block"] === "list" || t?.dataset["block"] === "table" ? t : null;
    };
    const filter = () => {
      const t = aim();
      if (!t) return;
      none.replaceChildren(fill(w("nomatch"), { q: i.value }), " ", btn(w("clear")));
      none.lastElementChild?.addEventListener("click", wipe);
      const [k, m] = seek(t, i.value, none);
      n.textContent = i.value && (k ? fill(w("hits"), { n: k, m }) : w("none"));
      t.addEventListener("unseek", wipe);
    };
    const busy = (on: boolean) => {
      if (on) box.setAttribute("aria-busy", "true");
      else box.removeAttribute("aria-busy");
      n.textContent = on ? w("busy") : "";
    };
    const set = c.set;
    const send = set && !x.filters ? typing(set, busy) : undefined;
    const shown = () => (clear.hidden = !i.value);
    function wipe() {
      i.value = "";
      c.store.put(c.key + x.name, null);
      shown();
      if (x.filters) filter();
      send?.now("");
      i.focus();
    }
    i.addEventListener("input", () => (shown(), x.filters ? filter() : send?.key(i.value)));
    i.addEventListener("keydown", (e) => e.key === "Enter" && send && (e.preventDefault(), send.now(i.value)));
    clear.addEventListener("click", wipe);
    shown();
    if (x.filters) queueMicrotask(filter);
    return { el: box, sent: () => i.value };
  },
};
