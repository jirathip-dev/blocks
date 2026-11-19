import type { Editor } from "../gen/types.ts";
import { type Ctx, el, h } from "./index.ts";

type Open = { ta: HTMLTextAreaElement; b: Editor; c: Ctx };
const open = new Map<string, Open>();

export function editor(b: Editor, c: Ctx): HTMLElement {
  const key = `${c.screen}:${String(b.id)}`;
  const first = b.first ?? 1;
  const lines = b.text.split("\n");
  const errs = new Map<number, string>();
  for (const e of b.errors ?? []) if (!errs.has(e.line)) errs.set(e.line, e.message);
  const notes = (cls: string, keep: (n: number) => boolean) =>
    [...errs].filter(([n]) => keep(n)).sort((x, y) => x[0] - y[0]).map(([n, m]) => h("p", cls, `line ${n} · ${m}`));
  const root = el("div", "ed");
  const editing = (o: Open) => {
    for (const a of ["role", "tabindex", "aria-label"]) root.removeAttribute(a);
    root.classList.add("on");
    root.replaceChildren(o.ta, ...notes("ede", () => true));
  };
  const was = open.get(key);
  if (was) {
    const focused = document.activeElement === was.ta;
    Object.assign(was, { b, c });
    editing(was);
    if (focused) setTimeout(() => was.ta.focus());
    return root;
  }
  lines.forEach((t, i) => {
    const n = first + i;
    const m = errs.get(n);
    root.append(h("div", m == null ? "edl" : "edl err", h("i", "", String(n)), h("span", "", t || " ")));
    if (m != null) root.append(h("p", "ede", m));
  });
  root.append(...notes("ede far", (n) => n < first || n >= first + lines.length));
  root.tabIndex = 0;
  root.setAttribute("role", "button");
  root.setAttribute("aria-label", `edit ${b.name}`);
  const start = () => {
    if (open.has(key)) return;
    const ta = el("textarea");
    Object.assign(ta, { name: b.name, value: b.text, spellcheck: false });
    ta.setAttribute("aria-label", b.name);
    const o: Open = { ta, b, c };
    let t: ReturnType<typeof setTimeout> | undefined;
    ta.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (ta.value !== o.b.text) o.c.act({ action: o.b.action, block: o.b.id, values: { [o.b.name]: ta.value } });
      }, 400);
    };
    open.set(key, o);
    editing(o);
    ta.focus();
  };
  root.onclick = start;
  root.onkeydown = (e) => {
    if (open.has(key) || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    start();
  };
  return root;
}
