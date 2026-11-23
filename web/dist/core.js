// src/gen/hooks.ts
var hooks = {
  screen: { variant: null, parts: ["title", "badge", "actions"] },
  modal: { variant: "variant", parts: ["title"] },
  sheet: { variant: "variant", parts: ["title"] },
  section: { variant: null, parts: [] },
  list: { variant: null, parts: [] },
  row: { variant: "style", parts: ["title", "subtitle", "badge", "value", "figure", "actions"] },
  card: { variant: "kind", parts: ["title", "subtitle", "badge", "actions"] },
  choice: { variant: null, parts: [] },
  form: { variant: null, parts: [] },
  config: { variant: null, parts: [] },
  secret: { variant: null, parts: [] },
  run: { variant: null, parts: [] },
  button: { variant: "style", parts: [] },
  chips: { variant: null, parts: [] },
  stat: { variant: null, parts: ["value"] },
  text: { variant: "style", parts: [] },
  images: { variant: "size", parts: [] },
  web: { variant: null, parts: [] },
  diff: { variant: null, parts: [] },
  editor: { variant: null, parts: [] },
  scene: { variant: null, parts: [] },
  diagram: { variant: null, parts: ["title"] },
  composer: { variant: null, parts: [] },
  lines: { variant: null, parts: [] },
  prose: { variant: null, parts: [] },
  hero: { variant: null, parts: ["title", "subtitle", "actions"] },
  media: { variant: null, parts: [] },
  nav: { variant: null, parts: [] },
  island: { variant: null, parts: [] },
  table: { variant: null, parts: ["title"] },
  steps: { variant: null, parts: ["title"] },
  chart: { variant: null, parts: ["title"] },
  toast: { variant: null, parts: ["title"] },
  pages: { variant: null, parts: ["title"] },
  timeline: { variant: null, parts: ["title"] },
  import: { variant: null, parts: ["title"] },
  message: { variant: "role", parts: [] },
  tool: { variant: "state", parts: [] },
  sidebar: { variant: null, parts: [] },
  boxplot: { variant: null, parts: ["title"] },
  heat: { variant: null, parts: ["title"] },
  plot: { variant: null, parts: ["title"] }
};
var roles = { modal: "dialog", sheet: "dialog", section: "region", form: "form", config: "form", nav: "navigation", chart: "figure", plot: "figure", toast: "status", message: "article", sidebar: "navigation", heat: "figure", boxplot: "figure" };
var names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"];
var hosts = { screen: "blocks", modal: "blocks", sheet: "blocks", section: "blocks", card: "blocks", message: "blocks", list: "rows", scene: "lanes", row: "rounds", table: "rows" };
var walked = ["blocks", "rows", "buttons", "rounds", "lanes"];

// src/gen/schemes.ts
var defaultPair = {
  "dark": {
    "label": "Default dark",
    "color-scheme": "dark",
    "tokens": {
      "--bg": "#161616",
      "--card": "#1f1f1f",
      "--edge": "#3a3a3a",
      "--line": "#2a2a2a",
      "--scrim": "#00000099",
      "--fg": "#ececec",
      "--mute": "#a3a3a3",
      "--l": "#d6d6d6",
      "--link": "#d6d6d6",
      "--g": "#769672",
      "--a": "#c5a370",
      "--r": "#bb776e",
      "--p": "#a295bb",
      "--c": "#6da1a5",
      "--fk-l": "#d6d6d6",
      "--fk-p": "#b8abce",
      "--fk-c": "#8ab9bc",
      "--fk-g": "#9bb996",
      "--fk-a": "#d1b184"
    }
  },
  "light": {
    "label": "Default light",
    "color-scheme": "light",
    "tokens": {
      "--bg": "#f6f6f6",
      "--card": "#ffffff",
      "--edge": "#d0d0d0",
      "--line": "#e4e4e4",
      "--scrim": "#0000004d",
      "--fg": "#1c1c1c",
      "--mute": "#5e5e5e",
      "--l": "#3d3d3d",
      "--link": "#3d3d3d",
      "--g": "#547850",
      "--a": "#927236",
      "--r": "#a75953",
      "--p": "#74678e",
      "--c": "#3c797d",
      "--fk-l": "#3d3d3d",
      "--fk-p": "#64597c",
      "--fk-c": "#31666a",
      "--fk-g": "#456642",
      "--fk-a": "#775d2c"
    }
  }
};
var defaultStyle = {
  "--build": "200ms",
  "--dot": "var(--edge)",
  "--dot-gap": "16px",
  "--dot-size": "2px",
  "--ease": "cubic-bezier(0.2, 0, 0, 1)",
  "--enter": "160ms",
  "--radius": "0px",
  "--rise": "8px",
  "--seam": "2px",
  "--settle": "160ms",
  "--stagger": "40ms"
};
var rules = {
  type: { "default": ':root{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}', "mono": "", "serif": ":root{font-family:ui-serif,Georgia,Cambria,serif}" },
  surface: { "glass": "", "dashed": ":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl){border-style:dashed}", "solid": ":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl){border-width:2px}" },
  fills: { "tint": "", "outline": ".chips button.on,.spi.done .spm{background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)}", "solid": "" },
  marks: { "symbols": "", "text": '.spi.done .spm{width:auto;font-size:0}.spi.done .spm::after{content:"done";font-size:var(--fs-meta)}' },
  sections: { "title": "", "quiet": ".sh{font-size:var(--fs-meta);font-weight:400}" }
};
var curves = { "standard": "cubic-bezier(0.2, 0, 0, 1)", "calm": "cubic-bezier(0.4, 0, 0.2, 1)", "bouncy": "cubic-bezier(0.34, 1.3, 0.64, 1)" };
var cases = { "as-is": "none", "lower": "lowercase", "upper": "uppercase" };
var drawn = { "header": ".sec>.sh", "section": ":is(.sp,.pg,.scn)>.sh", "title": ":is(.ch>b,.rt)", "button": ".b-button>span", "chip": ".chips button>span", "picked": ".dgn.picked .dgl", "screen": ".tabh>.b-screen__title" };

// src/core/gesture.ts
var WORDS = ["reorder", "move", "stretch", "edit", "draw", "remove"];

// src/core/eval.ts
var own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
var rec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var UNKNOWN = { "?": null };
var PAIRS = { eq: 2, lt: 2, has: 2, add: 2, sub: 2, mul: 2, div: 2, pick: 3 };
var PATTERNS = ["filled", "email", "url", "number"];
function read(v) {
  if (Array.isArray(v)) return void 0;
  if (!rec(v)) return v;
  const keys = Object.keys(v);
  const k = keys[0] ?? "";
  const a = v[k];
  const one = (x) => x === void 0 ? UNKNOWN : { [k]: x };
  const list3 = (n) => {
    if (!Array.isArray(a) || n !== void 0 && a.length !== n) return UNKNOWN;
    const xs = a.map(read);
    return xs.includes(void 0) ? UNKNOWN : { [k]: xs };
  };
  if (keys.length !== 1) return UNKNOWN;
  if (k === "get") return typeof a === "string" ? v : UNKNOWN;
  if (k === "not" || k === "len") return one(read(a));
  if (k === "all" || k === "any" || k === "cat") return list3();
  if (own(PAIRS, k)) return list3(PAIRS[k]);
  if (k === "is" && rec(a) && typeof a["pattern"] === "string" && "value" in a) {
    const x = read(a["value"]);
    return x === void 0 ? UNKNOWN : { is: { value: x, pattern: a["pattern"] } };
  }
  return UNKNOWN;
}
function sound(e) {
  if (!rec(e)) return true;
  const [k = "", a] = Object.entries(e)[0] ?? [];
  if (k === "?") return false;
  if (k === "is") return rec(a) && PATTERNS.includes(String(a["pattern"])) && sound(a["value"]);
  return Array.isArray(a) ? a.every(sound) : k === "get" || sound(a);
}
var flag = (l) => l === null ? false : typeof l === "boolean" ? l : void 0;
var or = (b) => b ?? null;
var num = (f) => Number.isFinite(f) ? f : null;
var text = (l) => l === null ? "" : String(l);
var blank = /\p{White_Space}/u;
var trim = (s) => s.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
var points = (s) => Array.from(s, (c) => c.codePointAt(0) ?? 0);
function before(a, b) {
  const [x, y] = [points(a), points(b)];
  const i = x.findIndex((c, j) => c !== y[j]);
  return i < 0 ? x.length < y.length : i < y.length && (x[i] ?? 0) < (y[i] ?? 0);
}
function email(s) {
  const at2 = s.indexOf("@");
  if (at2 < 0) return false;
  const [user, host] = [s.slice(0, at2), s.slice(at2 + 1)];
  const dot = host.indexOf(".");
  return user !== "" && dot > 0 && dot + 1 < host.length && !host.endsWith(".") && !host.includes("@") && !blank.test(s);
}
function url(s) {
  const rest = s.startsWith("https://") ? s.slice(8) : s.startsWith("http://") ? s.slice(7) : void 0;
  return rest !== void 0 && rest !== "" && !rest.startsWith("/") && !blank.test(s);
}
function is(l, p) {
  if (p === "filled") return typeof l === "string" ? trim(l) !== "" : l !== null;
  if (p === "number" && typeof l === "number") return true;
  if (typeof l !== "string") return null;
  const t = trim(l);
  if (p === "number") return /^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$/.test(t) && Number.isFinite(Number(t));
  return p === "email" ? email(l) : p === "url" ? url(l) : null;
}
function ev(e, s) {
  if (!rec(e)) return e === null || typeof e === "boolean" || typeof e === "number" || typeof e === "string" ? e : null;
  const [k = "", a] = Object.entries(e)[0] ?? [];
  const xs = (Array.isArray(a) ? a : [a]).map((x2) => k === "is" ? null : ev(x2, s));
  const [x = null, y = null] = xs;
  const n = typeof x === "number" && typeof y === "number" ? { x, y } : void 0;
  const flags = xs.map(flag);
  switch (k) {
    case "get":
      return typeof a === "string" && own(s, a) ? s[a] ?? null : null;
    case "not":
      return or(flag(x) === void 0 ? void 0 : !flag(x));
    case "all":
      return or(flags.includes(void 0) ? void 0 : flags.every(Boolean));
    case "any":
      return or(flags.includes(void 0) ? void 0 : flags.some(Boolean));
    case "eq":
      return x === y;
    case "lt":
      return n ? n.x < n.y : typeof x === "string" && typeof y === "string" ? before(x, y) : null;
    case "len":
      return typeof x === "string" ? points(x).length : null;
    case "has":
      return typeof x === "string" && typeof y === "string" ? x.includes(y) : null;
    case "is":
      return rec(a) ? is(ev(a["value"], s), a["pattern"]) : null;
    case "add":
      return n ? num(n.x + n.y) : null;
    case "sub":
      return n ? num(n.x - n.y) : null;
    case "mul":
      return n ? num(n.x * n.y) : null;
    case "div":
      return n ? num(n.x / n.y) : null;
    case "cat":
      return xs.map(text).join("");
    case "pick":
      return flags[0] === void 0 ? null : xs[flags[0] ? 1 : 2] ?? null;
  }
  return null;
}
function evaluate(e, s) {
  const x = read(e);
  return x === void 0 ? null : ev(x, s);
}
function holds(e, s) {
  const x = e == null ? void 0 : read(e);
  return x === void 0 || !sound(x) ? void 0 : ev(x, s) === true;
}
var list = (v) => Array.isArray(v) ? v.filter(rec) : [];
var kids = (b) => [...list(b["blocks"]), ...list(b["rows"]), ...list(b["buttons"]), ...list(b["rounds"]).flatMap((r) => list(r["blocks"]))];
var named = (b) => list(b["fields"]).filter((f) => typeof f["name"] === "string");
var actionOf = (a) => {
  const k = a["action"] ?? (rec(a["tap"]) ? a["tap"]["action"] : void 0);
  return typeof k === "string" ? k : void 0;
};
var acts = (b) => {
  const all = [...list(b["actions"]), ...list(b["swipe"]), ...list(b["menu"]), ...[b["button"], ...WORDS.map((w) => b[w])].filter(rec)];
  return [...all, ...all.flatMap((a) => list(a["menu"]))];
};
var plain = (v) => v === null || typeof v === "boolean" || typeof v === "number" || typeof v === "string" ? v : null;
var lit = (_field, held2) => Array.isArray(held2) ? held2.length || null : plain(held2);
function start(screen2) {
  const s = {};
  const seed = (b) => {
    for (const f of named(b)) s[String(f["name"])] = lit(f, f["value"] ?? f["files"] ?? (rec(f["file"]) ? [f["file"]] : null));
    if (b["type"] === "chips" && typeof b["name"] === "string") s[b["name"]] = plain(Array.isArray(b["selected"]) ? b["selected"][0] : null);
    kids(b).forEach(seed);
  };
  if (rec(screen2)) {
    for (const [k, v] of Object.entries(rec(screen2["state"]) ? screen2["state"] : {})) s[k] = plain(v);
    seed(screen2);
  }
  return s;
}
function view(screen2, s) {
  const v = { hidden: /* @__PURE__ */ new Set(), disabled: /* @__PURE__ */ new Set(), says: {}, acts: /* @__PURE__ */ new Set(), values: {} };
  const walk = (b) => {
    const id = typeof b["id"] === "string" ? b["id"] : void 0;
    if (holds(b["show"], s) === false) {
      if (id !== void 0) v.hidden.add(id);
      return;
    }
    if (holds(b["enabled"], s) === false && id !== void 0) v.disabled.add(id);
    let failing = false;
    for (const f of named(b)) {
      const name = String(f["name"]);
      if (holds(f["show"], s) === false) {
        v.hidden.add(name);
        continue;
      }
      if (holds(f["enabled"], s) === false) v.disabled.add(name);
      const bad = list(f["checks"]).find((c) => typeof c["say"] === "string" && holds(c["ok"], s) === false);
      if (bad) {
        failing = true;
        v.says[name] = String(bad["say"]);
      }
    }
    if (failing && id !== void 0) v.disabled.add(id);
    for (const a of acts(b)) {
      const k = actionOf(a);
      if (k !== void 0 && holds(a["enabled"], s) === false) v.acts.add(k);
    }
    for (const i of [b, ...list(b["items"])]) {
      const k = rec(i["value"]) ? i["value"]["get"] : void 0;
      if (typeof k === "string") v.values[k] = text(own(s, k) ? s[k] ?? null : null);
    }
    kids(b).forEach(walk);
  };
  if (rec(screen2)) walk(screen2);
  return v;
}

// src/core/tree.ts
var isBlk = (v) => typeof v === "object" && v !== null;
var blks = (v) => Array.isArray(v) ? v.filter(isBlk) : [];
var named2 = (b, t) => String(names.map((k) => b[k]).find((v) => typeof v === "string" && v) ?? (typeof b["id"] === "string" && b["id"] ? b["id"] : t));
var isLit = (v) => v === null || ["boolean", "number", "string"].includes(typeof v);
var isExpr = (v) => v !== void 0 && !Array.isArray(v);
var str = (b, k) => typeof b[k] === "string" && b[k] !== "" ? String(b[k]) : null;
function under(b, drawn2) {
  if (drawn2 === "fallback") return Array.isArray(b["blocks"]) ? b["blocks"] : [];
  if (drawn2 === "hidden") return [];
  const lists = ["blocks", b["type"] === "table" ? "" : "rows", "buttons"].flatMap((k) => Array.isArray(b[k]) ? b[k] : []);
  return lists.concat(blks(b["rounds"]).flatMap((r) => Array.isArray(r["blocks"]) ? r["blocks"] : []));
}
function role(b, kind) {
  const tap = isBlk(b["tap"]) ? b["tap"] : null;
  const wrapped = ["rounds", "swipe"].some((k) => Array.isArray(b[k]) && b[k].length > 0);
  if ((kind === "button" || kind === "row") && tap?.["url"] != null && !wrapped) return "link";
  if (kind === "row" && tap && !wrapped || kind === "button" || kind === "editor") return "button";
  if ((kind === "modal" || kind === "sheet") && b["variant"] === "alert") return "alertdialog";
  return roles[kind] ?? "group";
}
function node(v, kinds3, state) {
  const b = isBlk(v) ? v : {};
  const kind = str(b, "type") ?? "";
  const field = Object.entries(hooks).find(([k]) => k === kind)?.[1].variant;
  const variant = field ? str(b, field) : null;
  const shown2 = "show" in b && isExpr(b["show"]) ? evaluate(b["show"], state) : true;
  const off = shown2 === null || shown2 === false;
  const drawn2 = off ? "hidden" : kinds3.includes(kind) ? "native" : "fallback";
  return { kind, id: str(b, "id"), variant, drawn: drawn2, role: role(b, kind), name: named2(b, kind), children: under(b, drawn2).map((c) => node(c, kinds3, state)) };
}
function tree(screen2, kinds3, state) {
  const b = screen2;
  const own2 = {};
  for (const [k, v] of Object.entries(isBlk(b["state"]) ? b["state"] : {})) if (isLit(v)) own2[k] = v;
  return node(b, kinds3, state ?? own2);
}
var who = (n) => `${n.kind}${n.id ? `#${n.id}` : ""}`;
function expect(got, want, at2 = "tree", out = []) {
  if (!got || want.kind !== got.kind || (want.id ?? null) !== (got.id ?? null) || want.drawn !== got.drawn) {
    out.push(`${at2}: drew ${got ? `${who(got)} ${got.drawn}` : "nothing"}, expected ${who(want)} ${want.drawn}`);
    return out;
  }
  const here = `${at2}/${who(got)}`;
  if (want.role !== got.role || want.name !== got.name) out.push(`${here}: drew ${got.role} "${got.name}", expected ${want.role} "${want.name}"`);
  if (want.children.length !== got.children.length) out.push(`${here}: ${got.children.length} children, expected ${want.children.length}`);
  want.children.forEach((c, i) => expect(got.children[i], c, here, out));
  return out;
}

// src/core/text.ts
var GLYPH = { working: "\u25CF", needs: "!", fail: "\u2717", done: "\u2713", merged: "\u2713", idle: "\u25CB" };
var WORD = { working: "working", needs: "needs you", fail: "failed", done: "done", merged: "merged", idle: "idle" };
var TONE = { working: "g", needs: "r", fail: "r", done: "mute", idle: "mute", merged: "g" };
var figured = (s) => ({ glyph: GLYPH[s] ?? "\xB7", word: WORD[s] ?? s, tone: TONE[s] ?? "mute" });
function value(v) {
  if (isBlk(v) && "until" in v) return String(v["label"] ?? "").replace("{rel}", `${Math.max(0, Math.round((Date.parse(String(v["until"])) - Date.now()) / 6e4))}m`);
  if (isBlk(v) && "since" in v) {
    const s = Math.max(0, (Date.now() - Date.parse(String(v["since"]))) / 1e3);
    if (v["label"] != null) return String(v["label"]).replace("{}", s < 120 ? `${Math.floor(s)}s` : s < 7200 ? `${Math.floor(s / 60)}m` : s < 172800 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`);
    return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d`;
  }
  return String(v ?? "");
}

// src/core/gate.ts
var RAD = Math.PI / 180;
var mid = (a, b) => (a + b) / 2;
var lin = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
var lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
var ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
var over = ([r, g, b], [br, bg, bb], p) => {
  const mix = (x, y) => x * p + y * (1 - p);
  return [mix(r, br), mix(g, bg), mix(b, bb)];
};
var rgb = (hex) => {
  const n = parseInt(hex.slice(1, 7), 16) || 0;
  return [n >> 16, n >> 8 & 255, n & 255];
};
function lab(c) {
  const [r, g, b] = [lin(c[0]), lin(c[1]), lin(c[2])];
  const dot = ([x, y, z]) => x * r + y * g + z * b;
  const [cx, cy, cz] = [dot([0.4124, 0.3576, 0.1805]), dot([0.2126, 0.7152, 0.0722]), dot([0.0193, 0.1192, 0.9505])];
  const curve = (t) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  const [fx, fy, fz] = [curve(cx / 0.95047), curve(cy), curve(cz / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function de(c1, c2) {
  const [[l1, a1, b1], [l2, a2, b2]] = [lab(c1), lab(c2)];
  const c = mid(Math.hypot(a1, b1), Math.hypot(a2, b2));
  const g = 0.5 * (1 - Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7)));
  const [ap1, ap2] = [a1 * (1 + g), a2 * (1 + g)];
  const [cp1, cp2] = [Math.hypot(ap1, b1), Math.hypot(ap2, b2)];
  const h = (b, a) => {
    const v = Math.atan2(b, a) / RAD;
    return v < 0 ? v + 360 : v;
  };
  const [h1, h2, dl, dc] = [h(b1, ap1), h(b2, ap2), l2 - l1, cp2 - cp1];
  const dh = cp1 * cp2 === 0 ? 0 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 < -180 ? h2 - h1 + 360 : h2 - h1;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(dh * RAD / 2);
  const [lm, cm] = [mid(l1, l2), mid(cp1, cp2)];
  const hm = cp1 * cp2 === 0 ? h1 + h2 : Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : mid(h1, h2);
  const t = 1 - 0.17 * Math.cos((hm - 30) * RAD) + 0.24 * Math.cos(2 * hm * RAD) + 0.32 * Math.cos((3 * hm + 6) * RAD) - 0.2 * Math.cos((4 * hm - 63) * RAD);
  const sl = 1 + 0.015 * (lm - 50) ** 2 / Math.sqrt(20 + (lm - 50) ** 2);
  const [sc, sh] = [1 + 0.045 * cm, 1 + 0.015 * cm * t];
  const rt = -2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * RAD);
  return Math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * (dc / sc) * (dH / sh));
}
function gate(s, fills) {
  const c = (k) => rgb(s.tokens[k]);
  const checks = [];
  const [bg, r, a] = [c("--bg"), c("--r"), c("--a")];
  const needs = ["the needs-you card", over(r, bg, 0.15)];
  const tints = [["--r", ...needs], ["--r", "a red group header", over(r, bg, 0.12)], ["--a", "an amber group header", over(a, bg, 0.12)]];
  const text5 = ["--fg", "--mute", "--l", "--link", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a"];
  const states = ["--g", "--a", "--r"];
  for (const b of ["--bg", "--card"]) {
    for (const k of text5) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 4.5 });
    for (const k of states) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 3 });
  }
  checks.push({ what: "--bg on --l", got: ratio(bg, c("--l")), min: 4.5 });
  if (fills === "solid") {
    for (const k of ["--link", "--g", "--a", "--r", "--p", "--c"]) checks.push({ what: `--bg on ${k}`, got: ratio(bg, c(k)), min: 4.5 });
  }
  for (const k of ["--fg", "--mute", "--l"]) checks.push({ what: `${k} on ${needs[0]}`, got: ratio(c(k), needs[1]), min: 4.5 });
  for (const [k, on, tint] of tints) checks.push({ what: `${k} on ${on}`, got: ratio(c(k), tint), min: 3 });
  const pairs = [["--g", "--a"], ["--a", "--r"], ["--g", "--r"]];
  for (const x of ["--l", "--link"]) pairs.push(...states.map((y) => [x, y]));
  for (const [x, y] of pairs) checks.push({ what: `\u0394E2000 ${x} \u2194 ${y}`, got: de(c(x), c(y)), min: 20 });
  return checks.filter((m) => m.got < m.min);
}

// src/core/look.ts
var passed = /* @__PURE__ */ Symbol("look");
function gated(pair) {
  const misses = ["light", "dark"].flatMap((m) => gate(pair[m], "tint").map((x) => `${m}: ${x.what} is ${x.got.toFixed(2)}, under ${x.min}`));
  if (misses.length) throw new Error(`the look fails the gate:
${misses.join("\n")}`);
  return { light: pair.light, dark: pair.dark, [passed]: true };
}
var quote = (t) => `"${t.replace(/[\\"]/g, "\\$&")}"`;
var isAxis = (k) => k in rules;
var rule = (s, k) => {
  const t = rules[k];
  const v = s[k];
  return v === void 0 ? "" : t[v] ?? "";
};
function axes(s) {
  let out = Object.keys(rules).filter(isAxis).map((k) => rule(s, k)).join("");
  for (const [role2, at2] of Object.entries(drawn)) {
    const l = s.labels?.[role2];
    if (!l) continue;
    out += `${at2}{text-transform:${cases[l.case ?? "as-is"]}}`;
    if (l.prefix) out += `${at2}::before{content:${quote(l.prefix)}}`;
    if (l.suffix) out += `${at2}::after{content:${quote(l.suffix)}}`;
  }
  return out;
}
var vars = (t) => Object.entries(t).map(([k, v]) => `${k}:${v}`);
function css(look, style = {}) {
  if ("tokens" in look) return `:root{${vars(look.tokens).join(";")};color-scheme:${look["color-scheme"]}}`;
  const all = (t) => vars(t).map((d) => `${d};`).join("");
  const head = `color-scheme:light dark;--space:${style.space ?? 1};--motion:${style.motion ?? 1};`;
  const tiles2 = { ...defaultStyle, "--radius": `${(style.radius ?? 0) * 12}px`, "--ease": curves[style.easing ?? "standard"] };
  return `:root{${head}${all(tiles2)}${all(look.light.tokens)}}@media (prefers-color-scheme: dark){:root{${all(look.dark.tokens)}}}${axes(style)}`;
}
var tiles = `:where(:root){${vars(defaultStyle).join(";")}}`;
var choose = (setting, dark, schemes = {}) => (setting !== null && Object.prototype.hasOwnProperty.call(schemes, setting) ? schemes[setting] : void 0) ?? defaultPair[dark ? "dark" : "light"];

// src/gen/builders.ts
var screen = (fields) => ({ type: "screen", ...fields });
var modal = (fields) => ({ type: "modal", ...fields });
var sheet = (fields) => ({ type: "sheet", ...fields });
var section = (fields) => ({ type: "section", ...fields });
var list2 = (fields) => ({ type: "list", ...fields });
var row = (fields) => ({ type: "row", ...fields });
var card = (fields) => ({ type: "card", ...fields });
var choice = (fields) => ({ type: "choice", ...fields });
var form = (fields) => ({ type: "form", ...fields });
var config = (fields) => ({ type: "config", ...fields });
var secret = (fields) => ({ type: "secret", ...fields });
var run = (fields) => ({ type: "run", ...fields });
var button = (fields) => ({ type: "button", ...fields });
var chips = (fields) => ({ type: "chips", ...fields });
var stat = (fields) => ({ type: "stat", ...fields });
var text2 = (fields) => ({ type: "text", ...fields });
var images = (fields) => ({ type: "images", ...fields });
var web = (fields) => ({ type: "web", ...fields });
var diff = (fields) => ({ type: "diff", ...fields });
var editor = (fields) => ({ type: "editor", ...fields });
var scene = (fields) => ({ type: "scene", ...fields });
var diagram = (fields) => ({ type: "diagram", ...fields });
var composer = (fields) => ({ type: "composer", ...fields });
var lines = (fields) => ({ type: "lines", ...fields });
var prose = (fields) => ({ type: "prose", ...fields });
var hero = (fields) => ({ type: "hero", ...fields });
var media = (fields) => ({ type: "media", ...fields });
var nav = (fields) => ({ type: "nav", ...fields });
var island = (fields) => ({ type: "island", ...fields });
var table = (fields) => ({ type: "table", ...fields });
var steps = (fields) => ({ type: "steps", ...fields });
var chart = (fields) => ({ type: "chart", ...fields });
var toast = (fields) => ({ type: "toast", ...fields });
var pages = (fields) => ({ type: "pages", ...fields });
var timeline = (fields) => ({ type: "timeline", ...fields });
var import_ = (fields) => ({ type: "import", ...fields });
var message = (fields) => ({ type: "message", ...fields });
var tool = (fields) => ({ type: "tool", ...fields });
var sidebar = (fields) => ({ type: "sidebar", ...fields });
var boxplot = (fields) => ({ type: "boxplot", ...fields });
var heat = (fields) => ({ type: "heat", ...fields });
var plot = (fields) => ({ type: "plot", ...fields });
var expr = {
  get: (v) => ({ get: v }),
  not: (v) => ({ not: v }),
  all: (...v) => ({ all: v }),
  any: (...v) => ({ any: v }),
  eq: (...v) => ({ eq: v }),
  lt: (...v) => ({ lt: v }),
  len: (v) => ({ len: v }),
  has: (...v) => ({ has: v }),
  is: (v) => ({ is: v }),
  add: (...v) => ({ add: v }),
  sub: (...v) => ({ sub: v }),
  mul: (...v) => ({ mul: v }),
  div: (...v) => ({ div: v }),
  cat: (...v) => ({ cat: v }),
  pick: (...v) => ({ pick: v })
};

// src/core/kind/chart.ts
var round = (v) => Math.floor(v + 0.5);
function decimals(x) {
  for (let d = 0; d < 6; d++) {
    const v = x * Math.pow(10, d);
    if (Math.abs(v - round(v)) < 1e-6) return d;
  }
  return 6;
}
function fixed(v, d) {
  const p = Math.pow(10, d);
  const n = round(v * p);
  const whole = Math.floor(n / p);
  const out = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return d > 0 ? `${out}.${String(n - whole * p).padStart(d, "0")}` : out;
}

// src/core/kind/plot.ts
function grow(series, op) {
  const s = series.find((t) => t.name === op.series);
  const drop = op.drop ?? 0;
  if (!s || drop > s.x.length || op.x.length !== op.y.length) return void 0;
  s.x.splice(0, drop);
  s.y.splice(0, drop);
  for (const v of op.x) s.x.push(v);
  for (const v of op.y) s.y.push(v);
  return series;
}
function signed(v, d) {
  const s = fixed(Math.abs(v), d);
  return v < 0 && /[1-9]/.test(s) ? `-${s}` : s;
}
var shown = (v) => signed(v, Math.min(decimals(v), 2));
var unit = (text5, u) => u ? `${text5} ${u}` : text5;
function fallback(p) {
  const u = p.y?.unit ?? "";
  const lines2 = p.series.flatMap((s) => s.y.length ? [`${s.name} ${unit(shown(s.y[s.y.length - 1] ?? 0), u)}`] : []);
  return lines2.length ? { title: p.title, subtitle: lines2.join(", ") } : { title: p.title };
}

// src/core/kind/prose.ts
var tail = (spans) => spans?.[spans.length - 1];
function grow2(parts, op) {
  if (op.keep != null && op.keep > parts.length) return void 0;
  const out = [...parts.slice(0, op.keep ?? parts.length), ...structuredClone(op.parts ?? [])];
  if (!op.text) return out;
  const last = out[out.length - 1];
  if (!last || last.part === "rule") return void 0;
  if (last.part === "code") {
    out[out.length - 1] = { ...last, text: last.text + op.text };
    return out;
  }
  const spans = last.part === "list" ? last.items[last.items.length - 1] : last.spans;
  const end = tail(spans);
  if (!spans || !end) return void 0;
  const grown = [...spans.slice(0, -1), { ...end, text: end.text + op.text }];
  out[out.length - 1] = last.part === "list" ? { ...last, items: [...last.items.slice(0, -1), grown] } : { ...last, spans: grown };
  return out;
}

// src/core/apply.ts
var isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function locate(node2, id) {
  if (node2["id"] === id) return "root";
  for (const key of walked) {
    const list3 = node2[key];
    if (!Array.isArray(list3)) continue;
    for (let at2 = 0; at2 < list3.length; at2++) {
      const x = list3[at2];
      if (!isRec(x)) continue;
      if (x["id"] === id) return { list: list3, at: at2 };
      const deeper = locate(x, id);
      if (deeper && deeper !== "root") return deeper;
    }
  }
  return void 0;
}
function get(root, id) {
  const s = locate(root, id);
  const v = s === "root" ? root : s?.list[s.at];
  return isRec(v) ? v : void 0;
}
function place(root, into, child, before2, after) {
  const host = get(root, into);
  const key = host && typeof host["type"] === "string" ? hosts[host["type"]] : void 0;
  if (!host || !key) return false;
  const list3 = host[key] ?? (host[key] = []);
  if (!Array.isArray(list3)) return false;
  const find = (id) => id ? list3.findIndex((x) => isRec(x) && x["id"] === id) : -1;
  const b = find(before2);
  const a = find(after);
  list3.splice(b >= 0 ? b : a >= 0 ? a + 1 : list3.length, 0, child);
  return true;
}
function apply(screen2, ops) {
  let out = structuredClone(screen2);
  for (const op of ops) {
    const root = out;
    switch (op.op) {
      case "merge": {
        const t = get(root, op.id);
        if (!t) return void 0;
        for (const [k, v] of Object.entries(op.fields)) if (v === null) delete t[k];
        else t[k] = v;
        break;
      }
      case "replace": {
        const s = locate(root, op.id);
        if (!s) return void 0;
        if (s !== "root") s.list[s.at] = structuredClone(op.block);
        else if ("type" in op.block) out = structuredClone(op.block);
        else return void 0;
        break;
      }
      case "remove":
      case "move": {
        const s = locate(root, op.id);
        if (!s || s === "root") return void 0;
        const [b] = s.list.splice(s.at, 1);
        if (op.op === "move" && !place(root, op.into, b, op.before)) return void 0;
        break;
      }
      case "insert":
        if (!place(root, op.into, structuredClone(op.block), op.before, op.after)) return void 0;
        break;
      case "screen":
        out = structuredClone(op.screen);
        break;
      case "append": {
        const t = get(root, op.id);
        const parts = t?.["type"] === "prose" && Array.isArray(t["parts"]) ? grow2(t["parts"], op) : void 0;
        if (!t || !parts) return void 0;
        t["parts"] = parts;
        break;
      }
      case "points": {
        const t = get(root, op.id);
        const series = t?.["type"] === "plot" && Array.isArray(t["series"]) ? grow(t["series"], op) : void 0;
        if (!t || !series) return void 0;
        t["series"] = series;
        break;
      }
      case "badge":
        if (root["type"] === "screen") root["badge"] = op.count;
        break;
      default:
        if (op.op !== "dot") return void 0;
    }
  }
  return out;
}

// src/core/kind/message.ts
var glyph = (state) => ({ running: "\u21BB", done: "\u2713", failed: "\u2715" })[state] ?? "\u2022";
var roleWord = (role2) => ["agent", "owner", "system"].includes(role2) ? role2 : "agent";
var ext = (name) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(dot + 1), name.slice(0, dot)] : ["", name];
};
var initial = (name) => [...name.trim()][0] ?? "";

// src/core/kind/sidebar.ts
var sideTitle = (b) => [...b.groups.flatMap((g) => g.links.flatMap((l) => [l, ...l.children ?? []])), ...b.footer ?? []].find((l) => l.current)?.label ?? b.brand?.label ?? b.label;
var sideIcon = (l) => [l.icon || l.label.slice(0, 1).toUpperCase(), /^[A-Z]{2}$/.test(l.icon ?? "")];
var sideCount = (b) => [b.count > 99 ? "99+" : String(b.count), `${b.count} ${b.tone === "bad" ? "need attention" : "new"}`];

// src/core/kind/boxplot.ts
var close = (v) => Math.abs(v - Math.round(v)) < 1e-6;
var decimals2 = (v) => [0, 1].find((d) => close(v * 10 ** d)) ?? 2;
var values = (x) => [x.min, x.q1, x.median, x.q3, x.max, ...x.outliers ?? []];
function places(p) {
  return p.boxes.reduce((d, x) => Math.max(d, ...values(x).map(decimals2)), 0);
}
function boxFallback(p) {
  const d = places(p), u = p.unit ? ` ${p.unit}` : "";
  const f = { title: p.title };
  if (p.boxes.length) f.subtitle = p.boxes.map((x) => `${x.name} median ${x.median.toFixed(d)}${u}`).join(", ");
  if (p.tap) f.tap = p.tap;
  return f;
}

// src/core/table.ts
var SIGN = { THB: "\u0E3F", USD: "$", EUR: "\u20AC" };
var at = (r, id) => r.cells[id];
var unit2 = (c) => c.kind === "money" ? c.currency ? SIGN[c.currency] ?? c.currency : null : c.unit;
var grouped = (v, d, fixed2) => v.toLocaleString("en-US", { minimumFractionDigits: fixed2 ? d : 0, maximumFractionDigits: d });
var number = (c, v) => c.kind === "money" ? grouped(v, 2, true) : grouped(v, c.digits ?? 2, false);
function total(c, rows) {
  const cells = rows.map((r) => at(r, c.id)).filter((v) => v !== void 0);
  const vs = cells.filter((v) => typeof v === "number");
  const sum = vs.reduce((a, v) => a + v, 0);
  if (!c.total) return null;
  if (c.total === "count") return ["count", String(cells.length)];
  if (!vs.length) return ["", "\u2014"];
  return c.total === "avg" ? ["avg", grouped(sum / vs.length, 1, false)] : ["", number(c, sum)];
}

// src/core/kind/table.ts
var MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
var THAI = "\u0E21.\u0E04. \u0E01.\u0E1E. \u0E21\u0E35.\u0E04. \u0E40\u0E21.\u0E22. \u0E1E.\u0E04. \u0E21\u0E34.\u0E22. \u0E01.\u0E04. \u0E2A.\u0E04. \u0E01.\u0E22. \u0E15.\u0E04. \u0E1E.\u0E22. \u0E18.\u0E04.".split(" ");
function worked(b, r) {
  if (!b.calc || r.group) return r;
  const cells = { ...r.cells };
  for (const c of b.columns) {
    const e = b.calc[c.id];
    if (e == null) continue;
    const s = Object.fromEntries(Object.entries(cells).map(([k, v2]) => [k, typeof v2 !== "object" ? v2 : typeof v2.text === "string" || typeof v2.text === "number" ? v2.text : null]));
    const v = evaluate(e, s);
    if (typeof v === "number" || typeof v === "string") cells[c.id] = v;
    else delete cells[c.id];
  }
  return { ...r, cells };
}

// src/core/built.ts
var checked = /* @__PURE__ */ Symbol("built");
var KINDS = Object.keys(hooks);
var LISTS = ["blocks", "rows", "buttons"];
var DRAWN = ["row", "text", "island"];
var NAMED = ["title", "label", "header", "question", "name", "file", "command", "source", "src"];
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isTable = (o) => o["type"] === "table" && Array.isArray(o["columns"]) && Array.isArray(o["rows"]);
var isPlot = (o) => o["type"] === "plot" && typeof o["title"] === "string" && Array.isArray(o["series"]);
var isBoxplot = (o) => o["type"] === "boxplot" && typeof o["title"] === "string" && Array.isArray(o["boxes"]);
var text3 = (o, k) => typeof o[k] === "string" && o[k] !== "" ? o[k] : void 0;
function tabled(t) {
  const rows = t.rows.filter((r) => !r.group).map((r) => worked(t, r));
  const n = rows.length;
  const sum = t.columns.find((c) => c.total === "sum");
  const v = sum && total(sum, rows);
  const count = `${n} row${n === 1 ? "" : "s"}`;
  const sub = sum && v ? `${count} \xB7 total ${sum.label.toLowerCase()} ${unit2(sum) ?? ""}${v[1]}` : count;
  return { title: t.title ?? "Table", subtitle: sub };
}
function plain2(o, kind) {
  if (isTable(o)) return tabled(o);
  if (isPlot(o)) return fallback(o);
  if (isBoxplot(o)) return boxFallback(o);
  const subtitle = text3(o, "subtitle");
  const f = { title: NAMED.map((k) => text3(o, k)).find((t) => t !== void 0) ?? kind };
  if (subtitle !== void 0) f.subtitle = subtitle;
  if (isObj(o["tap"])) f.tap = o["tap"];
  return f;
}
var copy = (v) => isObj(v) ? fill({ ...v }) : v;
var each = (l) => Array.isArray(l) ? l.map(copy) : l;
function fill(o) {
  const kind = typeof o["type"] === "string" ? o["type"] : "";
  if (KINDS.includes(kind) && !DRAWN.includes(kind) && o["fallback"] === void 0) o["fallback"] = plain2(o, kind);
  for (const k of LISTS) if (k in o) o[k] = each(o[k]);
  if (Array.isArray(o["rounds"])) o["rounds"] = o["rounds"].map((r) => isObj(r) && "blocks" in r ? { ...r, blocks: each(r["blocks"]) } : r);
  return o;
}
function built(screen2) {
  const out = { ...screen2, [checked]: true };
  fill(out);
  return out;
}

// src/core/share.ts
var isObj2 = (v) => typeof v === "object" && v !== null;
function share(prev, next) {
  if (!isObj2(prev) || !isObj2(next) || Array.isArray(prev) !== Array.isArray(next)) return next;
  const out = next;
  const keys = Object.keys(next);
  let same = keys.length === Object.keys(prev).length;
  for (const k of keys) {
    const v = share(prev[k], next[k]);
    if (v !== next[k]) out[k] = v;
    same = same && k in prev && v === prev[k];
  }
  return same ? prev : next;
}

// src/core/nonce.ts
var nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");

// src/gen/shapes.ts
var kinds = {
  "boxplot": "Boxplot",
  "button": "Button",
  "card": "Card",
  "chart": "Chart",
  "chips": "Chips",
  "choice": "Choice",
  "composer": "Composer",
  "config": "Form",
  "diagram": "Diagram",
  "diff": "Diff",
  "editor": "Editor",
  "form": "Form",
  "heat": "Heat",
  "hero": "Hero",
  "images": "Images",
  "import": "Import",
  "island": "Island",
  "lines": "Lines",
  "list": "List",
  "media": "Media",
  "message": "Message",
  "modal": "Modal",
  "nav": "Nav",
  "pages": "Pages",
  "plot": "Plot",
  "prose": "Prose",
  "row": "Row",
  "run": "Run",
  "scene": "Scene",
  "screen": "Screen",
  "secret": "Secret",
  "section": "Section",
  "sheet": "Modal",
  "sidebar": "Sidebar",
  "stat": "Stat",
  "steps": "Steps",
  "table": "Table",
  "text": "Text",
  "timeline": "Timeline",
  "toast": "Toast",
  "tool": "Tool",
  "web": "Web"
};
var defs = {
  "Accept": {
    "anyOf": [
      {
        "enum": [
          "image",
          "pdf",
          "sheet"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Accessory": {
    "anyOf": [
      {
        "enum": [
          "chevron",
          "none"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Act": {
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "menu": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label"
    ],
    "type": "object"
  },
  "Align": {
    "anyOf": [
      {
        "enum": [
          "start",
          "end"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "AppBlock": {
    "additionalProperties": true,
    "properties": {
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "type": {
        "not": {
          "enum": [
            "screen",
            "modal",
            "sheet",
            "section",
            "list",
            "row",
            "card",
            "choice",
            "form",
            "config",
            "secret",
            "run",
            "button",
            "chips",
            "stat",
            "text",
            "images",
            "web",
            "diff",
            "editor",
            "scene",
            "diagram",
            "composer",
            "lines",
            "prose",
            "hero",
            "media",
            "nav",
            "island",
            "table",
            "steps",
            "chart",
            "toast",
            "pages",
            "timeline",
            "import",
            "message",
            "tool",
            "sidebar",
            "boxplot",
            "heat",
            "plot"
          ]
        },
        "type": "string"
      }
    },
    "required": [
      "type"
    ],
    "type": "object"
  },
  "Attachment": {
    "properties": {
      "name": {
        "type": "string"
      },
      "src": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "$ref": "#/$defs/Tap"
      }
    },
    "required": [
      "name",
      "tap"
    ],
    "type": "object"
  },
  "AxisScale": {
    "anyOf": [
      {
        "enum": [
          "number",
          "time"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Band": {
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "header": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/SceneRow"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "type": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "id"
    ],
    "type": "object"
  },
  "Bar": {
    "properties": {
      "label": {
        "type": "string"
      },
      "sub": {
        "type": [
          "string",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "maximum": 255,
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "label",
      "value"
    ],
    "type": "object"
  },
  "Block": {
    "anyOf": [
      {
        "$ref": "#/$defs/Screen",
        "properties": {
          "type": {
            "const": "screen",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Modal",
        "properties": {
          "type": {
            "const": "modal",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Modal",
        "properties": {
          "type": {
            "const": "sheet",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Section",
        "properties": {
          "type": {
            "const": "section",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/List",
        "properties": {
          "type": {
            "const": "list",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Row",
        "properties": {
          "type": {
            "const": "row",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Card",
        "properties": {
          "type": {
            "const": "card",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Choice",
        "properties": {
          "type": {
            "const": "choice",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Form",
        "properties": {
          "type": {
            "const": "form",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Form",
        "properties": {
          "type": {
            "const": "config",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Secret",
        "properties": {
          "type": {
            "const": "secret",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Run",
        "properties": {
          "type": {
            "const": "run",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Button",
        "properties": {
          "type": {
            "const": "button",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Chips",
        "properties": {
          "type": {
            "const": "chips",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Stat",
        "properties": {
          "type": {
            "const": "stat",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Text",
        "properties": {
          "type": {
            "const": "text",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Images",
        "properties": {
          "type": {
            "const": "images",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Web",
        "properties": {
          "type": {
            "const": "web",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Diff",
        "properties": {
          "type": {
            "const": "diff",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Editor",
        "properties": {
          "type": {
            "const": "editor",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Scene",
        "properties": {
          "type": {
            "const": "scene",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Diagram",
        "properties": {
          "type": {
            "const": "diagram",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Composer",
        "properties": {
          "type": {
            "const": "composer",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Lines",
        "properties": {
          "type": {
            "const": "lines",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Prose",
        "properties": {
          "type": {
            "const": "prose",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Hero",
        "properties": {
          "type": {
            "const": "hero",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Media",
        "properties": {
          "type": {
            "const": "media",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Nav",
        "properties": {
          "type": {
            "const": "nav",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Island",
        "properties": {
          "type": {
            "const": "island",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Table",
        "properties": {
          "type": {
            "const": "table",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Steps",
        "properties": {
          "type": {
            "const": "steps",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Chart",
        "properties": {
          "type": {
            "const": "chart",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Toast",
        "properties": {
          "type": {
            "const": "toast",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Pages",
        "properties": {
          "type": {
            "const": "pages",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Timeline",
        "properties": {
          "type": {
            "const": "timeline",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Import",
        "properties": {
          "type": {
            "const": "import",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Message",
        "properties": {
          "type": {
            "const": "message",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Tool",
        "properties": {
          "type": {
            "const": "tool",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Sidebar",
        "properties": {
          "type": {
            "const": "sidebar",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Boxplot",
        "properties": {
          "type": {
            "const": "boxplot",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Heat",
        "properties": {
          "type": {
            "const": "heat",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Plot",
        "properties": {
          "type": {
            "const": "plot",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/AppBlock"
      }
    ]
  },
  "Bound": {
    "properties": {
      "get": {
        "type": "string"
      }
    },
    "required": [
      "get"
    ],
    "type": "object"
  },
  "Boxplot": {
    "additionalProperties": true,
    "properties": {
      "axis": {
        "type": "string"
      },
      "boxes": {
        "items": {
          "$ref": "#/$defs/PlotBox"
        },
        "type": "array"
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "selected": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "title",
      "axis",
      "boxes"
    ],
    "type": "object"
  },
  "BulkAction": {
    "properties": {
      "action": {
        "type": "string"
      },
      "bad": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "label": {
        "type": "string"
      }
    },
    "required": [
      "action",
      "label"
    ],
    "type": "object"
  },
  "Button": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "style": {
        "anyOf": [
          {
            "$ref": "#/$defs/ButtonStyle"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label"
    ],
    "type": "object"
  },
  "ButtonStyle": {
    "anyOf": [
      {
        "enum": [
          "primary",
          "plain",
          "destructive"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Card": {
    "additionalProperties": true,
    "properties": {
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/Label"
          },
          {
            "type": "null"
          }
        ]
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "buttons": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "color": {
        "type": [
          "string",
          "null"
        ]
      },
      "fold": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fold"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "kind": {
        "anyOf": [
          {
            "$ref": "#/$defs/CardKind"
          },
          {
            "type": "null"
          }
        ]
      },
      "menu": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "meta": {
        "anyOf": [
          {
            "$ref": "#/$defs/Shown"
          },
          {
            "type": "null"
          }
        ]
      },
      "push": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "subtitle": {
        "anyOf": [
          {
            "$ref": "#/$defs/Toned"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "CardKind": {
    "anyOf": [
      {
        "enum": [
          "ask",
          "run",
          "secret",
          "config",
          "proposal"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Cell": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "$ref": "#/$defs/Label"
      }
    ]
  },
  "Chart": {
    "additionalProperties": true,
    "properties": {
      "chart": {
        "$ref": "#/$defs/ChartKind"
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "era": {
        "anyOf": [
          {
            "$ref": "#/$defs/Era"
          },
          {
            "type": "null"
          }
        ]
      },
      "format": {
        "anyOf": [
          {
            "$ref": "#/$defs/ChartFormat"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "lang": {
        "type": [
          "string",
          "null"
        ]
      },
      "move": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "selected": {
        "type": [
          "string",
          "null"
        ]
      },
      "series": {
        "items": {
          "$ref": "#/$defs/Series"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "x": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "title",
      "chart",
      "x",
      "series"
    ],
    "type": "object"
  },
  "ChartFormat": {
    "anyOf": [
      {
        "enum": [
          "count",
          "thb",
          "thb_m",
          "percent"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "ChartKind": {
    "anyOf": [
      {
        "enum": [
          "bar",
          "stacked",
          "line",
          "combo",
          "donut"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Check": {
    "properties": {
      "ok": {
        "$ref": "#/$defs/Expr"
      },
      "say": {
        "type": "string"
      }
    },
    "required": [
      "ok",
      "say"
    ],
    "type": "object"
  },
  "ChipOption": {
    "properties": {
      "label": {
        "type": "string"
      },
      "value": {
        "type": "string"
      }
    },
    "required": [
      "value",
      "label"
    ],
    "type": "object"
  },
  "Chips": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "multi": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "options": {
        "items": {
          "$ref": "#/$defs/ChipOption"
        },
        "type": "array"
      },
      "selected": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "name",
      "options"
    ],
    "type": "object"
  },
  "Choice": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "default": {
        "anyOf": [
          {
            "$ref": "#/$defs/ChoiceDefault"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "options": {
        "items": {
          "$ref": "#/$defs/ChoiceOption"
        },
        "type": "array"
      },
      "other": {
        "anyOf": [
          {
            "$ref": "#/$defs/Other"
          },
          {
            "type": "null"
          }
        ]
      },
      "question": {
        "type": [
          "string",
          "null"
        ]
      },
      "recommended": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "action",
      "options"
    ],
    "type": "object"
  },
  "ChoiceDefault": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "until": {
        "type": "string"
      },
      "value": {
        "type": "string"
      }
    },
    "required": [
      "value",
      "until"
    ],
    "type": "object"
  },
  "ChoiceOption": {
    "properties": {
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": "string"
      },
      "value": {
        "type": "string"
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "value",
      "label"
    ],
    "type": "object"
  },
  "Column": {
    "properties": {
      "align": {
        "anyOf": [
          {
            "$ref": "#/$defs/Align"
          },
          {
            "type": "null"
          }
        ]
      },
      "currency": {
        "type": [
          "string",
          "null"
        ]
      },
      "digits": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "edit": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "era": {
        "anyOf": [
          {
            "$ref": "#/$defs/Era"
          },
          {
            "type": "null"
          }
        ]
      },
      "hide": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "kind": {
        "$ref": "#/$defs/ColumnKind"
      },
      "label": {
        "type": "string"
      },
      "max": {
        "type": [
          "number",
          "null"
        ]
      },
      "phone": {
        "anyOf": [
          {
            "$ref": "#/$defs/PhonePart"
          },
          {
            "type": "null"
          }
        ]
      },
      "sort": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "total": {
        "anyOf": [
          {
            "$ref": "#/$defs/Total"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "width": {
        "maximum": 65535,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "label",
      "kind"
    ],
    "type": "object"
  },
  "ColumnKind": {
    "anyOf": [
      {
        "enum": [
          "text",
          "number",
          "money",
          "date",
          "tone",
          "bar"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Composer": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "acts": {
        "additionalProperties": {
          "type": "string"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "chips": {
        "items": {
          "$ref": "#/$defs/ComposerChip"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "queued": {
        "items": {
          "$ref": "#/$defs/Queued"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      },
      "working": {
        "anyOf": [
          {
            "$ref": "#/$defs/Working"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "action"
    ],
    "type": "object"
  },
  "ComposerChip": {
    "properties": {
      "all": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "cur": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "all"
    ],
    "type": "object"
  },
  "Confirm": {
    "properties": {
      "destructive": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "message": {
        "type": [
          "string",
          "null"
        ]
      },
      "ok": {
        "type": [
          "string",
          "null"
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "Diagram": {
    "additionalProperties": true,
    "properties": {
      "counts": {
        "additionalProperties": {
          "type": "number"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "nodes": {
        "anyOf": [
          {
            "$ref": "#/$defs/Nodes"
          },
          {
            "type": "null"
          }
        ]
      },
      "selected": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "source": {
        "type": "string"
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "source"
    ],
    "type": "object"
  },
  "Diff": {
    "additionalProperties": true,
    "properties": {
      "file": {
        "type": "string"
      },
      "hunks": {
        "items": {
          "$ref": "#/$defs/Hunk"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "summary": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "file",
      "hunks"
    ],
    "type": "object"
  },
  "Editor": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "errors": {
        "items": {
          "$ref": "#/$defs/LineError"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "first": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "text",
      "action"
    ],
    "type": "object"
  },
  "Era": {
    "anyOf": [
      {
        "enum": [
          "ce",
          "be"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "ExportFormat": {
    "anyOf": [
      {
        "enum": [
          "csv",
          "xlsx"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Expr": {
    "anyOf": [
      {
        "additionalProperties": false,
        "properties": {
          "get": {
            "type": "string"
          }
        },
        "required": [
          "get"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "not": {
            "$ref": "#/$defs/Expr"
          }
        },
        "required": [
          "not"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "all": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "type": "array"
          }
        },
        "required": [
          "all"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "any": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "type": "array"
          }
        },
        "required": [
          "any"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "eq": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "eq"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "lt": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "lt"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "len": {
            "$ref": "#/$defs/Expr"
          }
        },
        "required": [
          "len"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "has": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "has"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "is": {
            "$ref": "#/$defs/Match"
          }
        },
        "required": [
          "is"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "add": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "add"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "sub": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "sub"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "mul": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "mul"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "div": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 2,
            "minItems": 2,
            "type": "array"
          }
        },
        "required": [
          "div"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "cat": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "type": "array"
          }
        },
        "required": [
          "cat"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "pick": {
            "items": {
              "$ref": "#/$defs/Expr"
            },
            "maxItems": 3,
            "minItems": 3,
            "type": "array"
          }
        },
        "required": [
          "pick"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/Lit"
      }
    ]
  },
  "Fallback": {
    "properties": {
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "Field": {
    "anyOf": [
      {
        "$ref": "#/$defs/TextField",
        "properties": {
          "type": {
            "const": "text",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/ToggleField",
        "properties": {
          "type": {
            "const": "toggle",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/PickerField",
        "properties": {
          "type": {
            "const": "picker",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/SecretField",
        "properties": {
          "type": {
            "const": "secret",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/SearchField",
        "properties": {
          "type": {
            "const": "search",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/UploadField",
        "properties": {
          "type": {
            "const": "upload",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/ScanField",
        "properties": {
          "type": {
            "const": "scan",
            "type": "string"
          }
        },
        "required": [
          "type"
        ],
        "type": "object"
      },
      {
        "$ref": "#/$defs/OtherField"
      }
    ]
  },
  "FieldValue": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "type": "boolean"
      }
    ]
  },
  "Figure": {
    "properties": {
      "act": {
        "type": [
          "string",
          "null"
        ]
      },
      "avatar": {
        "type": [
          "string",
          "null"
        ]
      },
      "coat": {
        "type": [
          "string",
          "null"
        ]
      },
      "grow": {
        "type": [
          "string",
          "null"
        ]
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "issue": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "load": {
        "type": [
          "string",
          "null"
        ]
      },
      "moment": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "tool": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "FileLink": {
    "properties": {
      "name": {
        "type": "string"
      },
      "src": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "src"
    ],
    "type": "object"
  },
  "FileRef": {
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": [
          "string",
          "null"
        ]
      },
      "src": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "id"
    ],
    "type": "object"
  },
  "Fold": {
    "properties": {
      "line": {
        "type": "string"
      },
      "main": {
        "anyOf": [
          {
            "$ref": "#/$defs/FoldMain"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "line"
    ],
    "type": "object"
  },
  "FoldMain": {
    "properties": {
      "action": {
        "type": "string"
      },
      "block": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label",
      "action"
    ],
    "type": "object"
  },
  "Form": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "fields": {
        "items": {
          "$ref": "#/$defs/Field"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "more": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "submit": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "fields"
    ],
    "type": "object"
  },
  "Gesture": {
    "properties": {
      "action": {
        "type": "string"
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "action",
      "name"
    ],
    "type": "object"
  },
  "Heat": {
    "additionalProperties": true,
    "properties": {
      "columns": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "edges": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatEdges"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "grid": {
        "items": {
          "$ref": "#/$defs/HeatRow"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "lang": {
        "type": [
          "string",
          "null"
        ]
      },
      "scale": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatScale"
          },
          {
            "type": "null"
          }
        ]
      },
      "selected": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatPick"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/HeatTone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "columns",
      "grid"
    ],
    "type": "object"
  },
  "HeatCell": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "type": [
          "number",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "HeatEdges": {
    "anyOf": [
      {
        "enum": [
          "steps",
          "ends"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "HeatPick": {
    "properties": {
      "column": {
        "type": "string"
      },
      "row": {
        "type": "string"
      }
    },
    "required": [
      "row",
      "column"
    ],
    "type": "object"
  },
  "HeatRow": {
    "properties": {
      "cells": {
        "items": {
          "$ref": "#/$defs/HeatCell"
        },
        "type": "array"
      },
      "name": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "cells"
    ],
    "type": "object"
  },
  "HeatScale": {
    "properties": {
      "max": {
        "type": [
          "number",
          "null"
        ]
      },
      "min": {
        "type": [
          "number",
          "null"
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "HeatTone": {
    "anyOf": [
      {
        "enum": [
          "info",
          "ok",
          "warn",
          "bad",
          "accent",
          "mute"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Hero": {
    "additionalProperties": true,
    "properties": {
      "actions": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "media": {
        "anyOf": [
          {
            "$ref": "#/$defs/Media"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "Hunk": {
    "properties": {
      "at": {
        "type": "string"
      },
      "lines": {
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "at",
      "lines"
    ],
    "type": "object"
  },
  "Image": {
    "properties": {
      "alt": {
        "type": [
          "string",
          "null"
        ]
      },
      "caption": {
        "type": [
          "string",
          "null"
        ]
      },
      "src": {
        "type": "string"
      }
    },
    "required": [
      "src"
    ],
    "type": "object"
  },
  "ImageSize": {
    "anyOf": [
      {
        "enum": [
          "small",
          "large"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Images": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "items": {
        "items": {
          "$ref": "#/$defs/Image"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "size": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImageSize"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "items"
    ],
    "type": "object"
  },
  "Import": {
    "additionalProperties": true,
    "properties": {
      "accept": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "columns": {
        "items": {
          "$ref": "#/$defs/ImportColumn"
        },
        "type": "array"
      },
      "done": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImportDone"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "into": {
        "type": [
          "string",
          "null"
        ]
      },
      "mb": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "read": {
        "type": [
          "string",
          "null"
        ]
      },
      "refused": {
        "items": {
          "$ref": "#/$defs/ImportRow"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "sheet": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImportSheet"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "template": {
        "anyOf": [
          {
            "$ref": "#/$defs/FileLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "title",
      "columns"
    ],
    "type": "object"
  },
  "ImportColumn": {
    "properties": {
      "key": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "required": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "type": {
        "anyOf": [
          {
            "$ref": "#/$defs/ImportType"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      }
    },
    "required": [
      "key",
      "label"
    ],
    "type": "object"
  },
  "ImportDone": {
    "properties": {
      "count": {
        "minimum": 0,
        "type": "integer"
      },
      "file": {
        "anyOf": [
          {
            "$ref": "#/$defs/FileLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "left": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "required": [
      "count"
    ],
    "type": "object"
  },
  "ImportFile": {
    "properties": {
      "id": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "rows": {
        "minimum": 0,
        "type": "integer"
      },
      "sheet": {
        "type": [
          "string",
          "null"
        ]
      },
      "sheets": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "size": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "name",
      "rows"
    ],
    "type": "object"
  },
  "ImportRow": {
    "properties": {
      "bad": {
        "additionalProperties": {
          "type": "string"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "cells": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "n": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "n",
      "cells"
    ],
    "type": "object"
  },
  "ImportSheet": {
    "properties": {
      "bad": {
        "items": {
          "$ref": "#/$defs/ImportRow"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "file": {
        "$ref": "#/$defs/ImportFile"
      },
      "headers": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "map": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/ImportRow"
        },
        "type": "array"
      }
    },
    "required": [
      "file",
      "headers",
      "map",
      "rows"
    ],
    "type": "object"
  },
  "ImportType": {
    "anyOf": [
      {
        "enum": [
          "text",
          "number",
          "money",
          "date",
          "choice"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Island": {
    "additionalProperties": true,
    "properties": {
      "events": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "fallback": {
        "$ref": "#/$defs/Fallback"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "props": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "size": {
        "anyOf": [
          {
            "$ref": "#/$defs/IslandSize"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "name",
      "fallback"
    ],
    "type": "object"
  },
  "IslandSize": {
    "properties": {
      "aspect": {
        "type": [
          "string",
          "null"
        ]
      },
      "height": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "width": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Keyboard": {
    "anyOf": [
      {
        "enum": [
          "default",
          "url",
          "number"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Label": {
    "properties": {
      "text": {
        "$ref": "#/$defs/Shown"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "text"
    ],
    "type": "object"
  },
  "Lane": {
    "properties": {
      "id": {
        "type": "string"
      },
      "since": {
        "type": [
          "string",
          "null"
        ]
      },
      "stage": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "$ref": "#/$defs/LaneState"
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tool": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "title",
      "state"
    ],
    "type": "object"
  },
  "LaneState": {
    "anyOf": [
      {
        "enum": [
          "working",
          "needs",
          "done",
          "idle",
          "fail",
          "merged"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Lang": {
    "anyOf": [
      {
        "enum": [
          "en",
          "th"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "LineError": {
    "properties": {
      "line": {
        "type": "integer"
      },
      "message": {
        "type": "string"
      }
    },
    "required": [
      "line",
      "message"
    ],
    "type": "object"
  },
  "LineItem": {
    "properties": {
      "id": {
        "type": "string"
      },
      "values": {
        "additionalProperties": true,
        "type": "object"
      }
    },
    "required": [
      "id",
      "values"
    ],
    "type": "object"
  },
  "Lines": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "add": {
        "type": [
          "string",
          "null"
        ]
      },
      "balance": {
        "items": {
          "type": "string"
        },
        "maxItems": 2,
        "minItems": 2,
        "type": [
          "array",
          "null"
        ]
      },
      "calc": {
        "additionalProperties": {
          "$ref": "#/$defs/Expr"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "columns": {
        "items": {
          "$ref": "#/$defs/Field"
        },
        "type": "array"
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "errors": {
        "items": {
          "$ref": "#/$defs/RowError"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "items": {
        "items": {
          "$ref": "#/$defs/LineItem"
        },
        "type": "array"
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "min": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "scale": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "submit": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      },
      "sum": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "columns",
      "items"
    ],
    "type": "object"
  },
  "Link": {
    "properties": {
      "label": {
        "type": "string"
      },
      "tap": {
        "$ref": "#/$defs/Tap"
      }
    },
    "required": [
      "label",
      "tap"
    ],
    "type": "object"
  },
  "List": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "more": {
        "anyOf": [
          {
            "$ref": "#/$defs/More"
          },
          {
            "type": "null"
          }
        ]
      },
      "reorder": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "rows"
    ],
    "type": "object"
  },
  "Lit": {
    "anyOf": [
      {
        "type": "null"
      },
      {
        "type": "boolean"
      },
      {
        "type": "number"
      },
      {
        "type": "string"
      }
    ]
  },
  "Load": {
    "anyOf": [
      {
        "enum": [
          "calm",
          "busy",
          "held"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Locale": {
    "properties": {
      "era": {
        "anyOf": [
          {
            "$ref": "#/$defs/Era"
          },
          {
            "type": "null"
          }
        ]
      },
      "lang": {
        "anyOf": [
          {
            "$ref": "#/$defs/Lang"
          },
          {
            "type": "null"
          }
        ]
      },
      "today": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Mark": {
    "properties": {
      "at": {
        "items": {
          "type": "number"
        },
        "type": "array"
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "group": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "kind": {
        "$ref": "#/$defs/MarkKind"
      },
      "path": {
        "items": {
          "items": {
            "type": "number"
          },
          "type": "array"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "text": {
        "type": [
          "string",
          "null"
        ]
      },
      "to": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "kind",
      "at"
    ],
    "type": "object"
  },
  "MarkKind": {
    "anyOf": [
      {
        "enum": [
          "arrow",
          "box",
          "ellipse",
          "text",
          "pin",
          "highlight",
          "line"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Match": {
    "properties": {
      "pattern": {
        "$ref": "#/$defs/Pattern"
      },
      "value": {
        "$ref": "#/$defs/Expr"
      }
    },
    "required": [
      "value",
      "pattern"
    ],
    "type": "object"
  },
  "Media": {
    "additionalProperties": true,
    "properties": {
      "alt": {
        "type": "string"
      },
      "caption": {
        "type": [
          "string",
          "null"
        ]
      },
      "draw": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "height": {
        "minimum": 0,
        "type": "integer"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "marks": {
        "items": {
          "$ref": "#/$defs/Mark"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "move": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "poster": {
        "type": [
          "string",
          "null"
        ]
      },
      "remove": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "src": {
        "type": "string"
      },
      "stretch": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "tools": {
        "items": {
          "$ref": "#/$defs/MarkKind"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "video": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "width": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "src",
      "alt",
      "width",
      "height"
    ],
    "type": "object"
  },
  "Message": {
    "additionalProperties": true,
    "properties": {
      "avatar": {
        "type": [
          "string",
          "null"
        ]
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "files": {
        "items": {
          "$ref": "#/$defs/Attachment"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "role": {
        "$ref": "#/$defs/Role"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "time": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "role",
      "name"
    ],
    "type": "object"
  },
  "Modal": {
    "additionalProperties": true,
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": "array"
      },
      "cancel": {
        "type": [
          "string",
          "null"
        ]
      },
      "destructive": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "done": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "locale": {
        "anyOf": [
          {
            "$ref": "#/$defs/Locale"
          },
          {
            "type": "null"
          }
        ]
      },
      "message": {
        "type": [
          "string",
          "null"
        ]
      },
      "ok": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "variant": {
        "anyOf": [
          {
            "$ref": "#/$defs/ModalVariant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "blocks"
    ],
    "type": "object"
  },
  "ModalVariant": {
    "anyOf": [
      {
        "enum": [
          "dialog",
          "alert",
          "tool"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "More": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "$ref": "#/$defs/Page"
      }
    ]
  },
  "Nav": {
    "additionalProperties": true,
    "properties": {
      "brand": {
        "anyOf": [
          {
            "$ref": "#/$defs/NavLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "links": {
        "items": {
          "$ref": "#/$defs/NavLink"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "links"
    ],
    "type": "object"
  },
  "NavLink": {
    "properties": {
      "current": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "href": {
        "type": "string"
      },
      "label": {
        "type": "string"
      }
    },
    "required": [
      "label",
      "href"
    ],
    "type": "object"
  },
  "Node": {
    "properties": {
      "coat": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "limit": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Nodes": {
    "anyOf": [
      {
        "items": {
          "$ref": "#/$defs/Node"
        },
        "type": "array"
      },
      {
        "additionalProperties": {
          "$ref": "#/$defs/Node"
        },
        "type": "object"
      }
    ]
  },
  "Other": {
    "properties": {
      "for": {
        "type": [
          "string",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "OtherField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "type": {
        "type": "string"
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "type"
    ],
    "type": "object"
  },
  "Page": {
    "properties": {
      "action": {
        "type": "string"
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "action",
      "cursor"
    ],
    "type": "object"
  },
  "PageImage": {
    "properties": {
      "alt": {
        "type": "string"
      },
      "height": {
        "minimum": 0,
        "type": "integer"
      },
      "src": {
        "type": "string"
      },
      "width": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "required": [
      "src",
      "alt",
      "width",
      "height"
    ],
    "type": "object"
  },
  "Pages": {
    "additionalProperties": true,
    "properties": {
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "file": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "note": {
        "type": [
          "string",
          "null"
        ]
      },
      "pages": {
        "items": {
          "$ref": "#/$defs/PageImage"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "pages"
    ],
    "type": "object"
  },
  "Part": {
    "oneOf": [
      {
        "properties": {
          "level": {
            "maximum": 255,
            "minimum": 0,
            "type": "integer"
          },
          "part": {
            "const": "heading",
            "type": "string"
          },
          "spans": {
            "items": {
              "$ref": "#/$defs/Span"
            },
            "type": "array"
          }
        },
        "required": [
          "part",
          "level",
          "spans"
        ],
        "type": "object"
      },
      {
        "properties": {
          "part": {
            "const": "para",
            "type": "string"
          },
          "spans": {
            "items": {
              "$ref": "#/$defs/Span"
            },
            "type": "array"
          }
        },
        "required": [
          "part",
          "spans"
        ],
        "type": "object"
      },
      {
        "properties": {
          "items": {
            "items": {
              "items": {
                "$ref": "#/$defs/Span"
              },
              "type": "array"
            },
            "type": "array"
          },
          "ordered": {
            "type": "boolean"
          },
          "part": {
            "const": "list",
            "type": "string"
          }
        },
        "required": [
          "part",
          "ordered",
          "items"
        ],
        "type": "object"
      },
      {
        "properties": {
          "part": {
            "const": "quote",
            "type": "string"
          },
          "spans": {
            "items": {
              "$ref": "#/$defs/Span"
            },
            "type": "array"
          }
        },
        "required": [
          "part",
          "spans"
        ],
        "type": "object"
      },
      {
        "properties": {
          "lang": {
            "type": [
              "string",
              "null"
            ]
          },
          "part": {
            "const": "code",
            "type": "string"
          },
          "text": {
            "type": "string"
          }
        },
        "required": [
          "part",
          "text"
        ],
        "type": "object"
      },
      {
        "properties": {
          "part": {
            "const": "rule",
            "type": "string"
          }
        },
        "required": [
          "part"
        ],
        "type": "object"
      }
    ]
  },
  "Pattern": {
    "anyOf": [
      {
        "enum": [
          "filled",
          "email",
          "url",
          "number"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Peak": {
    "properties": {
      "label": {
        "type": "string"
      },
      "y": {
        "type": "number"
      }
    },
    "required": [
      "y",
      "label"
    ],
    "type": "object"
  },
  "Pending": {
    "properties": {
      "count": {
        "type": "string"
      },
      "discard": {
        "$ref": "#/$defs/Tap"
      },
      "review": {
        "$ref": "#/$defs/Tap"
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "count",
      "text",
      "discard",
      "review"
    ],
    "type": "object"
  },
  "PhonePart": {
    "anyOf": [
      {
        "enum": [
          "title",
          "tag",
          "value",
          "meta",
          "hide"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "PickerField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "options": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/FieldValue"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Plot": {
    "additionalProperties": true,
    "properties": {
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "peak": {
        "anyOf": [
          {
            "$ref": "#/$defs/Peak"
          },
          {
            "type": "null"
          }
        ]
      },
      "series": {
        "items": {
          "$ref": "#/$defs/Trace"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "target": {
        "anyOf": [
          {
            "$ref": "#/$defs/Target"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "window": {
        "type": [
          "number",
          "null"
        ]
      },
      "x": {
        "anyOf": [
          {
            "$ref": "#/$defs/PlotAxis"
          },
          {
            "type": "null"
          }
        ]
      },
      "y": {
        "anyOf": [
          {
            "$ref": "#/$defs/PlotAxis"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "series"
    ],
    "type": "object"
  },
  "PlotAxis": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "type": [
          "number",
          "null"
        ]
      },
      "min": {
        "type": [
          "number",
          "null"
        ]
      },
      "scale": {
        "anyOf": [
          {
            "$ref": "#/$defs/AxisScale"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "PlotBox": {
    "properties": {
      "max": {
        "type": "number"
      },
      "median": {
        "type": "number"
      },
      "min": {
        "type": "number"
      },
      "name": {
        "type": "string"
      },
      "outliers": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "q1": {
        "type": "number"
      },
      "q3": {
        "type": "number"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "name",
      "min",
      "q1",
      "median",
      "q3",
      "max"
    ],
    "type": "object"
  },
  "Prose": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "parts": {
        "items": {
          "$ref": "#/$defs/Part"
        },
        "type": "array"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "streaming": {
        "type": [
          "boolean",
          "null"
        ]
      }
    },
    "required": [
      "parts"
    ],
    "type": "object"
  },
  "Queued": {
    "properties": {
      "q": {
        "minimum": 0,
        "type": "integer"
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "q",
      "text"
    ],
    "type": "object"
  },
  "Role": {
    "anyOf": [
      {
        "enum": [
          "agent",
          "owner",
          "system"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Round": {
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "lane": {
        "anyOf": [
          {
            "$ref": "#/$defs/RoundLane"
          },
          {
            "type": "null"
          }
        ]
      },
      "links": {
        "items": {
          "$ref": "#/$defs/Link"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "since": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "$ref": "#/$defs/LaneState"
      },
      "summary": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "name",
      "state"
    ],
    "type": "object"
  },
  "RoundLane": {
    "properties": {
      "harness": {
        "type": [
          "string",
          "null"
        ]
      },
      "host": {
        "type": [
          "string",
          "null"
        ]
      },
      "lines": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "model": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Row": {
    "additionalProperties": true,
    "properties": {
      "accessory": {
        "anyOf": [
          {
            "$ref": "#/$defs/Accessory"
          },
          {
            "type": "null"
          }
        ]
      },
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/Label"
          },
          {
            "type": "null"
          }
        ]
      },
      "button": {
        "anyOf": [
          {
            "$ref": "#/$defs/Act"
          },
          {
            "type": "null"
          }
        ]
      },
      "changed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "figure": {
        "anyOf": [
          {
            "$ref": "#/$defs/Figure"
          },
          {
            "type": "null"
          }
        ]
      },
      "handle": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "indent": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "lifted": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "menu": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "rounds": {
        "items": {
          "$ref": "#/$defs/Round"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "sticky": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "style": {
        "anyOf": [
          {
            "$ref": "#/$defs/RowStyle"
          },
          {
            "type": "null"
          }
        ]
      },
      "subtitle": {
        "anyOf": [
          {
            "$ref": "#/$defs/Toned"
          },
          {
            "type": "null"
          }
        ]
      },
      "swipe": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/Shown"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "RowError": {
    "properties": {
      "message": {
        "type": "string"
      },
      "name": {
        "type": [
          "string",
          "null"
        ]
      },
      "row": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "message"
    ],
    "type": "object"
  },
  "RowStyle": {
    "anyOf": [
      {
        "enum": [
          "link",
          "destructive"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Run": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "command": {
        "type": "string"
      },
      "dir": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "sha": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "touches": {
        "type": [
          "string",
          "null"
        ]
      },
      "until": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "action",
      "command",
      "sha"
    ],
    "type": "object"
  },
  "ScanField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "file": {
        "anyOf": [
          {
            "$ref": "#/$defs/FileRef"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "max": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Scene": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "lanes": {
        "items": {
          "$ref": "#/$defs/Lane"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "load": {
        "anyOf": [
          {
            "$ref": "#/$defs/Load"
          },
          {
            "type": "null"
          }
        ]
      },
      "repos": {
        "items": {
          "$ref": "#/$defs/SceneRepo"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "weather": {
        "anyOf": [
          {
            "$ref": "#/$defs/Weather"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "SceneRepo": {
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Band"
        },
        "type": "array"
      },
      "color": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "title",
      "blocks"
    ],
    "type": "object"
  },
  "SceneRow": {
    "properties": {
      "blocked_by": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "figure": {
        "anyOf": [
          {
            "$ref": "#/$defs/Figure"
          },
          {
            "type": "null"
          }
        ]
      },
      "host": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "needs": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "id",
      "title"
    ],
    "type": "object"
  },
  "Screen": {
    "additionalProperties": true,
    "properties": {
      "actions": {
        "items": {
          "$ref": "#/$defs/Act"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "back": {
        "type": [
          "string",
          "null"
        ]
      },
      "badge": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "done": {
        "anyOf": [
          {
            "$ref": "#/$defs/Submit"
          },
          {
            "type": "null"
          }
        ]
      },
      "focus": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "large": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "locale": {
        "anyOf": [
          {
            "$ref": "#/$defs/Locale"
          },
          {
            "type": "null"
          }
        ]
      },
      "pending": {
        "anyOf": [
          {
            "$ref": "#/$defs/Pending"
          },
          {
            "type": "null"
          }
        ]
      },
      "personas": {
        "items": {
          "additionalProperties": true,
          "type": "object"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "refresh": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "sites": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "source": {
        "type": [
          "string",
          "null"
        ]
      },
      "state": {
        "additionalProperties": {
          "$ref": "#/$defs/Lit"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "stream": {
        "type": [
          "string",
          "null"
        ]
      },
      "threads": {
        "items": {
          "additionalProperties": true,
          "type": "object"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      },
      "url": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "SearchField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "filters": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Secret": {
    "additionalProperties": true,
    "properties": {
      "action": {
        "type": "string"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "set": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "action"
    ],
    "type": "object"
  },
  "SecretField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "set": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "type": [
          "string",
          "null"
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Section": {
    "additionalProperties": true,
    "properties": {
      "blocks": {
        "items": {
          "$ref": "#/$defs/Block"
        },
        "type": "array"
      },
      "footer": {
        "type": [
          "string",
          "null"
        ]
      },
      "header": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "blocks"
    ],
    "type": "object"
  },
  "Series": {
    "properties": {
      "as": {
        "anyOf": [
          {
            "$ref": "#/$defs/SeriesMark"
          },
          {
            "type": "null"
          }
        ]
      },
      "dash": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "step": {
        "type": [
          "number",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "values": {
        "items": {
          "type": "number"
        },
        "type": "array"
      }
    },
    "required": [
      "name",
      "values"
    ],
    "type": "object"
  },
  "SeriesMark": {
    "anyOf": [
      {
        "enum": [
          "bar",
          "line"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "SetState": {
    "properties": {
      "key": {
        "type": "string"
      },
      "to": {
        "$ref": "#/$defs/Expr"
      }
    },
    "required": [
      "key",
      "to"
    ],
    "type": "object"
  },
  "Shown": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "number"
      },
      {
        "$ref": "#/$defs/Bound"
      },
      {
        "$ref": "#/$defs/Time"
      }
    ]
  },
  "SideBadge": {
    "properties": {
      "count": {
        "minimum": 0,
        "type": "integer"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "count"
    ],
    "type": "object"
  },
  "SideGroup": {
    "properties": {
      "links": {
        "items": {
          "$ref": "#/$defs/SideItem"
        },
        "type": "array"
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "links"
    ],
    "type": "object"
  },
  "SideItem": {
    "properties": {
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/SideBadge"
          },
          {
            "type": "null"
          }
        ]
      },
      "children": {
        "items": {
          "$ref": "#/$defs/SideLink"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "current": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "href": {
        "type": [
          "string",
          "null"
        ]
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      }
    },
    "required": [
      "label"
    ],
    "type": "object"
  },
  "SideLink": {
    "properties": {
      "badge": {
        "anyOf": [
          {
            "$ref": "#/$defs/SideBadge"
          },
          {
            "type": "null"
          }
        ]
      },
      "current": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "href": {
        "type": "string"
      },
      "icon": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      }
    },
    "required": [
      "label",
      "href"
    ],
    "type": "object"
  },
  "Sidebar": {
    "additionalProperties": true,
    "properties": {
      "brand": {
        "anyOf": [
          {
            "$ref": "#/$defs/SideLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "footer": {
        "items": {
          "$ref": "#/$defs/SideLink"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "groups": {
        "items": {
          "$ref": "#/$defs/SideGroup"
        },
        "type": "array"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "label",
      "groups"
    ],
    "type": "object"
  },
  "Sky": {
    "anyOf": [
      {
        "enum": [
          "clear",
          "windy",
          "fog",
          "storm"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "SortDir": {
    "anyOf": [
      {
        "enum": [
          "asc",
          "desc"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Span": {
    "properties": {
      "bold": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "code": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "italic": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "link": {
        "type": [
          "string",
          "null"
        ]
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "text"
    ],
    "type": "object"
  },
  "Stage": {
    "properties": {
      "id": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "sub": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "label"
    ],
    "type": "object"
  },
  "Stat": {
    "additionalProperties": true,
    "properties": {
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "items": {
        "items": {
          "$ref": "#/$defs/Tile"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "spark": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/Shown"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "type": "object"
  },
  "Steps": {
    "additionalProperties": true,
    "properties": {
      "bars": {
        "items": {
          "$ref": "#/$defs/Bar"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "current": {
        "type": [
          "string",
          "null"
        ]
      },
      "done": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "steps": {
        "items": {
          "$ref": "#/$defs/Stage"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Submit": {
    "properties": {
      "action": {
        "type": "string"
      },
      "label": {
        "type": "string"
      },
      "off": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "label",
      "action"
    ],
    "type": "object"
  },
  "Table": {
    "additionalProperties": true,
    "properties": {
      "calc": {
        "additionalProperties": {
          "$ref": "#/$defs/Expr"
        },
        "type": [
          "object",
          "null"
        ]
      },
      "columns": {
        "items": {
          "$ref": "#/$defs/Column"
        },
        "type": "array"
      },
      "edit": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "export": {
        "items": {
          "$ref": "#/$defs/ExportFormat"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "filter": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "more": {
        "anyOf": [
          {
            "$ref": "#/$defs/Page"
          },
          {
            "type": "null"
          }
        ]
      },
      "reorder": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "rows": {
        "items": {
          "$ref": "#/$defs/TableRow"
        },
        "type": "array"
      },
      "select": {
        "anyOf": [
          {
            "$ref": "#/$defs/TableSelect"
          },
          {
            "type": "null"
          }
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "sort": {
        "anyOf": [
          {
            "$ref": "#/$defs/TableSort"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "columns",
      "rows"
    ],
    "type": "object"
  },
  "TableRow": {
    "properties": {
      "cells": {
        "additionalProperties": {
          "$ref": "#/$defs/Cell"
        },
        "type": "object"
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "group": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "cells"
    ],
    "type": "object"
  },
  "TableSelect": {
    "properties": {
      "actions": {
        "items": {
          "$ref": "#/$defs/BulkAction"
        },
        "type": "array"
      }
    },
    "required": [
      "actions"
    ],
    "type": "object"
  },
  "TableSort": {
    "properties": {
      "by": {
        "type": "string"
      },
      "dir": {
        "$ref": "#/$defs/SortDir"
      }
    },
    "required": [
      "by",
      "dir"
    ],
    "type": "object"
  },
  "Tap": {
    "properties": {
      "action": {
        "type": [
          "string",
          "null"
        ]
      },
      "copy": {
        "type": [
          "string",
          "null"
        ]
      },
      "focus": {
        "type": [
          "string",
          "null"
        ]
      },
      "keep": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "open": {
        "type": [
          "string",
          "null"
        ]
      },
      "set": {
        "items": {
          "$ref": "#/$defs/SetState"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "sheet": {
        "type": [
          "string",
          "null"
        ]
      },
      "thread": {
        "type": [
          "string",
          "null"
        ]
      },
      "url": {
        "type": [
          "string",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "Target": {
    "properties": {
      "max": {
        "type": "number"
      },
      "min": {
        "type": "number"
      }
    },
    "required": [
      "min",
      "max"
    ],
    "type": "object"
  },
  "Text": {
    "additionalProperties": true,
    "properties": {
      "center": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "font": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "markdown": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "size": {
        "type": [
          "number",
          "null"
        ]
      },
      "style": {
        "anyOf": [
          {
            "$ref": "#/$defs/TextStyle"
          },
          {
            "type": "null"
          }
        ]
      },
      "text": {
        "type": [
          "string",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "top": {
        "type": [
          "number",
          "null"
        ]
      },
      "until": {
        "type": [
          "string",
          "null"
        ]
      },
      "weight": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "TextField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "keyboard": {
        "anyOf": [
          {
            "$ref": "#/$defs/Keyboard"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "placeholder": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/FieldValue"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "TextStyle": {
    "anyOf": [
      {
        "enum": [
          "body",
          "footnote"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Tile": {
    "properties": {
      "label": {
        "type": "string"
      },
      "spark": {
        "items": {
          "type": "number"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "unit": {
        "type": [
          "string",
          "null"
        ]
      },
      "value": {
        "$ref": "#/$defs/Shown"
      }
    },
    "required": [
      "label",
      "value"
    ],
    "type": "object"
  },
  "Time": {
    "properties": {
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "since": {
        "type": [
          "string",
          "null"
        ]
      },
      "until": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "type": "object"
  },
  "TimeBar": {
    "properties": {
      "end": {
        "type": "string"
      },
      "fixed": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "id": {
        "type": "string"
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "progress": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "start": {
        "type": "string"
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "id",
      "start",
      "end"
    ],
    "type": "object"
  },
  "TimeRow": {
    "properties": {
      "bars": {
        "items": {
          "$ref": "#/$defs/TimeBar"
        },
        "type": "array"
      },
      "id": {
        "type": "string"
      },
      "subtitle": {
        "type": [
          "string",
          "null"
        ]
      },
      "tap": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tap"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "title",
      "bars"
    ],
    "type": "object"
  },
  "Timeline": {
    "additionalProperties": true,
    "properties": {
      "draw": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "empty": {
        "type": [
          "string",
          "null"
        ]
      },
      "from": {
        "type": "string"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "move": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "off": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "stretch": {
        "anyOf": [
          {
            "$ref": "#/$defs/Gesture"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": [
          "string",
          "null"
        ]
      },
      "to": {
        "type": "string"
      },
      "tracks": {
        "items": {
          "$ref": "#/$defs/TimeRow"
        },
        "type": "array"
      }
    },
    "required": [
      "from",
      "to",
      "tracks"
    ],
    "type": "object"
  },
  "Toast": {
    "additionalProperties": true,
    "properties": {
      "fallback": {
        "anyOf": [
          {
            "$ref": "#/$defs/Fallback"
          },
          {
            "type": "null"
          }
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "undo": {
        "anyOf": [
          {
            "$ref": "#/$defs/Undo"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title"
    ],
    "type": "object"
  },
  "ToggleField": {
    "additionalProperties": true,
    "properties": {
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/$defs/FieldValue"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Tone": {
    "anyOf": [
      {
        "enum": [
          "ok",
          "warn",
          "bad",
          "info",
          "mute",
          "accent",
          "working",
          "needs",
          "done",
          "fail",
          "idle"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Toned": {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "$ref": "#/$defs/Label"
      }
    ]
  },
  "Tool": {
    "additionalProperties": true,
    "properties": {
      "body": {
        "type": [
          "string",
          "null"
        ]
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "state": {
        "$ref": "#/$defs/ToolState"
      },
      "summary": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name",
      "state"
    ],
    "type": "object"
  },
  "ToolState": {
    "anyOf": [
      {
        "enum": [
          "running",
          "done",
          "failed"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Total": {
    "anyOf": [
      {
        "enum": [
          "sum",
          "avg",
          "count"
        ],
        "type": "string"
      },
      {
        "type": "string"
      }
    ]
  },
  "Trace": {
    "properties": {
      "name": {
        "type": "string"
      },
      "tone": {
        "anyOf": [
          {
            "$ref": "#/$defs/Tone"
          },
          {
            "type": "null"
          }
        ]
      },
      "x": {
        "items": {
          "type": "number"
        },
        "type": "array"
      },
      "y": {
        "items": {
          "type": "number"
        },
        "type": "array"
      }
    },
    "required": [
      "name",
      "x",
      "y"
    ],
    "type": "object"
  },
  "Undo": {
    "properties": {
      "action": {
        "type": "string"
      },
      "confirm": {
        "anyOf": [
          {
            "$ref": "#/$defs/Confirm"
          },
          {
            "type": "null"
          }
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "values": {
        "additionalProperties": true,
        "type": [
          "object",
          "null"
        ]
      }
    },
    "required": [
      "action"
    ],
    "type": "object"
  },
  "UploadField": {
    "additionalProperties": true,
    "properties": {
      "accept": {
        "items": {
          "$ref": "#/$defs/Accept"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "capture": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "checks": {
        "items": {
          "$ref": "#/$defs/Check"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "doc": {
        "type": [
          "string",
          "null"
        ]
      },
      "enabled": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "error": {
        "type": [
          "string",
          "null"
        ]
      },
      "files": {
        "items": {
          "$ref": "#/$defs/FileRef"
        },
        "type": [
          "array",
          "null"
        ]
      },
      "label": {
        "type": [
          "string",
          "null"
        ]
      },
      "many": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "mb": {
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "name": {
        "type": "string"
      },
      "open": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "was": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "name"
    ],
    "type": "object"
  },
  "Weather": {
    "properties": {
      "fog": {
        "maximum": 255,
        "minimum": 0,
        "type": [
          "integer",
          "null"
        ]
      },
      "line": {
        "type": [
          "string",
          "null"
        ]
      },
      "sky": {
        "$ref": "#/$defs/Sky"
      },
      "storm": {
        "type": [
          "boolean",
          "null"
        ]
      },
      "wind": {
        "type": [
          "number",
          "null"
        ]
      }
    },
    "required": [
      "sky"
    ],
    "type": "object"
  },
  "Web": {
    "additionalProperties": true,
    "properties": {
      "height": {
        "minimum": 0,
        "type": "integer"
      },
      "id": {
        "type": [
          "string",
          "null"
        ]
      },
      "show": {
        "anyOf": [
          {
            "$ref": "#/$defs/Expr"
          },
          {
            "type": "null"
          }
        ]
      },
      "src": {
        "type": "string"
      }
    },
    "required": [
      "src",
      "height"
    ],
    "type": "object"
  },
  "Working": {
    "properties": {
      "since": {
        "type": "string"
      }
    },
    "required": [
      "since"
    ],
    "type": "object"
  }
};

// src/core/check.ts
var LISTS2 = ["blocks", "rows", "buttons"];
var LINKS = ["url", "href", "link", "open", "src"];
var KINDS2 = Object.keys(kinds);
var isObj3 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var str2 = (v) => typeof v === "string" ? v : void 0;
var sorted = (o) => Object.keys(o).sort();
var linkable = (url2) => {
  const head = url2.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").split(/[/?#]/, 1)[0] ?? "";
  const at2 = head.indexOf(":");
  return at2 < 0 || ["http", "https", "mailto"].includes(head.slice(0, at2).toLowerCase());
};
var typed = (t, v) => t === "null" ? v === null : t === "array" ? Array.isArray(v) : t === "object" ? isObj3(v) : t === "integer" ? Number.isInteger(v) : typeof v === t;
function fits(s, v) {
  if (typeof s === "boolean") return s;
  if (s.$ref !== void 0 && !fits(defs[s.$ref.replace("#/$defs/", "")] ?? false, v)) return false;
  if (s.type !== void 0 && ![s.type].flat().some((t) => typed(t, v))) return false;
  if ("const" in s && s.const !== v) return false;
  if (s.enum && !s.enum.includes(v)) return false;
  if (s.not !== void 0 && fits(s.not, v)) return false;
  const alts = s.anyOf ?? s.oneOf;
  if (alts && !alts.some((a) => fits(a, v))) return false;
  if (typeof v === "number" && (v < (s.minimum ?? -Infinity) || v > (s.maximum ?? Infinity))) return false;
  if (Array.isArray(v)) {
    if (v.length < (s.minItems ?? 0) || v.length > (s.maxItems ?? Infinity)) return false;
    const items = s.items;
    return items === void 0 || v.every((x) => fits(items, x));
  }
  if (!isObj3(v)) return true;
  if (s.required?.some((k) => !(k in v))) return false;
  return Object.entries(v).every(([k, x]) => {
    const p = s.properties?.[k] ?? s.additionalProperties;
    return p === void 0 || fits(p, x);
  });
}
function shallow(o) {
  const top = { ...o };
  for (const k of LISTS2) if (k in top) top[k] = [];
  if (Array.isArray(top["rounds"])) top["rounds"] = top["rounds"].map((r) => isObj3(r) && "blocks" in r ? { ...r, blocks: [] } : r);
  return top;
}
function sentOnce(top) {
  const seen = /* @__PURE__ */ new Set();
  const action = (w) => isObj3(top[w]) ? str2(top[w]["action"]) : void 0;
  const twice = WORDS.filter((w) => {
    const a = action(w);
    return a !== void 0 && (seen.has(a) || !seen.add(a));
  });
  const v = { ...top };
  for (const w of twice) delete v[w];
  return v;
}
function placed(o) {
  const lists = LISTS2.filter((k) => (o["type"] !== "table" || k !== "rows") && k in o).map((k) => [k, o[k]]);
  const rounds = Array.isArray(o["rounds"]) ? o["rounds"] : [];
  rounds.forEach((r, i) => isObj3(r) && "blocks" in r && lists.push([`rounds/${i}/blocks`, r["blocks"]]));
  return lists.flatMap(([at2, l]) => Array.isArray(l) ? l.map((v, i) => [`${at2}/${i}`, v]) : []);
}
function unplaced(s) {
  const steps2 = Array.isArray(s["steps"]) ? s["steps"] : [];
  if (steps2.length === 0) return void 0;
  const at2 = s["current"] == null ? void 0 : steps2.some((x) => isObj3(x) && x["id"] === s["current"]);
  const done = s["done"] === true;
  if (s["bars"] != null) return "a steps block with both steps and bars";
  if (at2 === false) return "a stepper whose current names no step";
  if (at2 === true && done) return "a stepper both done and at a current step";
  if (at2 === void 0 && !done) return "a stepper with neither a current step nor done";
  return void 0;
}
var Walk = class {
  constructor(app) {
    this.ids = /* @__PURE__ */ new Map();
    this.acts = /* @__PURE__ */ new Map();
    this.keys = [];
    this.rows = /* @__PURE__ */ new Set();
    this.aims = [];
    this.out = [];
    this.app = app;
  }
  block(v, at2, scope) {
    if (!isObj3(v)) {
      this.out.push({ fault: "shape", kind: "", why: "a block that is no object" });
      return;
    }
    const kind = str2(v["type"]) ?? "";
    const id = str2(v["id"]);
    if (id === "") this.out.push({ fault: "unnamed", kind });
    else if (id !== void 0) {
      const first = this.ids.get(id);
      this.ids.set(id, at2);
      if (first !== void 0) this.out.push({ fault: "twice", id, at: [first, at2] });
    } else if (kind === "island" || WORDS.some((w) => isObj3(v[w]))) this.out.push({ fault: "unnamed", kind });
    const core = KINDS2.includes(kind);
    const fallback2 = isObj3(v["fallback"]) ? str2(v["fallback"]["title"]) : void 0;
    if ((kind === "island" || this.app.includes(kind) && !core) && !fallback2) this.out.push({ fault: "bare", kind, id: id ?? "" });
    if (core) {
      const inner = id || scope;
      const top = shallow(v);
      this.sends(sentOnce(top), at2, inner);
      this.core(kind, v, top);
      for (const [p, c] of placed(v)) this.block(c, `${at2}/${p}`, inner);
    } else if (!this.app.includes(kind)) this.out.push({ fault: "unknown", kind });
  }
  sends(v, at2, scope) {
    if (Array.isArray(v)) return v.forEach((x, i) => (isObj3(x) || Array.isArray(x)) && this.sends(x, `${at2}/${i}`, scope));
    if (!isObj3(v)) return;
    for (const k of LINKS) {
      const url2 = str2(v[k]);
      if (url2 !== void 0 && !linkable(url2)) this.out.push({ fault: "link", at: at2, url: url2 });
    }
    const action = str2(v["action"]);
    if (action !== void 0) {
      const key = JSON.stringify([scope, action]);
      const first = this.acts.get(key);
      this.acts.set(key, at2);
      if (first !== void 0) this.out.push({ fault: "act-twice", block: scope, action, at: [first, at2] });
    }
    for (const k of sorted(v)) if (k !== "fallback" && (isObj3(v[k]) || Array.isArray(v[k]))) this.sends(v[k], `${at2}/${k}`, scope);
  }
  core(kind, o, top) {
    const def = defs[kinds[kind] ?? ""];
    if (!fits({ $ref: "#/$defs/Block" }, top) || typeof def !== "object") {
      this.out.push({ fault: "shape", kind, why: "a block that does not fit its kind" });
    } else {
      const known = def.properties ?? {};
      for (const field of sorted(top)) if (!(field in known) && field !== "type" && field !== "fallback") this.out.push({ fault: "extra", kind, field });
      const why = kind === "steps" ? unplaced(top) : void 0;
      if (why !== void 0) this.out.push({ fault: "shape", kind, why });
    }
    const fields = kind === "form" || kind === "config" ? Array.isArray(o["fields"]) ? o["fields"] : [] : [];
    const names2 = kind === "chips" ? [o["name"]] : fields.map((f) => isObj3(f) ? f["name"] : void 0);
    for (const n of names2) if (typeof n === "string") this.keys.push(n);
    const id = str2(o["id"]);
    if ((kind === "list" || kind === "table") && id !== void 0) this.rows.add(id);
    for (const f of fields) if (isObj3(f) && f["type"] === "search" && typeof f["name"] === "string" && typeof f["filters"] === "string") this.aims.push([f["name"], f["filters"]]);
  }
};
function gets(v, out) {
  if (Array.isArray(v)) return v.forEach((x) => gets(x, out));
  if (!isObj3(v)) return;
  const keys = Object.keys(v);
  const get2 = str2(v["get"]);
  if (keys.length === 1 && get2 !== void 0) return out.push(get2);
  for (const k of keys) if (k !== "calc") gets(v[k], out);
}
function check(screen2, app = []) {
  const w = new Walk(app);
  for (const kind of app) if (KINDS2.includes(kind)) w.out.push({ fault: "clash", kind });
  if (isObj3(screen2) && isObj3(screen2["state"])) w.keys.push(...sorted(screen2["state"]));
  w.block(screen2, "", "");
  for (const [field, id] of w.aims) if (!w.rows.has(id)) w.out.push({ fault: "aim", field, id });
  const declared = /* @__PURE__ */ new Set();
  const twice = w.keys.filter((k) => declared.has(k) || !declared.add(k));
  const used = [];
  gets(screen2, used);
  const state = /* @__PURE__ */ new Set([...twice, ...used.filter((k) => !declared.has(k))]);
  for (const key of [...state].sort()) w.out.push({ fault: "state", key });
  return w.out;
}
function named3(v, out) {
  if (Array.isArray(v)) return v.forEach((x) => named3(x, out));
  if (!isObj3(v)) return;
  const action = str2(v["action"]);
  if (action !== void 0) out.add(action);
  for (const x of Object.values(v)) named3(x, out);
}
function actions(screen2) {
  const out = /* @__PURE__ */ new Set();
  named3(screen2, out);
  return [...out].sort();
}

// src/core/field/match.ts
function hits(text5, q) {
  const t = text5.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w));
}
function typing(send2, busy) {
  let wait;
  let flying = false;
  let next;
  const go = (q) => {
    flying = true;
    busy(true);
    void Promise.resolve(send2(q)).then(land, land);
  };
  const land = () => {
    flying = false;
    const q = next;
    next = void 0;
    if (q === void 0) busy(false);
    else go(q);
  };
  const now = (q) => {
    clearTimeout(wait);
    if (flying) next = q;
    else go(q);
  };
  const key = (q) => {
    clearTimeout(wait);
    wait = setTimeout(() => now(q), 250);
  };
  return { key, now };
}
var rec2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function text4(v) {
  if (typeof v === "string" || typeof v === "number") return String(v);
  return rec2(v) ? text4(v["text"]) : "";
}
function said(r) {
  if (!rec2(r)) return "";
  return (rec2(r["cells"]) ? Object.values(r["cells"]) : [r["title"], r["subtitle"], r["value"]]).map(text4).join(" ");
}
function each2(v, f) {
  if (Array.isArray(v)) return v.forEach((x) => each2(x, f));
  if (!rec2(v)) return;
  f(v);
  each2(v["blocks"], f);
}
function seeks(screen2, state) {
  const rows = {};
  const aims = [];
  each2(screen2, (b) => {
    if ((b["type"] === "list" || b["type"] === "table") && typeof b["id"] === "string" && Array.isArray(b["rows"])) rows[b["id"]] = b["rows"];
    const fields = b["type"] === "form" || b["type"] === "config" ? b["fields"] : [];
    for (const x of Array.isArray(fields) ? fields : []) if (rec2(x) && x["type"] === "search" && typeof x["name"] === "string" && typeof x["filters"] === "string") aims.push([x["name"], x["filters"]]);
  });
  const out = {};
  for (const [name, id] of aims) {
    const all = (rows[id] ?? []).filter((r) => !(rec2(r) && r["group"]));
    const q = String(state[name] ?? "");
    out[id] = { name, q, n: all.filter((r) => hits(said(r), q)).length, m: all.length };
  }
  return out;
}

// src/core/field/files.ts
var OWN = {
  image: (_, m) => m.startsWith("image/"),
  pdf: (n, m) => m === "application/pdf" || /\.pdf$/i.test(n),
  sheet: (n, m) => m === "text/csv" || m.endsWith("spreadsheetml.sheet") || /\.(csv|xlsx)$/i.test(n)
};
var MIME = { image: "image/*", pdf: ".pdf,application/pdf", sheet: ".csv,.xlsx,text/csv" };
var fill2 = (text5, v) => text5.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
var accepts = (accept = []) => accept.map((a) => MIME[a] ?? a).join(",");
function refused(x, name, mime, size) {
  const kinds3 = x.accept ?? [];
  if (kinds3.length && !kinds3.some((k) => (OWN[k] ?? ((_, m) => m === k))(name, mime))) return "type";
  return x.mb != null && size > x.mb * 1048576 ? "size" : void 0;
}
var sized = (n) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
var kinds2 = (x, w) => (x.accept ?? []).map((a) => w(a) || a).join(w("or"));
function hint(x, w, on) {
  if (!on) return w("off");
  const mb = x.mb != null ? fill2(w(x.many ? "each" : "upTo"), { mb: x.mb }) : "";
  return [kinds2(x, w), mb].filter(Boolean).join(" \xB7 ");
}
function pick(x, rows, w) {
  const image = !!x.accept?.length && x.accept.every((a) => a === "image");
  if (!x.many && rows.some((r) => r.state !== "refused")) return w("replace");
  return w(`${image ? "photo" : "file"}${x.many ? "N" : "1"}`);
}
function status(x, r, w) {
  if (r.state === "uploading") return fill2(w("uploading"), { p: Math.round(r.part * 100) });
  if (r.state === "failed") return `${w("failed")} \xB7 ${sized(r.size)}`;
  if (r.state === "refused") return r.why === "size" ? fill2(w("tooBig"), { size: sized(r.size), mb: x.mb }) : fill2(w("onlyType"), { types: kinds2(x, w) });
  return r.size ? sized(r.size) : "";
}
var held = (x) => (x.files ?? []).map((f) => ({ name: f.name ?? f.id, size: 0, mime: "", state: "done", part: 1, id: f.id, src: f.src ?? void 0 }));
var ids = (rows) => rows.flatMap((r) => r.state === "done" && r.id != null ? [r.id] : []);
var waits = (rows) => ({ up: rows.filter((r) => r.state === "uploading").length, failed: rows.filter((r) => r.state === "failed").length });
function picked(x, rows, files, names2) {
  const keep = x.many ? rows.filter((r) => r.state !== "refused") : [];
  for (const r of x.many ? [] : rows) r.stop?.abort();
  const fresh = (x.many ? files : files.slice(0, 1)).map((blob, i) => {
    const name = names2[i] ?? "", why = refused(x, name, blob.type, blob.size);
    return { name, size: blob.size, mime: blob.type, state: why ? "refused" : "uploading", part: 0, why, blob: why ? void 0 : blob };
  });
  return { rows: [...keep, ...fresh], send: fresh.filter((r) => r.state === "uploading") };
}
function send(r, file, about, again) {
  if (!r.blob) return;
  const stop = new AbortController();
  Object.assign(r, { state: "uploading", part: 0, stop });
  const progress = (p) => (r.part = Math.min(1, Math.max(0, p)), again());
  file(r.blob, { ...about, name: r.name, mime: r.mime, size: r.size, progress, signal: stop.signal }).then(
    (ref) => !stop.signal.aborted && (Object.assign(r, { state: "done", part: 1, id: ref.id, src: ref.src ?? r.src, name: ref.name ?? r.name, blob: void 0 }), again()),
    () => !stop.signal.aborted && (r.state = "failed", again())
  );
}
var scanner = () => import(new URL("./scan.js", import.meta.url).href);
var scanHeld = (x) => x.file ? held({ name: x.name, files: [x.file] }) : [];
var scanned = (x, pdf, pages2, first) => {
  const name = `${(x.label ?? x.name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "scan"}.pdf`;
  return { name, size: pdf.size, mime: "application/pdf", state: "uploading", part: 0, blob: pdf, pages: pages2, src: first };
};
function scanLine(r, w) {
  const head = r.state === "uploading" ? fill2(w("uploading"), { p: Math.round(r.part * 100) }) : r.state === "failed" ? w("failed") : "";
  return [head, r.pages ? fill2(w(r.pages > 1 ? "scannedN" : "scanned1"), { n: r.pages, kb: Math.max(1, Math.round(r.size / 1024)) }) : ""].filter(Boolean).join(" \xB7 ");
}
var scanHint = (x, w, on) => on ? fill2(w("scanHint"), { max: x.max ?? 20 }) : w("scanOff");
export {
  accepts,
  actionOf,
  actions,
  apply,
  boxplot,
  built,
  button,
  card,
  cases,
  chart,
  check,
  chips,
  choice,
  choose,
  composer,
  config,
  css,
  curves,
  defaultPair,
  defaultStyle,
  diagram,
  diff,
  drawn,
  editor,
  evaluate,
  expect,
  expr,
  ext,
  figured,
  fill2 as fill,
  form,
  gate,
  gated,
  glyph,
  heat,
  held,
  hero,
  hint,
  hits,
  hooks,
  hosts,
  ids,
  images,
  import_,
  initial,
  island,
  lines,
  linkable,
  list2 as list,
  lit,
  media,
  message,
  modal,
  named2 as named,
  names,
  nav,
  nonce,
  pages,
  pick,
  picked,
  plot,
  prose,
  refused,
  role,
  roleWord,
  roles,
  row,
  rules,
  run,
  said,
  scanHeld,
  scanHint,
  scanLine,
  scanned,
  scanner,
  scene,
  screen,
  secret,
  section,
  seeks,
  send,
  share,
  sheet,
  sideCount,
  sideIcon,
  sideTitle,
  sidebar,
  sized,
  start,
  stat,
  status,
  steps,
  table,
  text2 as text,
  tiles,
  timeline,
  toast,
  tool,
  tree,
  typing,
  value,
  view,
  waits,
  walked,
  web
};
