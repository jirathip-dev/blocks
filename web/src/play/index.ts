import type { Ctx } from "../render/ctx.ts";
import { h, plain, render, type Worn } from "../shell.ts";
import { type Mark, read } from "./fault.ts";
import { pack, unpack } from "./pack.ts";
import { paint } from "./paint.ts";
import "./stream.ts";

type Rec = Record<string, unknown>;
type Cut = { file: string; from: number; to: number; code: string; url: string };
type Sample = { name: string; json: string; rust: Cut[] };

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : []);
const cut = (c: Rec): Cut => ({ file: String(c["file"]), from: Number(c["from"]), to: Number(c["to"]), code: String(c["code"]), url: String(c["url"]) });
const START = "steps";

function editor(lang: "json" | "rust", label: string, first = 1) {
  const gut = h("div", "pg-gut");
  const code = h("pre", "pg-code");
  const area = h("textarea", "pg-area");
  area.spellcheck = false;
  area.wrap = "off";
  area.readOnly = lang === "rust";
  area.setAttribute("aria-label", label);
  const el = h("div", `pg-ed${lang === "rust" ? " ro" : ""}`, gut, h("div", "pg-text", code, ...(lang === "rust" ? [] : [area])));
  let mark: Mark | undefined;
  const draw = () => {
    const t = area.value;
    code.replaceChildren(paint(t, lang));
    gut.replaceChildren(...t.split("\n").map((_, i) => h("i", mark?.line === i + 1 ? "err" : "", String(first + i))));
    if (!mark) return;
    const ln = t.split("\n")[mark.line - 1] ?? "";
    const bad = h("div", "pg-mark", ln.slice(0, mark.col - 1), h("span", "pg-bad", ln.slice(mark.col - 1, mark.col - 1 + mark.len) || " "));
    bad.style.setProperty("--line", String(mark.line - 1));
    code.append(bad);
  };
  area.addEventListener("scroll", () => {
    code.style.translate = `${-area.scrollLeft}px ${-area.scrollTop}px`;
    gut.style.translate = `0 ${-area.scrollTop}px`;
  });
  return {
    el,
    area,
    set(t: string) {
      area.value = t;
      draw();
    },
    mark(m: Mark | undefined) {
      mark = m;
      draw();
    },
  };
}

function seg(label: string, opts: [string, string][], now: string, pick: (v: string) => void) {
  const g = h("div", "pg-seg", ...(label ? [h("span", "pg-seg__label", label)] : []));
  g.setAttribute("role", "group");
  g.setAttribute("aria-label", label || "tabs");
  const press = (v: string) => g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.value === v)));
  for (const [v, text] of opts) {
    const b = h("button", "b b-button", text);
    b.type = "button";
    b.value = v;
    b.onclick = () => {
      press(v);
      pick(v);
    };
    g.append(b);
  }
  press(now);
  return { el: g, press };
}

function preview(looks: Record<string, Worn>) {
  const frame = h("iframe", "pg-frame");
  frame.title = "preview";
  const stage = h("div", "pg-stage", frame);
  const cap = h("p", "pg-cap");
  const state = { look: "default", mode: "light", width: 390 };
  let model: Rec = {};
  const ctx: Ctx = { screen: "play", act: async () => false, tap: () => undefined, open: new Set(), theme: plain, store: { get: () => null, put: () => undefined }, held: new Map(), view: new Map() };
  const ready = new Promise<Document>((ok) => frame.addEventListener("load", () => frame.contentDocument && ok(frame.contentDocument), { once: true }));
  frame.srcdoc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="blocks.css"><style></style></head><body><main></main></body></html>';
  const fit = (d: Document) => {
    const k = Math.min(1, stage.clientWidth / state.width);
    Object.assign(frame.style, { width: `${state.width}px`, height: "0", scale: String(k) });
    const tall = d.documentElement.scrollHeight;
    frame.style.height = `${tall}px`;
    stage.style.height = `${Math.ceil(tall * k)}px`;
    cap.textContent = k < 1 ? `${state.width} wide, shown at ${Math.round(k * 100)}%` : `${state.width} wide, actual size`;
  };
  const draw = async () => {
    const d = await ready;
    const w = looks[state.look];
    const s = w && ("tokens" in w ? w : w[state.mode === "dark" ? "dark" : "light"]);
    const style = d.querySelector("style");
    if (style) style.textContent = `${s ? plain.css({ light: s, dark: s }, w && "style" in w ? w.style : undefined) : ""}:root{color-scheme:${state.mode}}html,body{margin:0;background:var(--bg);color:var(--fg)}`;
    const e = render(model, ctx);
    d.querySelector("main")?.replaceChildren(...(e ? [d.adoptNode(e)] : []));
    fit(d);
  };
  void ready.then((d) => new ResizeObserver(() => fit(d)).observe(d.body));
  new ResizeObserver(() => void ready.then(fit)).observe(stage);
  return {
    stage,
    cap,
    state,
    show(m: Rec) {
      model = m;
      return draw();
    },
    set(k: "look" | "mode" | "width", v: string) {
      if (k === "width") state.width = Number(v);
      else state[k] = v;
      return draw();
    },
  };
}

class Play extends HTMLElement {
  connectedCallback() {
    if (this.dataset["on"]) return;
    this.dataset["on"] = "1";
    delete this.dataset["fallback"];
    const props: unknown = JSON.parse(this.dataset["props"] ?? "{}");
    const p = isRec(props) ? props : {};
    const samples: Sample[] = recs(p["samples"]).map((s) => ({ name: String(s["name"]), json: String(s["json"]), rust: recs(s["rust"]).map(cut) }));
    const looks: unknown = JSON.parse(document.getElementById("blocks-screen")?.dataset["looks"] || "{}");
    const worn: Record<string, Worn> = isRec(looks) ? Object.fromEntries(Object.entries(looks).filter((e): e is [string, Worn] => isRec(e[1]))) : {};
    const view = preview(worn);
    const ed = editor("json", "screen JSON");
    const rust = h("div", "pg-rust");
    const from = h("p", "pg-from");
    const status = h("p", "pg-status");
    const note = h("p", "pg-note", "Showing the last good screen.");
    const link = h("div", "pg-link");
    note.hidden = link.hidden = rust.hidden = true;
    let picked: Sample | undefined;
    const tabs = seg("", [["json", "JSON"], ["rust", "Rust"]], "json", (t) => {
      ed.el.hidden = t !== "json";
      rust.hidden = t === "json";
    });
    const reset = h("button", "b b-button", "reset");
    const share = h("button", "b b-button pg-share", h("span", "", "share"));
    reset.type = share.type = "button";
    const redraw = () => {
      const r = read(ed.area.value);
      reset.disabled = picked === undefined || ed.area.value === picked.json;
      link.hidden = true;
      if ("mark" in r) {
        ed.mark(r.mark);
        status.textContent = `line ${r.mark.line} · ${r.mark.why}`;
        status.className = "pg-status bad";
        note.hidden = false;
        return;
      }
      ed.mark(undefined);
      const m = isRec(r.value) ? r.value : {};
      status.textContent = `${String(m["type"])} · ${Array.isArray(m["blocks"]) ? m["blocks"].length : 0} blocks · drawn`;
      status.className = "pg-status";
      note.hidden = true;
      void view.show(m);
    };
    const width = seg("width", [["390", "390"], ["1440", "1440"]], "390", (v) => void view.set("width", v));
    const source = (c: Cut) => {
      const e = editor("rust", `${c.file}, read only`, c.from);
      e.set(c.code);
      return h("div", "pg-src", h("p", "pg-path", Object.assign(h("a", "", `${c.file}:${c.from}–${c.to}`), { href: c.url })), e.el);
    };
    const pick = (s: Sample | undefined, text: string, said: string) => {
      picked = s;
      from.textContent = said;
      ed.set(text);
      const home = s?.name === "home";
      const none = home
        ? h("p", "pg-empty", "Home is all of home() in pages.rs, too long to show here: ", Object.assign(h("a", "", "read it on GitHub"), { href: String(p["pages"]) }))
        : h("p", "pg-empty", "A shared screen has no Rust: pick a sample to see the Rust that builds it.");
      rust.replaceChildren(...(s?.rust.length ? s.rust.map(source) : [none]));
      document.querySelectorAll('[data-id="pick"] a').forEach((a) => (s && a.getAttribute("href")?.endsWith(`#k=${s.name}`) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
      if (s) {
        const w = home ? "1440" : "390";
        width.press(w);
        void view.set("width", w);
      }
      redraw();
    };
    const sample = (name: string | null) => samples.find((x) => x.name === (name ?? START)) ?? samples[0];
    const start = (s: Sample | undefined) => s && pick(s, s.json, `The ${s.name} sample, as blocks-site builds it.`);
    const load = async () => {
      const hash = new URLSearchParams(location.hash.slice(1));
      const shared = hash.get("s");
      if (shared) {
        const text = await unpack(shared).catch(() => undefined);
        if (text !== undefined) return pick(undefined, text, "From a shared link.");
      }
      start(sample(hash.get("k")));
    };
    ed.area.addEventListener("input", redraw);
    reset.onclick = () => start(picked ?? sample(null));
    share.onclick = async () => {
      const packed = await pack(ed.area.value).catch(() => undefined);
      if (packed === undefined) return;
      history.replaceState(null, "", `#s=${packed}`);
      const url = Object.assign(h("input", "pg-url"), { readOnly: true, value: location.href });
      url.setAttribute("aria-label", "the link to this screen");
      const copied = await navigator.clipboard?.writeText(location.href).then(() => true, () => false);
      link.replaceChildren(url, h("span", "pg-ok", `${copied ? "copied · " : ""}${location.href.length} characters`));
      link.hidden = false;
    };
    addEventListener("hashchange", () => void load());
    const named = Object.keys(worn)
      .sort((a, b) => Number(b === "default") - Number(a === "default"))
      .map((k): [string, string] => [k, k.charAt(0).toUpperCase() + k.slice(1)]);
    const edit = h("section", "pg-edit", h("div", "pg-head", tabs.el, h("span", "pg-gap"), reset, share), from, ed.el, rust, status, link);
    const prev = h(
      "section",
      "pg-prev",
      h("h3", "sh", "Preview"),
      h("div", "pg-tools", seg("look", named, view.state.look, (v) => void view.set("look", v)).el, seg("", [["light", "light"], ["dark", "dark"]], "light", (v) => void view.set("mode", v)).el, width.el),
      note,
      view.stage,
      view.cap,
    );
    edit.setAttribute("aria-label", "edit");
    prev.setAttribute("aria-label", "preview");
    this.replaceChildren(h("div", "pg-pair", edit, prev));
    void load();
  }
}

function tabbed(nav: Element) {
  const box = nav.closest('[data-id="sample"]');
  nav.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("a") : null;
    const tab = a?.getAttribute("href")?.slice(1);
    if (!a || !box || (tab !== "rust" && tab !== "json")) return;
    e.preventDefault();
    box.setAttribute("data-tab", tab);
    nav.querySelectorAll('a[href^="#"]').forEach((x) => (x === a ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current")));
  });
}

if (!customElements.get("x-play")) customElements.define("x-play", Play);
document.querySelectorAll('[data-id="tabs"]').forEach(tabbed);
