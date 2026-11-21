import { useContext, useLayoutEffect, useRef } from "react";
import type { Modal } from "../../../src/core/index.ts";
import { variant } from "../../../src/core/kind/modal.ts";
import { framed } from "../../../src/modal.ts";
import { Cx } from "../act.ts";
import { kids } from "../block.ts";
import { btn, type V } from "../draw.ts";
import { h } from "../h.ts";

export function modal({ b, hooks }: V<Modal>) {
  const cx = useContext(Cx);
  const d = useRef<HTMLDialogElement>(null);
  const act = useRef(cx.act);
  act.current = cx.act;
  useLayoutEffect(() => {
    const e = d.current;
    return e ? framed(e, b, { done: (a) => act.current(a) }) : undefined;
  }, [b]);
  const v = variant(b);
  const mid = `${b.id ?? "modal"}-m`;
  const own = v === "tool" ? { role: "dialog" } : { role: v === "alert" ? "alertdialog" : "dialog", "aria-modal": "true", "aria-describedby": v === "alert" && b.message ? mid : undefined };
  const ok = b.ok ?? b.done?.label ?? (v === "alert" ? "ok" : null);
  const head =
    v === "alert"
      ? h("header", "mdh", null, h("span", "mdt", null, b.title))
      : h(
          "header",
          "mdh",
          null,
          h("span", "mdg", { "aria-hidden": "true" }, "⋮⋮"),
          h("span", "mdt", { tabIndex: 0, "aria-roledescription": "movable heading" }, b.title),
          v === "tool" ? btn("–", "mdn", undefined, undefined, { "aria-label": "minimise" }) : null,
          btn("×", "mdx", undefined, undefined, { "aria-label": "close" }),
        );
  const foot =
    b.cancel != null || ok != null
      ? h("footer", "mdf", null, b.cancel != null ? btn(b.cancel, "mdc", undefined, undefined, {}) : null, ok != null ? btn(ok, `mdo${b.destructive ? " bad" : ""}`, undefined, b.done?.action, {}) : null)
      : null;
  return h(
    "dialog",
    `md ${v === "dialog" ? "dlg" : v}`,
    { ...hooks, ...own, ref: d },
    v !== "alert" ? h("div", "mdk", { role: "button", tabIndex: 0, "aria-label": "close" }) : null,
    head,
    h("div", "mdb", null, b.message ? h("p", "mdm", { id: mid }, b.message) : null, ...kids(b.blocks)),
    foot,
    v === "tool" ? h("span", "mdz", { role: "slider", tabIndex: 0, "aria-label": "resize", "aria-valuemin": "280", "aria-valuenow": "360", "aria-valuetext": "360 by 440" }) : null,
    v === "tool" ? h("span", "mde", { "aria-hidden": "true" }) : null,
  );
}
