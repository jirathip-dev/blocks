import type { Block, Bye, Frame, Have, Hello, KeyState, Op, Synced } from "./gen/types.ts";
import { schemaVersion } from "./gen/types.ts";
import { apply } from "./patch.ts";

export type Took = "patched" | "replaced" | "old" | "gap";
export type Outdated = "app" | "server";
export type State = "off" | "connecting" | "syncing" | "live" | "waiting" | "parked";
type Held = { rev?: number; screen?: Block };

function take(h: Held, rev: number, screen: Block): Took {
  h.rev = rev;
  h.screen = screen;
  return "replaced";
}

function patch(h: Held, rev: number, ops: Op[]): Took {
  const next = h.screen && apply(h.screen, ops);
  if (!next) {
    delete h.rev;
    return "gap";
  }
  take(h, rev, next);
  return "patched";
}

/// A client's half, as the crate's `Mirror`: the epoch, and per key opened the rev held and the screen.
export class Mirror {
  readonly v: number;
  private epoch: string | undefined;
  private outdated: Outdated | undefined;
  private keys = new Map<string, Held>();

  constructor(v: number = schemaVersion) {
    this.v = v;
  }

  hello(h: Hello): Outdated | undefined {
    this.outdated = h.v > this.v ? "app" : h.v + 1 < this.v ? "server" : undefined;
    if (this.epoch !== h.epoch) for (const k of this.keys.values()) delete k.rev;
    this.epoch = h.epoch;
    return this.outdated;
  }

  open(k: string): void {
    if (!this.keys.has(k)) this.keys.set(k, {});
  }

  close(k: string): void {
    this.keys.delete(k);
  }

  have(): Have[] {
    if (this.outdated) return [];
    return [...this.keys].map(([k, h]) => (h.rev === undefined ? { k } : { k, rev: h.rev }));
  }

  screen(k: string): Block | undefined {
    return this.keys.get(k)?.screen;
  }

  frame(f: Frame): Took {
    const h = this.outdated ? undefined : this.keys.get(f.k);
    if (!h || (h.rev !== undefined && f.rev <= h.rev)) return "old";
    if (f.screen) return take(h, f.rev, f.screen);
    if (f.from == null || h.rev === undefined) return "old";
    return f.from === h.rev ? patch(h, f.rev, f.ops ?? []) : "gap";
  }

  synced(sent: Have[], s: Synced): Took[] {
    return s.keys.map((st) => this.state(sent, st));
  }

  private state(sent: Have[], st: KeyState): Took {
    const h = this.outdated ? undefined : this.keys.get(st.k);
    if (!h) return "old";
    if (st.gone != null) {
      this.keys.delete(st.k);
      return "old";
    }
    const asked = sent.find((x) => x.k === st.k)?.rev;
    if (st.rev == null) return "old";
    if (st.screen) return h.rev !== undefined && st.rev < h.rev ? "old" : take(h, st.rev, st.screen);
    if (st.ops && asked != null && h.rev === asked) return patch(h, st.rev, st.ops);
    return "old";
  }
}

type On = (screen: Block, ops?: Op[]) => void;

/// The device's one stream: `hello`, then one sync per change of the keys opened; `on` gets a key's screen and an animation frame's ops.
export function stream(o: { url: string; state?: (s: State) => void }) {
  const m = new Mirror();
  const on = new Map<string, On>();
  let sid: string | undefined;
  let es: EventSource | undefined;
  let due: Frame[] = [];
  const say = (s: State) => o.state?.(s);
  const tell = (k: string, took: Took, ops?: Op[] | null) => {
    const s = m.screen(k);
    if (s && took !== "old" && took !== "gap") on.get(k)?.(s, took === "patched" ? (ops ?? []) : undefined);
  };
  const sync = async (open: Have[], close: string[] = []): Promise<void> => {
    if (!sid || (!open.length && !close.length)) return;
    say("syncing");
    const body = JSON.stringify({ open, close });
    const r = await fetch(`${o.url}/${sid}`, { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => undefined);
    if (r?.status === 404) return connect();
    if (!r?.ok) return say("waiting");
    const s: Synced = await r.json();
    const took = m.synced(open, s);
    s.keys.forEach((st, i) => tell(st.k, took[i] ?? "old", st.ops));
    const again = new Set(s.keys.filter((_, i) => took[i] === "gap").map((st) => st.k));
    if (again.size) return sync(m.have().filter((h) => again.has(h.k)));
    say("live");
  };
  const drain = (): void => {
    const told = new Map<string, Op[] | undefined>();
    const gaps = new Set<string>();
    for (const f of due.splice(0)) {
      const took = m.frame(f);
      const had = told.has(f.k) ? told.get(f.k) : [];
      if (took === "gap") gaps.add(f.k);
      else if (took === "replaced") told.set(f.k, undefined);
      else if (took === "patched") told.set(f.k, had && [...had, ...(f.ops ?? [])]);
    }
    told.forEach((ops, k) => tell(k, ops ? "patched" : "replaced", ops));
    if (gaps.size) void sync(m.have().filter((h) => gaps.has(h.k)));
  };
  const connect = (): void => {
    es?.close();
    say("connecting");
    const src = new EventSource(`${o.url}${o.url.includes("?") ? "&" : "?"}v=${schemaVersion}`);
    es = src;
    src.addEventListener("hello", (e) => {
      const h: Hello = JSON.parse(e.data);
      sid = h.sid;
      if (m.hello(h)) {
        src.close();
        return say("parked");
      }
      void sync(m.have());
    });
    src.addEventListener("message", (e) => {
      if (due.push(JSON.parse(e.data)) === 1) requestAnimationFrame(drain);
    });
    src.addEventListener("bye", (e) => {
      const b: Bye = JSON.parse(e.data);
      src.close();
      if (b.why === "handover") connect();
      else say("parked");
    });
    src.onerror = () => say("waiting");
  };
  return {
    open(k: string, f: On): void {
      on.set(k, f);
      m.open(k);
      if (!es) connect();
      else void sync(m.have().filter((h) => h.k === k));
    },
    close(k: string): void {
      on.delete(k);
      m.close(k);
      if (on.size) return void sync([], [k]);
      es?.close();
      es = undefined;
      sid = undefined;
      say("off");
    },
  };
}
