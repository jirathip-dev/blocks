import type { Message } from "../../gen/types.ts";
import { h } from "../dom.ts";

export function message(b: Message): HTMLElement {
  return h("div", "message", b.name);
}
