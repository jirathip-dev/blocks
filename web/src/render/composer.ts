import type { Composer, Queued } from "../gen/types.ts";
import { type Blk, btn, type Ctx, el, esc, h, obj } from "./index.ts";

type Att = { name: string; type: string; data: string };
type Draft = { files: Att[]; picks: Blk; q?: number; st?: string; steer?: boolean; stopping?: boolean };
const drafts = new Map<string, Draft>();
const SAID: Record<string, string> = { sending: "sending…", sent: "✓ sent", failed: "not sent" };

const read = (f: File) =>
  new Promise<Att>((ok) => {
    const r = new FileReader();
    r.onload = () => ok({ name: f.name, type: f.type, data: String(r.result).split(",")[1] ?? "" });
    r.readAsDataURL(f);
  });

export function composer(b: Composer, c: Ctx): HTMLElement {
  const key = `draft:${c.screen}:${String(b.id)}:text`;
  const act = (k: string) => b.acts?.[k] ?? "";
  const d: Draft = drafts.get(key) ?? { files: [], picks: {} };
  drafts.set(key, d);
  const f = el("div", "cmp");
  f.dataset.id = b.id ?? "";
  const ta = el("textarea");
  Object.assign(ta, { name: "text", rows: 1, value: c.store.get(key) ?? "", placeholder: b.placeholder ?? "" });
  const grow = () => {
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };
  const pick = el("input");
  Object.assign(pick, { type: "file", multiple: true, hidden: true });
  const post = async (action: string, values: Blk, x?: HTMLElement) => c.act({ action, block: b.id, values: { ...b.values, ...values } }, x);
  const row = el("div", "cr");
  const add = btn("+");
  const go = btn("", "primary", undefined, b.action);
  const st = btn("steer");
  const send = async (steer = false) => {
    if (!ta.value.trim() && !d.files.length) return;
    const queue = !steer && (b.working || d.q != null) ? act("queue") : "";
    const action = steer ? act("steer") : queue || b.action;
    const v: Blk = { ...d.picks, text: ta.value, name: d.files.map((x) => x.name).join("/"), data: d.files.map((x) => x.data).join(",") };
    if (queue && d.q != null) v.q = d.q;
    [d.st, d.steer] = ["sending", false];
    draw();
    if (await post(action, v, steer ? undefined : go)) {
      Object.assign(d, { files: [], q: undefined, st: "sent" });
      ta.value = "";
      c.store.put(key, null);
      grow();
    } else d.st = "failed";
    draw();
  };
  ta.oninput = () => {
    c.store.put(key, ta.value || null);
    d.st = d.st === "sent" ? "" : d.st;
    grow();
  };
  ta.onkeydown = (e) => {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    send();
  };
  pick.onchange = async () => {
    d.files = [...d.files, ...(await Promise.all(Array.from(pick.files ?? []).map(read)))].slice(0, 10);
    pick.value = "";
    d.st = "";
    draw();
  };
  add.setAttribute("aria-label", "attach");
  add.onclick = () => pick.click();
  let held = false;
  let hold = 0;
  go.onpointerdown = () => {
    held = false;
    hold = window.setTimeout(() => {
      held = true;
      if (b.working && act("steer")) {
        d.steer = true;
        draw();
      }
    }, 500);
  };
  go.onpointerup = go.onpointerleave = () => clearTimeout(hold);
  go.oncontextmenu = (e) => e.preventDefault();
  go.onclick = () => {
    if (!held) send();
    held = false;
  };
  st.onclick = () => send(true);
  row.append(add, pick, ta, go);
  function working(): HTMLElement {
    const p = el("div", "pill");
    const tick = () => {
      if (!navigator.onLine) return p.replaceChildren(el("span", "r", "offline · tap to retry"));
      const s = Math.max(0, Math.floor((Date.now() - Date.parse(String(obj(b.working).since))) / 1000));
      const fig = c.theme.figure({ state: "working" });
      p.replaceChildren(...(fig ? [fig] : []), h("span", "pt", d.stopping ? "stopping…" : `working ${s >= 60 ? `${Math.floor(s / 60)}m ` : ""}${s % 60}s`));
      const x = btn("stop", "bad", undefined, act("stop"));
      x.onclick = async (e) => {
        e.stopPropagation();
        if (!(await post(act("stop"), {}, x))) return;
        d.stopping = true;
        tick();
      };
      if (act("stop") && !d.stopping) p.append(x);
    };
    p.onclick = () => navigator.onLine || f.dispatchEvent(new CustomEvent("redraw", { bubbles: true }));
    tick();
    const t = setInterval(() => (p.isConnected ? tick() : clearInterval(t)), 1000);
    return p;
  }
  function queued(m: Queued): HTMLElement {
    const text = m.text;
    const r = h("div", "qd", h("span", "qt", text));
    r.dataset.q = String(m.q);
    const now = btn("send now", "primary", undefined, act("steer"));
    const edit = btn("edit");
    const rm = btn("remove", "bad", undefined, act("unqueue"));
    now.onclick = () => post(act("steer"), { q: m.q }, now);
    edit.onclick = () => {
      [d.q, ta.value] = [m.q, text];
      c.store.put(key, text);
      grow();
      ta.focus();
      draw();
    };
    rm.onclick = () => post(act("unqueue"), { q: m.q }, rm);
    r.append(now, edit, rm);
    return r;
  }
  function attached(): HTMLElement {
    const th = el("div", "th");
    d.files.forEach((a, i) => {
      const t = el("span", "tb", a.type.startsWith("image/") ? `<img alt="${esc(a.name)}" src="data:${esc(a.type)};base64,${esc(a.data)}">` : `<span>${esc(a.name)}</span>`);
      const x = btn("×");
      x.setAttribute("aria-label", `remove ${a.name}`);
      x.onclick = () => {
        d.files.splice(i, 1);
        draw();
      };
      t.append(x);
      th.append(t);
    });
    return th;
  }
  function status(): HTMLElement {
    const s = h("p", `cs ${d.st === "failed" ? "r" : "m"}`, SAID[d.st ?? ""] ?? "");
    if (d.st !== "failed") return s;
    const x = btn("retry", "bad");
    x.onclick = () => send();
    s.append(" ", x);
    return s;
  }
  function draw() {
    if (!b.working) d.stopping = d.steer = false;
    const top: HTMLElement[] = [];
    if (b.working) top.push(working());
    top.push(...(b.queued ?? []).map(queued));
    if (d.files.length) top.push(attached());
    if (d.st) top.push(status());
    ta.placeholder = b.placeholder ?? "";
    (go.firstElementChild ?? go).textContent = d.q != null ? "save" : b.working ? "queue" : (b.label ?? "");
    if (d.st === "sending") go.setAttribute("aria-busy", "true");
    else go.removeAttribute("aria-busy");
    if (d.steer) row.append(st);
    else st.remove();
    const picks = el("div", "pk");
    for (const ch of b.chips ?? []) {
      const n = ch.name;
      const s = el("select");
      const cur = String(d.picks[n] ?? ch.cur ?? "");
      s.setAttribute("aria-label", n);
      if (!cur) s.append(new Option(n, "", true, true));
      for (const o of ch.all) s.append(new Option(o, o, o === cur, o === cur));
      s.onchange = () => (act("model") ? post(act("model"), { [n]: s.value }, s) : ((d.picks[n] = s.value), draw()));
      picks.append(s);
    }
    for (const k of Array.from(f.children)) if (k !== row) k.remove();
    if (row.parentNode !== f) f.append(row);
    row.before(...top);
    if (picks.childElementCount) row.after(picks);
  }
  draw();
  setTimeout(grow);
  return f;
}
