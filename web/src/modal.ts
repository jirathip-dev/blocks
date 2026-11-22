import { clamp, type Framed, gone, modal as rules, type ModalGrab, type Place, variant } from "./core/kind/modal.ts";
import type { Modal } from "./gen/types.ts";
import { steered } from "./gesture.ts";

/// Where a modal's kept place lives: the shell's store, else this browser's local storage.
export type Kept = { get(key: string): string | null; put(key: string, value: string | null): void };
/// What a modal sends when its main button is pressed: the done action with the values of the fields inside it.
export type Done = (a: { action: string; block?: string | null | undefined; values: Record<string, unknown> }) => Promise<boolean>;

const TOOL = { w: 360, h: 440 };
const PHONE = "(max-width: 600px)";

const local: Kept = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  put: (k, v) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  },
};

const num = (v: unknown, or: number) => (typeof v === "number" && Number.isFinite(v) ? v : or);

function read(store: Kept, key: string | null): (Place & { min: boolean }) | null {
  const s = key ? store.get(key) : null;
  if (!s) return null;
  try {
    const v: unknown = JSON.parse(s);
    if (typeof v !== "object" || v === null) return null;
    const o = Object.fromEntries(Object.entries(v));
    return { x: num(o["x"], 0), y: num(o["y"], 0), w: num(o["w"], TOOL.w), h: num(o["h"], TOOL.h), min: o["min"] === true };
  } catch {
    return null;
  }
}

const focusable = (d: HTMLElement) => Array.from(d.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex]")).filter((e) => e.tabIndex >= 0 && !e.closest("[hidden]"));
const phone = () => typeof matchMedia === "function" && matchMedia(PHONE).matches;
const onButton = (e: UIEvent) => e.target instanceof Element && e.target.closest("button") !== null;

function fields(d: HTMLElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of d.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[name], select[name], textarea[name]")) {
    if (i instanceof HTMLInputElement && i.type === "checkbox") out[i.name] = i.checked;
    else out[i.name] = i.value;
  }
  return out;
}

let pills: HTMLElement | undefined;
const tray = () => {
  if (!pills?.isConnected) {
    pills = Object.assign(document.createElement("nav"), { className: "mdp" });
    pills.setAttribute("aria-label", "minimised windows");
    document.body.append(pills);
  }
  return pills;
};

type Live = { d: HTMLDialogElement; b: Modal; v: ReturnType<typeof variant>; store: Kept; key: string | null; place: Place; min: boolean; on: boolean; opener: HTMLElement | null; pill: HTMLButtonElement; stop: () => void };

const part = (s: Live, cls: string) => s.d.querySelector<HTMLElement>(`.${cls}`);

function framing(s: Live): Framed {
  const r = s.d.getBoundingClientRect();
  return { b: s.b, at: s.v === "tool" ? s.place : { ...s.place, w: r.width, h: r.height }, vw: innerWidth, vh: innerHeight };
}

function draw(s: Live, p: Place) {
  s.d.style.setProperty("--mx", `${p.x}px`);
  s.d.style.setProperty("--my", `${p.y}px`);
  if (s.v !== "tool") return;
  s.d.style.setProperty("--tw", `${p.w}px`);
  s.d.style.setProperty("--th", `${p.h}px`);
  const z = part(s, "mdz");
  z?.setAttribute("aria-valuenow", String(p.w));
  z?.setAttribute("aria-valuetext", `${p.w} by ${p.h}`);
}

const save = (s: Live) => s.key && s.store.put(s.key, JSON.stringify(s.v === "tool" ? { ...s.place, min: s.min } : { x: s.place.x, y: s.place.y }));

function fit(s: Live) {
  if (!s.on) return;
  if (!s.d.isConnected) return s.stop();
  s.d.classList.remove("full");
  if (phone()) {
    const body = part(s, "mdb");
    s.d.style.removeProperty("--sy");
    s.d.classList.toggle("full", s.v !== "alert" && !!body && body.scrollHeight > body.clientHeight);
    return draw(s, { ...s.place, x: 0, y: 0 });
  }
  const f = framing(s);
  s.place = { ...clamp(f.at, f.vw, f.vh), ...(s.v === "tool" ? {} : { w: s.place.w, h: s.place.h }) };
  draw(s, s.place);
}

function fold(s: Live, to: boolean) {
  s.min = to && !phone();
  s.d.hidden = s.min;
  if (s.min) tray().append(s.pill);
  else s.pill.remove();
  if (pills && !pills.childElementCount) pills.remove();
  save(s);
  if (!s.min) part(s, "mdt")?.focus();
}

function close(s: Live) {
  s.pill.remove();
  if (pills && !pills.childElementCount) pills.remove();
  if (s.d.open) s.d.close();
  s.stop();
  if (s.opener?.isConnected) s.opener.focus();
}

function drive(s: Live, el: HTMLElement | null, grab: ModalGrab, keys: HTMLElement | null) {
  if (!el || !rules.word(framing(s), grab)) return;
  const handle = grab === "handle";
  const send = (c: Place) => {
    if (handle) return c.y >= gone(framing(s)) && (close(s), true);
    s.place = c;
    save(s);
    return true;
  };
  const show = (c: Place | null) => {
    if (handle) s.d.style.setProperty("--sy", `${c?.y ?? 0}px`);
    else draw(s, c ?? s.place);
  };
  steered(el, { rules, grab, now: () => framing(s), reach: (dx, dy) => ({ dx, dy }), show, send, tap: handle ? () => close(s) : undefined, keys, mark: s.d, skip: (e) => phone() !== handle || (grab === "head" && onButton(e)) });
}

function wire(s: Live, done: Done) {
  const head = part(s, "mdh");
  drive(s, head, "head", part(s, "mdt"));
  drive(s, part(s, "mdk"), "handle", null);
  drive(s, part(s, "mdz"), "corner", part(s, "mdz"));
  drive(s, part(s, "mde"), "edge", null);
  part(s, "mdn")?.addEventListener("click", () => fold(s, true));
  s.pill.addEventListener("click", () => fold(s, false));
  head?.addEventListener("dblclick", (e) => {
    if (s.v === "alert" || onButton(e)) return;
    s.place = { ...s.place, x: 0, y: 0 };
    if (s.v === "tool") save(s);
    else if (s.key) s.store.put(s.key, null);
    fit(s);
  });
  part(s, "mdk")?.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), close(s)));
  for (const x of s.d.querySelectorAll<HTMLElement>(".mdx, .mdc")) x.addEventListener("click", () => close(s));
  part(s, "mdo")?.addEventListener("click", () => {
    const a = s.b.done;
    if (!a) return close(s);
    void done({ action: a.action, block: s.b.id, values: { ...a.values, ...fields(s.d) } }).then((ok) => ok && close(s));
  });
}

function keys(s: Live) {
  s.d.addEventListener("cancel", (e) => (e.preventDefault(), close(s)));
  s.d.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && s.v === "tool") return (e.preventDefault(), close(s));
    if (e.key !== "Tab" || s.v === "tool") return;
    const all = focusable(s.d);
    const at = all.findIndex((x) => x === document.activeElement);
    const n = Math.max(1, all.length);
    let step = (at + (e.shiftKey ? n - 1 : 1)) % n;
    if (at < 0) step = e.shiftKey ? n - 1 : 0;
    e.preventDefault();
    all[step]?.focus();
  });
}

const away = (s: Live) => (e: KeyboardEvent) => {
  if (e.key !== "F6" || s.d.hidden || !s.d.open) return;
  e.preventDefault();
  if (s.d.contains(document.activeElement)) (s.opener?.isConnected ? s.opener : document.body).focus();
  else part(s, "mdt")?.focus();
};

function first(s: Live): HTMLElement | null {
  if (s.v === "alert") return (s.b.destructive ? part(s, "mdc") : null) ?? part(s, "mdo");
  if (s.v === "tool") return part(s, "mdt");
  return part(s, "mdb")?.querySelector<HTMLElement>("input, select, textarea") ?? part(s, "mdo") ?? part(s, "mdt");
}

/// Brings a drawn modal to life once it is on the page: opens it, keeps and clamps its place, drives its drags, folds a tool window to a pill, traps focus; returns what stops it.
export function framed(d: HTMLDialogElement, b: Modal, o: { done: Done; store?: Kept | undefined }): () => void {
  const store = o.store ?? local;
  const v = variant(b);
  const key = v !== "alert" && b.id ? `b:modal:${b.id}` : null;
  const kept = read(store, key);
  const pill = Object.assign(document.createElement("button"), { type: "button" });
  pill.setAttribute("aria-label", `restore ${b.title}`);
  pill.append(Object.assign(document.createElement("span"), { textContent: `▣ ${b.title}` }));
  const place = { x: kept?.x ?? 0, y: kept?.y ?? 0, w: kept?.w ?? TOOL.w, h: kept?.h ?? TOOL.h };
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const s: Live = { d, b, v, store, key, place, min: v === "tool" && kept?.min === true, on: true, opener, pill, stop: () => {} };
  const resize = () => fit(s);
  const f6 = away(s);
  s.stop = () => {
    s.on = false;
    removeEventListener("resize", resize);
    document.removeEventListener("keydown", f6);
  };
  wire(s, o.done);
  keys(s);
  addEventListener("resize", resize);
  if (v === "tool") document.addEventListener("keydown", f6);
  d.dataset["live"] = "";
  if (!d.open) {
    try {
      if (v === "tool") d.show();
      else d.showModal();
    } catch {
      d.setAttribute("open", "");
    }
  }
  fit(s);
  if (s.min) fold(s, true);
  else first(s)?.focus();
  return s.stop;
}
