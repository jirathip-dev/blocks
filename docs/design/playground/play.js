// Preview-only port that draws these mockups; not product code. Impl writes the real one in web/src.
import { plain, render } from "../../../web/dist/blocks.js";
import { looks, samples } from "./samples.js";

export { samples };

const h = (tag, cls, ...kids) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...kids.filter((k) => k != null));
  return e;
};

const JSON_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
const RUST_RE =
  /("(?:[^"\\]|\\.)*")|\b(\d[\d_]*(?:\.\d+)?(?:_?[ui](?:8|16|32|64|size)|_?f64)?)\b|\b(let|fn|pub|mut|move|if|else|match|for|in|return|use|vec|Some|None|true|false|self|Self)\b|\b([A-Z][A-Za-z0-9]*)\b|\b([a-z_][a-z0-9_]*!)|([(){}[\],.;:|&?])/g;

export function paint(text, lang) {
  const f = document.createDocumentFragment();
  const re = lang === "rust" ? RUST_RE : JSON_RE;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) f.append(text.slice(last, m.index));
    const cls =
      lang === "rust"
        ? m[1] ? "s" : m[2] ? "n" : m[3] ? "kw" : m[4] ? "ty" : m[5] ? "mc" : "p"
        : m[1] ? (m[2] ? "k" : "s") : m[3] ? "n" : m[4] ? "l" : "p";
    if (lang !== "rust" && m[1] && m[2]) {
      f.append(h("span", "k", m[1]), h("span", "p", m[2]));
    } else f.append(h("span", cls, m[0]));
    last = m.index + m[0].length;
  }
  f.append(text.slice(last) + "\n");
  return f;
}

const KINDS = new Set(samples.map((s) => s.name).filter((n) => n !== "home"));

function lineOf(text, at) {
  const before = text.slice(0, at);
  return { line: before.split("\n").length, col: at - before.lastIndexOf("\n") };
}

export function check(text) {
  try {
    const v = JSON.parse(text);
    const bad = walk(v, "");
    if (!bad) return { value: v };
    const at = text.indexOf(bad.find);
    return { error: { ...lineOf(text, at < 0 ? 0 : at + bad.find.indexOf(bad.mark)), len: bad.mark.length, msg: bad.msg } };
  } catch (e) {
    const m = String(e.message).match(/position (\d+)/);
    const at = m ? Number(m[1]) : text.length;
    const why = String(e.message).replace(/ in JSON.*| \(line.*|, ".*$/, "").replace(/^Unexpected token '(.)'.*/, "unexpected $1");
    const tok = text.slice(at).match(/^("(?:[^"\\]|\\.)*"|[^\s,:{}[\]]+|\S)/)?.[0] ?? " ";
    return { error: { ...lineOf(text, at), len: tok.length, msg: `not JSON: ${why.toLowerCase()}` } };
  }
}

function walk(v, path) {
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const b = walk(v[i], `${path}[${i}]`);
      if (b) return b;
    }
    return null;
  }
  if (!v || typeof v !== "object") return null;
  if ("type" in v && typeof v.type === "string" && !KINDS.has(v.type) && path.match(/blocks\[\d+\]$|^$/))
    return { find: `"type": "${v.type}"`, mark: `"${v.type}"`, msg: `${path || "screen"}.type: "${v.type}" is not a kind; did you mean "${near(v.type)}"?` };
  if (v.type === "stat" && Array.isArray(v.items))
    for (const [i, t] of v.items.entries())
      if (typeof t.value === "boolean" || t.value === null || typeof t.value === "object")
        return { find: `"value": ${JSON.stringify(t.value)}`, mark: JSON.stringify(t.value), msg: `${path}.items[${i}].value: expected a number or text` };
  for (const [k, x] of Object.entries(v)) {
    const b = walk(x, path ? `${path}.${k}` : k);
    if (b) return b;
  }
  return null;
}

const near = (t) => [...KINDS].sort((a, b) => dist(a, t) - dist(b, t))[0];
function dist(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function editor({ text, lang, readonly = false, rows, onInput }) {
  const gut = h("div", "pg-gut");
  const code = h("pre", "pg-code");
  const area = h("textarea", "pg-area");
  area.spellcheck = false;
  area.readOnly = readonly;
  area.setAttribute("aria-label", lang === "rust" ? "the sample's Rust, read only" : "screen JSON");
  area.value = text;
  const wrap = h("div", "pg-ed" + (readonly ? " ro" : ""), gut, h("div", "pg-text", code, area));
  if (rows) wrap.style.setProperty("--rows", rows);
  let error = null;
  const draw = () => {
    const t = area.value;
    code.replaceChildren(paint(t, lang));
    const n = t.split("\n").length;
    gut.replaceChildren(
      ...Array.from({ length: n }, (_, i) => h("i", error && error.line === i + 1 ? "err" : "", String((wrap.first ?? 1) + i))),
    );
    if (error) {
      const ln = t.split("\n")[error.line - 1] ?? "";
      const pre = ln.slice(0, error.col - 1);
      const bad = ln.slice(error.col - 1, error.col - 1 + error.len) || " ";
      const mark = h("div", "pg-mark", h("span", "pg-pre", pre), h("span", "pg-bad", bad));
      mark.style.setProperty("--line", error.line - 1);
      code.append(mark);
    }
  };
  area.addEventListener("input", () => {
    draw();
    onInput?.(area.value);
  });
  area.addEventListener("scroll", () => {
    code.style.translate = `${-area.scrollLeft}px ${-area.scrollTop}px`;
    gut.style.translate = `0 ${-area.scrollTop}px`;
  });
  draw();
  return {
    el: wrap,
    area,
    set(t) {
      area.value = t;
      draw();
    },
    first(n) {
      wrap.first = n;
      draw();
    },
    mark(e) {
      error = e;
      draw();
    },
  };
}

const vars = (look, mode) =>
  Object.entries(looks[look]?.[mode]?.tokens ?? {})
    .map(([k, v]) => `${k}:${v};`)
    .join("") + `color-scheme:${mode};`;

export function preview() {
  const frame = h("iframe", "pg-frame");
  frame.title = "preview";
  const box = h("div", "pg-stage", frame);
  const cap = h("p", "pg-cap");
  const el = h("div", "pg-preview", box, cap);
  let model = null;
  let state = { look: "default", mode: "light", width: 1440 };
  const ready = new Promise((ok) => {
    frame.addEventListener("load", ok, { once: true });
    frame.srcdoc = `<!doctype html><html><head><meta charset=utf-8><link rel=stylesheet href="../../../web/dist/blocks.css"><style id=look></style><style>html,body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}main{padding:16px}</style></head><body><main></main></body></html>`;
  });
  const ctx = {
    screen: "play",
    act: async () => false,
    tap: () => {},
    open: new Set(),
    theme: plain,
    store: { get: () => null, put: () => {} },
    held: new Map(),
    view: new Map(),
  };
  const fit = () => {
    const d = frame.contentDocument;
    if (!d?.body) return;
    const avail = box.clientWidth;
    const k = Math.min(1, avail / state.width);
    const tall = d.documentElement.scrollHeight;
    frame.style.width = `${state.width}px`;
    frame.style.height = `${tall}px`;
    frame.style.scale = String(k);
    frame.style.marginLeft = k < 1 ? "0" : `${Math.floor((avail - state.width) / 2)}px`;
    box.style.height = `${Math.ceil(tall * k)}px`;
    cap.textContent = k < 1 ? `${state.width} wide, shown at ${Math.round(k * 100)}%` : `${state.width} wide, actual size`;
  };
  const draw = async () => {
    await ready;
    const d = frame.contentDocument;
    d.getElementById("look").textContent = `:root{${vars(state.look, state.mode)}}`;
    if (model) {
      const e = render(model, ctx);
      const main = d.querySelector("main");
      main.replaceChildren(...(e ? [d.adoptNode(e)] : []));
    }
    requestAnimationFrame(fit);
    fit();
  };
  new ResizeObserver(fit).observe(box);
  return {
    el,
    ready,
    show(m) {
      model = m;
      return draw();
    },
    set(s) {
      state = { ...state, ...s };
      return draw();
    },
    get state() {
      return state;
    },
  };
}

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function pack(text) {
  const min = JSON.stringify(JSON.parse(text));
  const s = new Blob([min]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return b64(new Uint8Array(await new Response(s).arrayBuffer()));
}

export async function unpack(hash) {
  const s = new Blob([unb64(hash)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.stringify(JSON.parse(await new Response(s).text()), null, 2);
}

export function seg(label, opts, now, pick) {
  const g = h("div", "pg-seg", label ? h("span", "pg-seg__label", label) : null);
  g.setAttribute("role", "group");
  g.setAttribute("aria-label", label || "tabs");
  for (const [v, text] of opts) {
    const b = h("button", "b b-button", h("span", null, text));
    b.type = "button";
    b.setAttribute("aria-pressed", String(v === now));
    b.onclick = () => {
      for (const x of g.querySelectorAll("button")) x.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "true");
      pick(v);
    };
    g.append(b);
  }
  return g;
}

export { h };
