import type { Action, Answer, Block, Op, Toast } from "../gen/types.ts";
import { type State, stream } from "../stream.ts";

/// Where a layout source's screens come from and where its actions go: a server, or the app's own code.
export type Source = {
  open(path: string, on: (screen: Block, ops?: Op[]) => void): void;
  close(path: string): void;
  act(path: string, a: Action): Promise<Answer>;
};

/// A failed action that brings its own toast; any other rejection shows its message.
export class Refused extends Error {
  readonly toast: Toast;
  constructor(toast: Toast) {
    super(toast.title);
    this.toast = toast;
  }
}

/// A server as a Source: its one device stream and its `/action` POST.
export function served(url: (path: string) => string, state: (s: State) => void): Source {
  const st = stream({ url: url("/stream"), state });
  return {
    open: st.open,
    close: st.close,
    async act(_, a) {
      const r = await fetch(url("/action"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) });
      const j: Answer = await r.json().catch(() => ({}));
      if (!r.ok) throw new Refused({ title: `action failed: ${r.status}`, ...j.toast, tone: "bad" });
      return j;
    },
  };
}
