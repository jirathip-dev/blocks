import { ev, find, list, own, read, rec, sound, start, type State, view } from "./core/eval.ts";

/// Keeps the blocks under `root` in step with local state: typing, a toggle, a pick or a tap's `set` changes it, nothing is sent.
export function behave(root: HTMLElement, model: () => unknown): () => void {
  const edits: State = {};
  const touched = new Set<string>();
  const state = () => {
    const s = start(model());
    for (const [k, v] of Object.entries(edits)) if (own(s, k)) s[k] = v;
    return s;
  };
  const sync = () => {
    const v = view(model(), state());
    root.querySelectorAll<HTMLElement>("[data-block][data-id]").forEach((e) => {
      const id = e.dataset.id ?? "";
      e.hidden = v.hidden.has(id);
      const go = e.dataset.block === "form" ? e.querySelector("[data-submit]") : e;
      if (go instanceof HTMLButtonElement) go.disabled = v.disabled.has(id);
    });
    root.querySelectorAll<HTMLButtonElement>("button[data-act]").forEach((b) => (b.disabled = v.acts.has(b.dataset.act ?? "")));
    root.querySelectorAll<HTMLElement>("td[data-act]").forEach((t) => t.toggleAttribute("aria-disabled", v.acts.has(t.dataset.act ?? "")));
    root.querySelectorAll<HTMLElement>("[data-get]").forEach((e) => (e.textContent = v.values[e.dataset.get ?? ""] ?? ""));
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".fd input[name], .fd select[name]").forEach((i) => {
      const l = i.closest<HTMLElement>(".fd");
      if (!l) return;
      l.hidden = v.hidden.has(i.name);
      i.disabled = v.disabled.has(i.name);
      const say = touched.has(i.name) ? (v.says[i.name] ?? "") : "";
      const m = l.querySelector(".fe") ?? (say ? l.appendChild(Object.assign(document.createElement("span"), { className: "fe" })) : null);
      if (m) m.textContent = say;
    });
  };
  root.addEventListener("input", (e) => {
    const i = e.target;
    if (!(i instanceof HTMLInputElement || i instanceof HTMLSelectElement) || !i.name) return;
    edits[i.name] = i instanceof HTMLInputElement && i.type === "checkbox" ? i.checked : i.value;
    touched.add(i.name);
    sync();
  });
  root.addEventListener("click", (e) => {
    const id = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-block]")?.dataset.id : undefined;
    const m = model();
    const tap = id && rec(m) ? find(m, id)?.tap : undefined;
    const sets = rec(tap) ? list(tap.set) : [];
    for (const x of sets) {
      const to = read(x.to);
      if (typeof x.key === "string" && to !== undefined && sound(to)) edits[x.key] = ev(to, state());
    }
    if (sets.length) sync();
  });
  return sync;
}
