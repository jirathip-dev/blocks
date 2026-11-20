// Preview-only: the playground's two panes (edit, preview) wired together, as the mockups draw them.
import { check, editor, h, pack, preview, samples, seg } from "./play.js";

const GH = "https://github.com/jirathip-dev/blocks/blob/main/";

export function playground({ sample = "steps", tab = "json", text, shared = false, rows = 28, view = {}, picker, onPick }) {
  let s = samples.find((x) => x.name === sample) ?? samples[0];
  let good = null;
  const pv = preview();
  const status = h("p", "pg-status");
  const note = h("p", "pg-note");
  note.hidden = true;
  const json = editor({ text: text ?? s.json, lang: "json", rows, onInput: (t) => edited(t) });
  const rust = h("div", "pg-rust");
  const body = h("div", "pg-body", json.el, rust);
  const reset = h("button", "b b-button", h("span", null, "reset"));
  const share = h("button", "b b-button pg-share", h("span", null, "share"));
  const link = h("div", "pg-link");
  link.hidden = true;
  const tabs = seg("", [["json", "JSON"], ["rust", "Rust"]], tab, (t) => show(t));
  tabs.classList.add("pg-tabs");
  const head = h("div", "pg-head", tabs, h("span", "pg-gap"), reset, share);
  const from = h("p", "pg-from");
  const edit = h("section", "sec b b-section pg-edit", head, from, body, status, link);
  edit.dataset.id = "edit";
  const v = { look: "default", mode: "light", width: s.name === "home" ? 1440 : 390, ...view };
  const tools = h(
    "div",
    "pg-tools",
    seg("look", [["default", "Default"], ["paper", "Paper"], ["console", "Console"], ["playful", "Playful"]], v.look, (look) => pv.set({ look })),
    seg("", [["light", "light"], ["dark", "dark"]], v.mode, (mode) => pv.set({ mode })),
    seg("", [[390, "390"], [1440, "1440"]], v.width, (width) => pv.set({ width })),
  );
  const prev = h("section", "sec b b-section pg-prev", h("h3", "sh", "Preview"), tools, note, pv.el);
  prev.dataset.id = "preview";
  pv.set(v);

  const drawRust = () => {
    if (shared || !s.rust) {
      rust.replaceChildren(
        h("p", "pg-empty", shared ? "A shared screen has no Rust: it was edited as JSON. Pick a sample to see the Rust that builds it." : `The ${s.name} page is built in site/src/pages.rs, by home(); its Rust is too long to show here.`),
      );
      return;
    }
    rust.replaceChildren(
      ...s.rust.map((r) => {
        const ed = editor({ text: r.code, lang: "rust", readonly: true });
        ed.first(r.from);
        const at = `${r.file}:${r.from}–${r.to}`;
        const a = h("a", null, at);
        a.href = `${GH}${r.file}#L${r.from}-L${r.to}`;
        return h("div", "pg-src", h("p", "pg-path", a), ed.el);
      }),
    );
  };
  const show = (t) => {
    json.el.hidden = t !== "json";
    rust.hidden = t !== "rust";
  };
  const edited = (t) => {
    const r = check(t);
    json.mark(r.error ?? null);
    reset.disabled = t === s.json && !shared;
    if (r.error) {
      status.className = "pg-status bad";
      status.replaceChildren(h("b", null, `line ${r.error.line}`), ` · ${r.error.msg}`);
      note.hidden = false;
      note.textContent = "Showing the last good screen.";
      return;
    }
    good = r.value;
    note.hidden = true;
    status.className = "pg-status";
    const n = Array.isArray(good.blocks) ? good.blocks.length : 1;
    status.textContent = `${good.type ?? "block"} · ${n} block${n === 1 ? "" : "s"} · drawn`;
    pv.show(good);
  };
  const fromText = () => {
    from.replaceChildren(
      shared
        ? "From a shared link."
        : json.area.value === s.json
          ? `The ${s.name} sample, as blocks-site builds it.`
          : `The ${s.name} sample, edited. The Rust tab still shows the sample's.`,
    );
  };
  json.area.addEventListener("input", fromText);
  reset.onclick = () => {
    shared = false;
    json.set(s.json);
    edited(s.json);
    fromText();
    drawRust();
  };
  share.onclick = async () => {
    const hash = await pack(json.area.value);
    const url = `https://jirathip-dev.github.io/blocks/playground.html#s=${hash}`;
    link.hidden = false;
    const field = h("input", "pg-url");
    field.value = url;
    field.readOnly = true;
    field.setAttribute("aria-label", "share link");
    link.replaceChildren(field, h("span", "pg-ok", `copied · ${url.length} characters`));
  };
  const pick = (name) => {
    s = samples.find((x) => x.name === name) ?? s;
    shared = false;
    json.set(s.json);
    edited(s.json);
    fromText();
    drawRust();
    pv.set({ width: name === "home" ? 1440 : pv.state.width });
    onPick?.(name);
  };
  // first good preview from the untouched sample, then the given text over it
  const r0 = check(s.json);
  if (r0.value) {
    good = r0.value;
    pv.show(good);
  }
  edited(json.area.value);
  fromText();
  drawRust();
  show(tab);
  return { edit, prev, pick, share, pv, ready: pv.ready };
}

export function picker(now, onPick) {
  const g = h("div", "chips b b-chips pg-pick");
  g.dataset.block = "chips";
  g.dataset.id = "start-from";
  g.setAttribute("role", "group");
  g.setAttribute("aria-label", "start from");
  for (const s of samples) {
    const b = h("button", s.name === now ? "on" : "", h("span", null, s.name));
    b.type = "button";
    b.setAttribute("aria-pressed", String(s.name === now));
    b.onclick = () => {
      for (const x of g.querySelectorAll("button")) {
        x.classList.remove("on");
        x.setAttribute("aria-pressed", "false");
      }
      b.classList.add("on");
      b.setAttribute("aria-pressed", "true");
      onPick(s.name);
    };
    g.append(b);
  }
  return g;
}

export const settled = () => new Promise((ok) => setTimeout(ok, 300));
