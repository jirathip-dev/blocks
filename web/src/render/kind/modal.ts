import { variant } from "../../core/kind/modal.ts";
import type { Modal } from "../../gen/types.ts";
import { type Done, framed, type Kept } from "../../modal.ts";
import { kids } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { btn, el, h } from "../dom.ts";

const at = <E extends HTMLElement>(e: E, attrs: Record<string, string>) => {
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

/// A modal's frame around `inner`, live once it is on the page: what the kind draws and what the shell's own sheets wear; `lead` goes before the title.
export function box(b: Modal, inner: HTMLElement[], o: { done: Done; store?: Kept | undefined; lead?: HTMLElement | undefined }): HTMLDialogElement {
  const v = variant(b);
  const d = el("dialog", `md ${v === "dialog" ? "dlg" : v}`);
  const mid = `${b.id ?? "modal"}-m`;
  at(d, v === "tool" ? { role: "dialog" } : { role: v === "alert" ? "alertdialog" : "dialog", "aria-modal": "true", ...(v === "alert" && b.message ? { "aria-describedby": mid } : {}) });
  d.setAttribute("aria-label", b.title);
  const head = h("header", "mdh");
  const title = h("span", "mdt", b.title);
  if (v !== "alert") {
    d.append(at(el("div", "mdk"), { role: "button", tabindex: "0", "aria-label": "close" }));
    head.append(at(h("span", "mdg", "⋮⋮"), { "aria-hidden": "true" }), ...(o.lead ? [o.lead] : []), at(title, { tabindex: "0", "aria-roledescription": "movable heading" }));
    if (v === "tool") head.append(at(btn("–", "mdn"), { "aria-label": "minimise" }));
    head.append(at(btn("×", "mdx"), { "aria-label": "close" }));
  } else head.append(title);
  d.append(head, h("div", "mdb", ...(b.message ? [at(h("p", "mdm", b.message), { id: mid })] : []), ...inner));
  const ok = b.ok ?? b.done?.label ?? (v === "alert" ? "ok" : null);
  if (b.cancel != null || ok != null) {
    const foot = h("footer", "mdf");
    if (b.cancel != null) foot.append(btn(b.cancel, "mdc"));
    if (ok != null) foot.append(btn(ok, `mdo${b.destructive ? " bad" : ""}`, undefined, b.done?.action));
    d.append(foot);
  }
  if (v === "tool") d.append(at(el("span", "mdz"), { role: "slider", tabindex: "0", "aria-label": "resize", "aria-valuemin": "280", "aria-valuenow": "360", "aria-valuetext": "360 by 440" }), at(el("span", "mde"), { "aria-hidden": "true" }));
  queueMicrotask(() => d.isConnected && framed(d, b, o));
  return d;
}

export function modal(b: Modal, c: Ctx): HTMLElement {
  return box(b, kids(b.blocks, c), { done: (a) => c.act(a), store: c.store });
}
