import { ext, initial, roleWord } from "../../core/kind/message.ts";
import type { Attachment, Message } from "../../gen/types.ts";
import { acts, linkable, sends, urlOf } from "../act.ts";
import { kids } from "../block.ts";
import type { Ctx } from "../ctx.ts";
import { el, h, href } from "../dom.ts";

function avatar(b: Message): HTMLElement | null {
  if (b.role === "system") return null;
  const a = b.avatar != null && linkable(b.avatar) ? Object.assign(el("img", "mav b-message__avatar"), { src: b.avatar, alt: "" }) : h("span", "mav ini", initial(b.name));
  a.setAttribute("aria-hidden", "true");
  return a;
}

function file(f: Attachment, c: Ctx): HTMLElement {
  const url = urlOf(f.tap);
  const [x, rest] = ext(f.name);
  const shown = f.src != null && linkable(f.src) ? [Object.assign(el("img"), { src: f.src, alt: f.name, loading: "lazy" })] : [h("span", "mfx", x), h("span", "mfn", rest)];
  const e = url ? href(el("a", f.src ? "" : "mff"), url) : Object.assign(el("button", f.src ? "" : "mff"), { type: "button" });
  if (!url) acts(e, sends(f.tap)).onclick = () => c.tap(f.tap);
  e.title = f.name;
  e.setAttribute("aria-label", f.name);
  e.append(...shown);
  return e;
}

export function message(b: Message, c: Ctx): HTMLElement {
  const m = el("article", "msg");
  const face = avatar(b);
  if (face) m.append(face);
  m.append(h("div", "mh", h("span", "mn b-message__name", b.name), h("span", "mr", roleWord(b.role)), ...(b.time ? [h("time", "mt", b.time)] : [])));
  const body = h("div", "mb", ...kids(b.blocks, c));
  const files = b.files ?? [];
  if (files.length) {
    const images = files.filter((f) => f.src != null && linkable(f.src));
    const box = h("div", "mf b-message__files");
    if (images.length) box.append(h("div", "mfi", ...images.map((f) => file(f, c))));
    box.append(...files.filter((f) => !images.includes(f)).map((f) => file(f, c)));
    body.append(box);
  }
  m.append(body);
  return m;
}
