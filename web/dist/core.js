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
  prose: { variant: null, parts: [] },
  hero: { variant: null, parts: ["title", "subtitle", "actions"] },
  media: { variant: null, parts: [] },
  nav: { variant: null, parts: [] },
  island: { variant: null, parts: [] }
};
var roles = { section: "region", form: "form", config: "form", nav: "navigation" };
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

// src/core/eval.ts
var own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
var rec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var UNKNOWN = { "?": null };
var PAIRS = { eq: 2, lt: 2, has: 2, add: 2, sub: 2, pick: 3 };
var PATTERNS = ["filled", "email", "url", "number"];
function read(v) {
  if (Array.isArray(v)) return void 0;
  if (!rec(v)) return v;
  const keys = Object.keys(v);
  const k = keys[0] ?? "";
  const a = v[k];
  const one = (x) => x === void 0 ? UNKNOWN : { [k]: x };
  const list2 = (n) => {
    if (!Array.isArray(a) || n !== void 0 && a.length !== n) return UNKNOWN;
    const xs = a.map(read);
    return xs.includes(void 0) ? UNKNOWN : { [k]: xs };
  };
  if (keys.length !== 1) return UNKNOWN;
  if (k === "get") return typeof a === "string" ? v : UNKNOWN;
  if (k === "not" || k === "len") return one(read(a));
  if (k === "all" || k === "any" || k === "cat") return list2();
  if (own(PAIRS, k)) return list2(PAIRS[k]);
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
  const at = s.indexOf("@");
  if (at < 0) return false;
  const [user, host] = [s.slice(0, at), s.slice(at + 1)];
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
  const all = [...list(b.actions), ...list(b.swipe), ...list(b.menu), ...rec(b.button) ? [b.button] : []];
  return [...all, ...all.flatMap((a) => list(a.menu))];
};
var lit = (v) => v === null || typeof v === "boolean" || typeof v === "number" || typeof v === "string" ? v : null;
function start(screen) {
  const s = {};
  const seed = (b) => {
    for (const f of named(b)) s[String(f.name)] = lit(f.value);
    if (b.type === "chips" && typeof b.name === "string") s[b.name] = lit(Array.isArray(b.selected) ? b.selected[0] : null);
    kids(b).forEach(seed);
  };
  if (rec(screen)) {
    for (const [k, v] of Object.entries(rec(screen.state) ? screen.state : {})) s[k] = lit(v);
    seed(screen);
  }
  return s;
}
function view(screen, s) {
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
  if (rec(screen)) walk(screen);
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
  const lists = ["blocks", "rows", "buttons"].flatMap((k) => Array.isArray(b[k]) ? b[k] : []);
  return lists.concat(blks(b.rounds).flatMap((r) => Array.isArray(r.blocks) ? r.blocks : []));
}
function role(b, kind) {
  const tap = isBlk(b.tap) ? b.tap : null;
  const wrapped = ["rounds", "swipe"].some((k) => Array.isArray(b[k]) && b[k].length > 0);
  if ((kind === "button" || kind === "row") && tap?.url != null && !wrapped) return "link";
  if (kind === "row" && tap && !wrapped || kind === "button" || kind === "editor") return "button";
  return roles[kind] ?? "group";
}
function node(v, kinds, state) {
  const b = isBlk(v) ? v : {};
  const kind = str(b, "type") ?? "";
  const field = Object.entries(hooks).find(([k]) => k === kind)?.[1].variant;
  const variant = field ? str(b, field) : null;
  const shown = "show" in b && isExpr(b.show) ? evaluate(b.show, state) : true;
  const off = shown === null || shown === false;
  const drawn = off ? "hidden" : kinds.includes(kind) ? "native" : "fallback";
  return { kind, id: str(b, "id"), variant, drawn, role: role(b, kind), name: named2(b, kind), children: under(b, drawn).map((c) => node(c, kinds, state)) };
}
function tree(screen, kinds, state) {
  const b = screen;
  const own2 = {};
  for (const [k, v] of Object.entries(isBlk(b.state) ? b.state : {})) if (isLit(v)) own2[k] = v;
  return node(b, kinds, state ?? own2);
}
var who = (n) => `${n.kind}${n.id ? `#${n.id}` : ""}`;
function expect(got, want, at = "tree", out = []) {
  if (!got || want.kind !== got.kind || (want.id ?? null) !== (got.id ?? null) || want.drawn !== got.drawn) {
    out.push(`${at}: drew ${got ? `${who(got)} ${got.drawn}` : "nothing"}, expected ${who(want)} ${want.drawn}`);
    return out;
  }
  const here = `${at}/${who(got)}`;
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
function gate(s) {
  const c = (k) => rgb(s.tokens[k]);
  const checks = [];
  const [bg, r, a] = [c("--bg"), c("--r"), c("--a")];
  const needs = ["the needs-you card", over(r, bg, 0.15)];
  const tints = [needs, ["a red group header", over(r, bg, 0.12)], ["an amber group header", over(a, bg, 0.12)]];
  const text2 = ["--fg", "--mute", "--l", "--link", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a"];
  const states = ["--g", "--a", "--r"];
  for (const b of ["--bg", "--card"]) {
    for (const k of text2) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 4.5 });
    for (const k of states) checks.push({ what: `${k} on ${b}`, got: ratio(c(k), c(b)), min: 3 });
  }
  checks.push({ what: "--bg on --l", got: ratio(bg, c("--l")), min: 4.5 });
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
export {
  defaultPair,
  defaultStyle,
  evaluate,
  expect,
  gate,
  hooks,
  names,
  roles,
  start,
  tree,
  view
};
