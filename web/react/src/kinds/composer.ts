import { createElement, type KeyboardEvent, type MouseEvent, type ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Composer, type FileRow, type Queued, send as upload } from "../../../src/core/index.ts";
import { type Ctx, Cx } from "../act.ts";
import { btn, figure, type V } from "../draw.ts";
import { h } from "../h.ts";

type Blk = Record<string, unknown>;
type Post = (action: string, values: Blk) => Promise<boolean>;
const SAID: Record<string, string> = { sending: "sending…", sent: "✓ sent", failed: "not sent" };

function Pill({ b, post }: { b: Composer; post: Post }) {
  const [, tick] = useState(0);
  const [stopping, setStopping] = useState(false);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const stop = b.acts?.["stop"] ?? "";
  const halt = async (e: MouseEvent) => {
    e.stopPropagation();
    if (await post(stop, {})) setStopping(true);
  };
  if (!navigator.onLine) return h("div", "pill", { onClick: () => tick((n) => n + 1) }, h("span", "r", null, "offline · tap to retry"));
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(String(b.working?.since))) / 1000));
  const said = stopping ? "stopping…" : `working ${s >= 60 ? `${Math.floor(s / 60)}m ` : ""}${s % 60}s`;
  return h("div", "pill", null, figure({ state: "working" }, ""), h("span", "pt", null, said), stop && !stopping ? btn("stop", "bad", undefined, stop, { onClick: halt }) : null);
}

function queued({ q, text }: Queued, steer: string, unqueue: string, post: Post, edit: () => void): ReactNode {
  const now = btn("send now", "primary", undefined, steer, { onClick: () => void post(steer, { q }) });
  const rm = btn("remove", "bad", undefined, unqueue, { onClick: () => void post(unqueue, { q }) });
  return h("div", "qd", { key: `q${q}`, "data-q": String(q) }, h("span", "qt", null, text), now, btn("edit", "", undefined, undefined, { onClick: edit }), rm);
}

function attached(files: FileRow[], drop: (r: FileRow) => void): ReactNode {
  const tile = (a: FileRow, i: number) =>
    h("span", `tb ${a.state}`, { key: i }, a.src ? h("img", "", { alt: a.name, src: a.src }) : h("span", "", null, a.name), btn("×", "", undefined, undefined, { "aria-label": `remove ${a.name}`, onClick: () => drop(a) }));
  return h("div", "th", null, ...files.map(tile));
}

function chips(b: Composer, picks: Blk, pick: (n: string, v: string) => void): ReactNode {
  const all = (b.chips ?? []).map(({ name: n, ...ch }) => {
    const cur = String(picks[n] ?? ch.cur ?? "");
    const opts = [...(cur ? [] : [h("option", "", { key: "", value: "" }, n)]), ...ch.all.map((o) => h("option", "", { key: o, value: o }, o))];
    return h("select", "", { key: n, "aria-label": n, value: cur, onChange: (e: { target: { value: string } }) => pick(n, e.target.value) }, ...opts);
  });
  return all.length ? h("div", "pk", null, ...all) : null;
}

function useSend(b: Composer, cx: Ctx) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const live = useRef(files);
  const set = (next: FileRow[]) => setFiles((live.current = next));
  const add = (blobs: File[]) => {
    const fresh = blobs.map((blob): FileRow => ({ name: blob.name, size: blob.size, mime: blob.type, state: "uploading", part: 0, blob })).slice(0, 10 - live.current.length);
    set([...live.current, ...fresh]);
    for (const r of fresh) if (cx.file) upload(r, cx.file, { screen: cx.screen, block: b.id ?? undefined, field: "files" }, () => set([...live.current]));
  };
  const drop = (r: FileRow) => {
    r.stop?.abort();
    set(live.current.filter((x) => x !== r));
  };
  return { files, add, drop, clear: () => set([]) };
}

function useHold(tap: () => void, hold: () => void) {
  const h = useRef({ held: false, t: 0 });
  const up = () => clearTimeout(h.current.t);
  const down = () => {
    h.current.held = false;
    h.current.t = window.setTimeout(() => {
      h.current.held = true;
      hold();
    }, 500);
  };
  const onClick = () => {
    if (!h.current.held) tap();
    h.current.held = false;
  };
  return { onPointerDown: down, onPointerUp: up, onPointerLeave: up, onContextMenu: (e: MouseEvent) => e.preventDefault(), onClick };
}

export function composer({ b, hooks }: V<Composer>) {
  const cx = useContext(Cx);
  const act = (k: string) => b.acts?.[k] ?? "";
  const [text, setText] = useState("");
  const [picks, setPicks] = useState<Blk>({});
  const [q, setQ] = useState<number | undefined>(undefined);
  const [st, setSt] = useState("");
  const [steering, setSteering] = useState(false);
  const { files, add, drop, clear } = useSend(b, cx);
  const ta = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const t = ta.current;
    if (t) t.style.height = "auto";
    if (t) t.style.height = `${t.scrollHeight}px`;
  }, [text]);
  const post: Post = (action, values) => cx.act({ action, block: b.id, values: { ...b.values, ...values } });
  const send = async (steer = false) => {
    const done = files.filter((r) => r.state === "done");
    if ((!text.trim() && !done.length) || files.some((r) => r.state === "uploading")) return;
    const queue = !steer && (b.working || q != null) ? act("queue") : "";
    const v: Blk = { ...picks, text, files: done.map(({ id, name, src }) => ({ id, name, src: src ?? null })), ...(queue && q != null ? { q } : null) };
    setSt("sending");
    setSteering(false);
    const ok = await post(steer ? act("steer") : queue || b.action, v);
    if (ok) {
      clear();
      setQ(undefined);
      setText("");
    }
    setSt(ok ? "sent" : "failed");
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    void send();
  };
  const held = useHold(() => void send(), () => b.working && act("steer") && setSteering(true));
  const edit = (x: Queued) => () => {
    setQ(x.q);
    setText(x.text);
    ta.current?.focus();
  };
  const said = q != null ? "save" : b.working ? "queue" : (b.label ?? "");
  const go = btn(said, "primary", undefined, b.action, { "aria-label": said || "send", "aria-busy": st === "sending" || undefined, ...held });
  const typed = (e: { target: { value: string } }) => {
    setText(e.target.value);
    if (st === "sent") setSt("");
  };
  const took = (e: { target: HTMLInputElement }) => {
    add(Array.from(e.target.files ?? []));
    e.target.value = "";
    setSt("");
  };
  const row = h(
    "div",
    "cr",
    { key: "cr" },
    btn("+", "", undefined, undefined, { "aria-label": "attach", onClick: () => pick.current?.click() }, !cx.file),
    h("input", "", { ref: pick, type: "file", multiple: true, hidden: true, onChange: took }),
    h("textarea", "", { ref: ta, name: "text", rows: 1, value: text, placeholder: b.placeholder ?? "", onChange: typed, onKeyDown: key }),
    go,
    b.working && steering ? btn("steer", "", undefined, undefined, { onClick: () => void send(true) }) : null,
  );
  const retry = st === "failed" ? [" ", btn("retry", "bad", undefined, undefined, { onClick: () => void send() })] : [];
  const status = st ? h("p", `cs ${st === "failed" ? "r" : "m"}`, null, SAID[st] ?? "", ...retry) : null;
  const top = [b.working ? createElement(Pill, { key: "pill", b, post }) : null, ...(b.queued ?? []).map((x) => queued(x, act("steer"), act("unqueue"), post, edit(x))), files.length ? attached(files, drop) : null, status];
  const chose = (n: string, v: string) => (act("model") ? void post(act("model"), { [n]: v }) : setPicks((p) => ({ ...p, [n]: v })));
  return h("div", "cmp", { ...hooks, "data-id": b.id ?? "" }, ...top, row, chips(b, picks, chose));
}
