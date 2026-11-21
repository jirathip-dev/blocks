import { useContext } from "react";
import { type Attachment, ext, initial, linkable, type Message, roleWord } from "../../../src/core/index.ts";
import { Cx } from "../act.ts";
import { kids } from "../block.ts";
import { out, sends, urlOf, type V } from "../draw.ts";
import { h } from "../h.ts";

const image = (f: Attachment) => f.src != null && linkable(f.src);

export function message({ b, hooks }: V<Message>) {
  const cx = useContext(Cx);
  const file = (f: Attachment, n: number) => {
    const url = urlOf(f.tap);
    const [x, rest] = ext(f.name);
    const shown = image(f) ? [h("img", "", { key: "i", src: f.src, alt: f.name, loading: "lazy" })] : [h("span", "mfx", { key: "x" }, x), h("span", "mfn", { key: "n" }, rest)];
    const attrs = { key: n, title: f.name, "aria-label": f.name };
    const cls = image(f) ? "" : "mff";
    if (url) return h("a", cls, { ...attrs, ...out(url) }, ...shown);
    return h("button", cls, { ...attrs, type: "button", "data-action": sends(f.tap), onClick: () => cx.tap(f.tap) }, ...shown);
  };
  const face =
    b.role === "system" ? null : b.avatar != null && linkable(b.avatar) ? h("img", "mav b-message__avatar", { src: b.avatar, alt: "", "aria-hidden": "true" }) : h("span", "mav ini", { "aria-hidden": "true" }, initial(b.name));
  const files = b.files ?? [];
  const images = files.filter(image);
  const box = files.length ? h("div", "mf b-message__files", null, images.length ? h("div", "mfi", null, ...images.map(file)) : null, ...files.filter((f) => !image(f)).map(file)) : null;
  const head = h("div", "mh", null, h("span", "mn b-message__name", null, b.name), h("span", "mr", null, roleWord(b.role)), b.time ? h("time", "mt", null, b.time) : null);
  return h("article", "msg", hooks, face, head, h("div", "mb", null, ...kids(b.blocks), box));
}
