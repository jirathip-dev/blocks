import type { Action, Answer, Block, Op } from "../gen/types.ts";
import { apply } from "../core/apply.ts";
import type { Source } from "./source.ts";

/// The app's own code, as a source needs it.
export type Local = {
  screen(path: string): Block | Promise<Block>;
  act(a: Action, path: string): Answer | Promise<Answer>;
  close?(path: string): void;
};

type Held = { on: (screen: Block, ops?: Op[]) => void; screen?: Block };

/// A Source over the app's own code; `push` hands it ops no action asked for.
export function local(app: Local): Source & { push(path: string, ops: Op[]): void } {
  const held = new Map<string, Held>();
  const take = async (path: string, h: Held) => {
    delete h.screen;
    const s = await app.screen(path);
    if (held.get(path) !== h) return;
    h.screen = s;
    h.on(s);
  };
  const push = (path: string, ops: Op[]) => {
    const h = held.get(path);
    if (!h?.screen || !ops.length) return;
    const next = apply(h.screen, ops);
    if (!next) return void take(path, h);
    h.screen = next;
    h.on(next, ops);
  };
  return {
    open(path, on) {
      const h = { on };
      held.set(path, h);
      void take(path, h);
    },
    close(path) {
      held.delete(path);
      app.close?.(path);
    },
    async act(path, a) {
      const { ops, ...rest } = await app.act(a, path);
      if (ops) push(path, ops);
      return rest;
    },
    push,
  };
}
