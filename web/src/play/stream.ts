import type { Block, Op } from "../gen/types.ts";
import type { Ctx } from "../render/ctx.ts";
import { apply, grow, patcher, plain, plotSync, render } from "../shell.ts";

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isBlock = (v: unknown): v is Block => isRec(v) && typeof v["type"] === "string";
const isOps = (v: unknown): v is Op[] => Array.isArray(v) && v.every((o) => isRec(o) && typeof o["op"] === "string");

class Stream extends HTMLElement {
  connectedCallback() {
    if (this.dataset["on"]) return;
    const props: unknown = JSON.parse(this.dataset["props"] ?? "{}");
    const start: unknown = isRec(props) && props["screen"];
    const frames = isRec(props) && Array.isArray(props["frames"]) ? props["frames"].filter(isOps) : [];
    if (!isBlock(start) || !frames.length) return;
    this.dataset["on"] = "1";
    delete this.dataset["fallback"];
    const ctx: Ctx = { screen: "stream", act: async () => false, tap: () => {}, open: new Set(), theme: plain, store: { get: () => null, put: () => {} } };
    const draw = (b: Block) => render(b, ctx);
    const root = document.createElement("div");
    let [model, at] = [start, 0];
    const p = patcher({ root, model: () => model, draw, grow, sync: { plot: plotSync } });
    root.replaceChildren(...[draw(model)].filter((e) => e !== null));
    this.replaceChildren(root);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = () => {
      const ops = frames[at];
      const next = ops && apply(model, ops);
      if (ops && next) [model, at] = [next, at + 1];
      else [model, at] = [start, 0];
      p.queue(ops && next ? ops : [{ op: "screen", screen: start }]);
      if (this.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

if (!customElements.get("x-stream")) customElements.define("x-stream", Stream);
