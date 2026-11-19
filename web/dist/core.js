// src/gen/hooks.ts
var hooks = {
  screen: { variant: null, parts: ["title", "badge", "actions"] },
  sheet: { variant: null, parts: ["title"] },
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
  toast: { variant: null, parts: ["title"] }
};
var roles = { section: "region", form: "form", config: "form", nav: "navigation", chart: "figure", toast: "status" };
var names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"];

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
  if (k === "is" && rec(a) && typeof a.pattern === "string" && "value" in a) {
    const x = read(a.value);
    return x === void 0 ? UNKNOWN : { is: { value: x, pattern: a.pattern } };
  }
  return UNKNOWN;
}
function sound(e) {
  if (!rec(e)) return true;
  const [k = "", a] = Object.entries(e)[0] ?? [];
  if (k === "?") return false;
  if (k === "is") return rec(a) && PATTERNS.includes(String(a.pattern)) && sound(a.value);
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
      return rec(a) ? is(ev(a.value, s), a.pattern) : null;
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
var kids = (b) => [...list(b.blocks), ...list(b.rows), ...list(b.buttons), ...list(b.rounds).flatMap((r) => list(r.blocks))];
var named = (b) => list(b.fields).filter((f) => typeof f.name === "string");
var actionOf = (a) => {
  const k = a.action ?? (rec(a.tap) ? a.tap.action : void 0);
  return typeof k === "string" ? k : void 0;
};
var acts = (b) => {
  const all = [...list(b.actions), ...list(b.swipe), ...list(b.menu), ...[b.button, ...WORDS.map((w) => b[w])].filter(rec)];
  return [...all, ...all.flatMap((a) => list(a.menu))];
};
var lit = (v) => v === null || typeof v === "boolean" || typeof v === "number" || typeof v === "string" ? v : null;
function start(screen2) {
  const s = {};
  const seed = (b) => {
    for (const f of named(b)) s[String(f.name)] = lit(f.value);
    if (b.type === "chips" && typeof b.name === "string") s[b.name] = lit(Array.isArray(b.selected) ? b.selected[0] : null);
    kids(b).forEach(seed);
  };
  if (rec(screen2)) {
    for (const [k, v] of Object.entries(rec(screen2.state) ? screen2.state : {})) s[k] = lit(v);
    seed(screen2);
  }
  return s;
}
function view(screen2, s) {
  const v = { hidden: /* @__PURE__ */ new Set(), disabled: /* @__PURE__ */ new Set(), says: {}, acts: /* @__PURE__ */ new Set(), values: {} };
  const walk = (b) => {
    const id = typeof b.id === "string" ? b.id : void 0;
    if (holds(b.show, s) === false) {
      if (id !== void 0) v.hidden.add(id);
      return;
    }
    if (holds(b.enabled, s) === false && id !== void 0) v.disabled.add(id);
    let failing = false;
    for (const f of named(b)) {
      const name = String(f.name);
      if (holds(f.show, s) === false) {
        v.hidden.add(name);
        continue;
      }
      if (holds(f.enabled, s) === false) v.disabled.add(name);
      const bad = list(f.checks).find((c) => typeof c.say === "string" && holds(c.ok, s) === false);
      if (bad) {
        failing = true;
        v.says[name] = String(bad.say);
      }
    }
    if (failing && id !== void 0) v.disabled.add(id);
    for (const a of acts(b)) {
      const k = actionOf(a);
      if (k !== void 0 && holds(a.enabled, s) === false) v.acts.add(k);
    }
    for (const i of [b, ...list(b.items)]) {
      const k = rec(i.value) ? i.value.get : void 0;
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
var named2 = (b, t) => String(names.map((k) => b[k]).find((v) => typeof v === "string" && v) ?? (typeof b.id === "string" && b.id ? b.id : t));
var isLit = (v) => v === null || ["boolean", "number", "string"].includes(typeof v);
var isExpr = (v) => v !== void 0 && !Array.isArray(v);
var str = (b, k) => typeof b[k] === "string" && b[k] !== "" ? String(b[k]) : null;
function under(b, drawn) {
  if (drawn === "fallback") return Array.isArray(b.blocks) ? b.blocks : [];
  if (drawn === "hidden") return [];
  const lists = ["blocks", b.type === "table" ? "" : "rows", "buttons"].flatMap((k) => Array.isArray(b[k]) ? b[k] : []);
  return lists.concat(blks(b.rounds).flatMap((r) => Array.isArray(r.blocks) ? r.blocks : []));
}
function role(b, kind) {
  const tap = isBlk(b.tap) ? b.tap : null;
  const wrapped = ["rounds", "swipe"].some((k) => Array.isArray(b[k]) && b[k].length > 0);
  if ((kind === "button" || kind === "row") && tap?.url != null && !wrapped) return "link";
  if (kind === "row" && tap && !wrapped || kind === "button" || kind === "editor") return "button";
  return roles[kind] ?? "group";
}
function node(v, kinds2, state) {
  const b = isBlk(v) ? v : {};
  const kind = str(b, "type") ?? "";
  const field = Object.entries(hooks).find(([k]) => k === kind)?.[1].variant;
  const variant = field ? str(b, field) : null;
  const shown = "show" in b && isExpr(b.show) ? evaluate(b.show, state) : true;
  const off = shown === null || shown === false;
  const drawn = off ? "hidden" : kinds2.includes(kind) ? "native" : "fallback";
  return { kind, id: str(b, "id"), variant, drawn, role: role(b, kind), name: named2(b, kind), children: under(b, drawn).map((c) => node(c, kinds2, state)) };
}
function tree(screen2, kinds2, state) {
  const b = screen2;
  const own2 = {};
  for (const [k, v] of Object.entries(isBlk(b.state) ? b.state : {})) if (isLit(v)) own2[k] = v;
  return node(b, kinds2, state ?? own2);
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
  const [r, g, b] = c.map(lin);
  const [cx, cy, cz] = [
    [0.4124, 0.3576, 0.1805],
    [0.2126, 0.7152, 0.0722],
    [0.0193, 0.1192, 0.9505]
  ].map(([x, y, z]) => x * r + y * g + z * b);
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
  const tints = [needs, ["a red group header", over(r, bg, 0.12)], ["an amber group header", over(a, bg, 0.12)]];
  const text4 = ["--fg", "--mute", "--l", "--link", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a"];
  const states = ["--g", "--a", "--r"];
  for (const b of ["--bg", "--card"]) {
    for (const k of text4) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 4.5 });
    for (const k of states) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 3 });
  }
  checks.push({ what: "--bg on --l", got: ratio(bg, c("--l")), min: 4.5 });
  if (fills === "solid") {
    for (const k of ["--link", "--g", "--a", "--r", "--p", "--c"]) checks.push({ what: `--bg on ${k}`, got: ratio(bg, c(k)), min: 4.5 });
  }
  for (const k of ["--fg", "--mute", "--l"]) checks.push({ what: `${k} on ${needs[0]}`, got: ratio(c(k), needs[1]), min: 4.5 });
  ["--r", "--r", "--a"].forEach((k, i) => {
    const [on, tint] = tints[i];
    checks.push({ what: `${k} on ${on}`, got: ratio(c(k), tint), min: 3 });
  });
  const pairs = [["--g", "--a"], ["--a", "--r"], ["--g", "--r"]];
  for (const x of ["--l", "--link"]) pairs.push(...states.map((y) => [x, y]));
  for (const [x, y] of pairs) checks.push({ what: `\u0394E2000 ${x} \u2194 ${y}`, got: de(c(x), c(y)), min: 20 });
  return checks.filter((m) => m.got < m.min);
}

// src/core/look.ts
var TILES = ":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl)";
var DRAWN = {
  header: ".sec>.sh",
  section: ":is(.sp,.pg,.scn)>.sh",
  title: ":is(.ch>b,.rt)",
  button: ".b-button>span",
  chip: ".chips button>span",
  picked: ".dgn.picked .dgl"
};
var CASE = { "as-is": "none", lower: "lowercase", upper: "uppercase" };
var quote = (t) => `"${t.replace(/[\\"]/g, "\\$&")}"`;
function axes(s) {
  let out = s.type === "default" ? ':root{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' : "";
  if (s.type === "serif") out += ":root{font-family:ui-serif,Georgia,Cambria,serif}";
  if (s.surface === "dashed") out += `${TILES}{border-style:dashed}`;
  if (s.surface === "solid") out += `${TILES}{border-width:2px}`;
  if (s.fills === "outline") out += ".chips button.on,.spi.done .spm{background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)}";
  if (s.marks === "text") out += '.spi.done .spm{width:auto;font-size:0}.spi.done .spm::after{content:"done";font-size:var(--fs-meta)}';
  if (s.sections === "quiet") out += ".sh{font-size:var(--fs-meta);font-weight:400}";
  for (const [role2, at2] of Object.entries(DRAWN)) {
    const l = s.labels?.[role2];
    if (!l) continue;
    out += `${at2}{text-transform:${CASE[l.case ?? "as-is"]}}`;
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
  const tiles2 = { ...defaultStyle, "--radius": `${(style.radius ?? 0) * 12}px` };
  return `:root{${head}${all(tiles2)}${all(look.light.tokens)}}@media (prefers-color-scheme: dark){:root{${all(look.dark.tokens)}}}${axes(style)}`;
}
var tiles = `:where(:root){${vars(defaultStyle).join(";")}}`;
var choose = (setting, dark, schemes = {}) => (setting !== null && Object.prototype.hasOwnProperty.call(schemes, setting) ? schemes[setting] : void 0) ?? defaultPair[dark ? "dark" : "light"];

// src/gen/builders.ts
var screen = (fields) => ({ type: "screen", ...fields });
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

// src/core/table.ts
var SIGN = { THB: "\u0E3F", USD: "$", EUR: "\u20AC" };
var at = (r, id) => r.cells[id];
var unit = (c) => c.kind === "money" ? c.currency ? SIGN[c.currency] ?? c.currency : null : c.unit;
var grouped = (v, d, fixed) => v.toLocaleString("en-US", { minimumFractionDigits: fixed ? d : 0, maximumFractionDigits: d });
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

// src/core/built.ts
var checked = /* @__PURE__ */ Symbol("built");
var KINDS = Object.keys(hooks);
var LISTS = ["blocks", "rows", "buttons"];
var DRAWN2 = ["row", "text", "island"];
var NAMED = ["title", "label", "header", "question", "name", "file", "command", "source", "src"];
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isTable = (o) => o.type === "table" && Array.isArray(o.columns) && Array.isArray(o.rows);
var text3 = (o, k) => typeof o[k] === "string" && o[k] !== "" ? o[k] : void 0;
function tabled(t) {
  const n = t.rows.length;
  const sum = t.columns.find((c) => c.total === "sum");
  const v = sum && total(sum, t.rows);
  const count = `${n} row${n === 1 ? "" : "s"}`;
  const sub = sum && v ? `${count} \xB7 total ${sum.label.toLowerCase()} ${unit(sum) ?? ""}${v[1]}` : count;
  return { title: t.title ?? "Table", subtitle: sub };
}
function plain(o, kind) {
  if (isTable(o)) return tabled(o);
  const subtitle = text3(o, "subtitle");
  const f = { title: NAMED.map((k) => text3(o, k)).find((t) => t !== void 0) ?? kind };
  if (subtitle !== void 0) f.subtitle = subtitle;
  if (isObj(o.tap)) f.tap = o.tap;
  return f;
}
var copy = (v) => isObj(v) ? fill({ ...v }) : v;
var each = (l) => Array.isArray(l) ? l.map(copy) : l;
function fill(o) {
  const kind = typeof o.type === "string" ? o.type : "";
  if (KINDS.includes(kind) && !DRAWN2.includes(kind) && o.fallback === void 0) o.fallback = plain(o, kind);
  for (const k of LISTS) if (k in o) o[k] = each(o[k]);
  if (Array.isArray(o.rounds)) o.rounds = o.rounds.map((r) => isObj(r) && "blocks" in r ? { ...r, blocks: each(r.blocks) } : r);
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

// src/gen/shapes.ts
var kinds = {
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
  "hero": "Hero",
  "images": "Images",
  "island": "Island",
  "lines": "Lines",
  "list": "List",
  "media": "Media",
  "nav": "Nav",
  "prose": "Prose",
  "row": "Row",
  "run": "Run",
  "scene": "Scene",
  "screen": "Screen",
  "secret": "Secret",
  "section": "Section",
  "sheet": "Sheet",
  "stat": "Stat",
  "steps": "Steps",
  "table": "Table",
  "text": "Text",
  "toast": "Toast",
  "web": "Web"
};
var defs = {
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
            "toast"
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
        "$ref": "#/$defs/Sheet",
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
        "additionalProperties": {
          "$ref": "#/$defs/Node"
        },
        "type": [
          "object",
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
      "options": {
        "items": {
          "type": "string"
        },
        "type": [
          "array",
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
      "type": {
        "$ref": "#/$defs/FieldKind"
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
      "type",
      "name"
    ],
    "type": "object"
  },
  "FieldKind": {
    "anyOf": [
      {
        "enum": [
          "text",
          "toggle",
          "picker",
          "secret"
        ],
        "type": "string"
      },
      {
        "type": "string"
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
    "required": [
      "title"
    ],
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
  "Sheet": {
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
      }
    },
    "required": [
      "title",
      "blocks"
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
      "columns": {
        "items": {
          "$ref": "#/$defs/Column"
        },
        "type": "array"
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
  if (Array.isArray(top.rounds)) top.rounds = top.rounds.map((r) => isObj3(r) && "blocks" in r ? { ...r, blocks: [] } : r);
  return top;
}
function sentOnce(top) {
  const seen = /* @__PURE__ */ new Set();
  const action = (w) => isObj3(top[w]) ? str2(top[w].action) : void 0;
  const twice = WORDS.filter((w) => {
    const a = action(w);
    return a !== void 0 && (seen.has(a) || !seen.add(a));
  });
  const v = { ...top };
  for (const w of twice) delete v[w];
  return v;
}
function placed(o) {
  const lists = LISTS2.filter((k) => (o.type !== "table" || k !== "rows") && k in o).map((k) => [k, o[k]]);
  const rounds = Array.isArray(o.rounds) ? o.rounds : [];
  rounds.forEach((r, i) => isObj3(r) && "blocks" in r && lists.push([`rounds/${i}/blocks`, r.blocks]));
  return lists.flatMap(([at2, l]) => Array.isArray(l) ? l.map((v, i) => [`${at2}/${i}`, v]) : []);
}
function unplaced(s) {
  const steps2 = Array.isArray(s.steps) ? s.steps : [];
  if (steps2.length === 0) return void 0;
  const at2 = s.current == null ? void 0 : steps2.some((x) => isObj3(x) && x.id === s.current);
  const done = s.done === true;
  if (s.bars != null) return "a steps block with both steps and bars";
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
    this.out = [];
    this.app = app;
  }
  block(v, at2, scope) {
    if (!isObj3(v)) {
      this.out.push({ fault: "shape", kind: "", why: "a block that is no object" });
      return;
    }
    const kind = str2(v.type) ?? "";
    const id = str2(v.id);
    if (id === "") this.out.push({ fault: "unnamed", kind });
    else if (id !== void 0) {
      const first = this.ids.get(id);
      this.ids.set(id, at2);
      if (first !== void 0) this.out.push({ fault: "twice", id, at: [first, at2] });
    } else if (kind === "island" || WORDS.some((w) => isObj3(v[w]))) this.out.push({ fault: "unnamed", kind });
    const core = KINDS2.includes(kind);
    const fallback = isObj3(v.fallback) ? str2(v.fallback.title) : void 0;
    if ((kind === "island" || this.app.includes(kind) && !core) && !fallback) this.out.push({ fault: "bare", kind, id: id ?? "" });
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
    const action = str2(v.action);
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
    const fields = kind === "form" || kind === "config" ? Array.isArray(o.fields) ? o.fields : [] : [];
    const names2 = kind === "chips" ? [o.name] : fields.map((f) => isObj3(f) ? f.name : void 0);
    for (const n of names2) if (typeof n === "string") this.keys.push(n);
  }
};
function gets(v, out) {
  if (Array.isArray(v)) return v.forEach((x) => gets(x, out));
  if (!isObj3(v)) return;
  const keys = Object.keys(v);
  const get = str2(v.get);
  if (keys.length === 1 && get !== void 0) return out.push(get);
  for (const k of keys) if (k !== "calc") gets(v[k], out);
}
function check(screen2, app = []) {
  const w = new Walk(app);
  for (const kind of app) if (KINDS2.includes(kind)) w.out.push({ fault: "clash", kind });
  if (isObj3(screen2) && isObj3(screen2.state)) w.keys.push(...sorted(screen2.state));
  w.block(screen2, "", "");
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
  const action = str2(v.action);
  if (action !== void 0) out.add(action);
  for (const x of Object.values(v)) named3(x, out);
}
function actions(screen2) {
  const out = /* @__PURE__ */ new Set();
  named3(screen2, out);
  return [...out].sort();
}
export {
  actions,
  built,
  button,
  card,
  chart,
  check,
  chips,
  choice,
  choose,
  composer,
  config,
  css,
  defaultPair,
  defaultStyle,
  diagram,
  diff,
  editor,
  evaluate,
  expect,
  expr,
  form,
  gate,
  hero,
  hooks,
  images,
  island,
  lines,
  linkable,
  list2 as list,
  media,
  names,
  nav,
  prose,
  roles,
  row,
  run,
  scene,
  screen,
  secret,
  section,
  share,
  sheet,
  start,
  stat,
  steps,
  table,
  text2 as text,
  tiles,
  toast,
  tree,
  view,
  web
};
