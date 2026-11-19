import type { Section } from "../gen/types.ts";
import { type Ctx, el, h, kids } from "./index.ts";

const GROUP: Record<string, string> = { waiting: "needs", blocked: "needs", asleep: "idle", in: "working" };
const SH: Record<string, string> = { needs: "r", working: "g" };

export function section(b: Section, c: Ctx): HTMLElement {
  const s = el("section", "sec");
  const w = (b.header ?? "").split(" ")[0];
  const k = GROUP[w] ?? w;
  if (b.header) {
    const head = el("h3", `sh ${SH[k] ?? ""}`);
    head.append(c.theme.word(k, b.header));
    s.append(head);
  }
  s.append(...kids(b.blocks, c));
  if (b.footer) s.append(h("p", "m foot", b.footer));
  return s;
}
