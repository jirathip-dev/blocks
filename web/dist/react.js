// react/src/view.ts
import { createElement as createElement8, useMemo as useMemo2, useRef as useRef5, useSyncExternalStore } from "react";
import { hooks as hooks2, share } from "./core.js";

// react/src/act.ts
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { check, evaluate, linkable, start, view } from "./core.js";

// react/src/h.ts
import { createElement } from "react";
var h = (tag, cls, attrs, ...kids2) => createElement(tag, { ...attrs, className: [attrs?.className, cls].filter(Boolean).join(" ") || void 0 }, ...kids2);

// react/src/act.ts
var none = { hidden: /* @__PURE__ */ new Set(), disabled: /* @__PURE__ */ new Set(), says: {}, acts: /* @__PURE__ */ new Set(), values: {} };
var Cx = createContext({ screen: "", locale: {}, v: none, state: {}, edits: {}, put: () => {
}, busy: /* @__PURE__ */ new Set(), act: async () => false, tap: () => {
}, report: () => {
}, kinds: {}, islands: {} });
var goOf = (t) => t.open != null ? { open: t.open } : t.sheet != null ? { sheet: t.sheet } : t.thread != null ? { thread: t.thread } : null;
function useCx(p, screen2) {
  const props = useRef(p);
  props.current = p;
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(/* @__PURE__ */ new Set());
  const [asking, setAsking] = useState(null);
  const state = start(screen2);
  for (const [k, x] of Object.entries(edits)) if (Object.prototype.hasOwnProperty.call(state, k)) state[k] = x;
  const v = view(screen2, state);
  const live = useRef({ screen: screen2, state, v, busy: /* @__PURE__ */ new Set() });
  live.current = { ...live.current, screen: screen2, state, v };
  useEffect(() => {
    const out2 = props.current.onReport;
    if (out2) for (const fault of check(screen2, Object.keys(props.current.kinds ?? {}))) out2({ what: "fault", fault });
  }, [screen2]);
  const key = JSON.stringify([[...v.hidden], [...v.disabled], v.says, [...v.acts], v.values, [...busy], state, edits]);
  const cx = useMemo(() => {
    const report = (r) => props.current.onReport?.(r);
    const mark = (k, on) => {
      const b = live.current.busy;
      if (on) b.add(k);
      else b.delete(k);
      setBusy(new Set(b));
    };
    const act2 = async (a) => {
      const k = a.block ?? a.action;
      if (live.current.busy.has(k) || a.block != null && live.current.v.disabled.has(a.block)) return false;
      const c = a.confirm;
      if (c && !await new Promise((done) => setAsking({ c, done }))) return false;
      mark(k, true);
      try {
        const sent = { screen: String(live.current.screen.id ?? ""), action: a.action, block: a.block ?? null, values: a.values ?? null };
        return await props.current.onAction(sent) !== false;
      } catch (error) {
        report({ what: "failed", action: a.action, error });
        return false;
      } finally {
        mark(k, false);
      }
    };
    const tap = (t) => {
      const go = goOf(t);
      if (go) props.current.onOpen?.(go);
      if (t.url != null && linkable(t.url)) window.open(t.url, "_blank", "noopener");
      if (t.copy != null) void navigator.clipboard?.writeText(t.copy);
      const sets = {};
      for (const x of t.set ?? []) sets[x.key] = evaluate(x.to, live.current.state);
      if (t.set?.length) setEdits((e) => ({ ...e, ...sets }));
      if (!go && t.action) void act2({ action: t.action, values: t.values });
    };
    const put = (k, to) => setEdits((e) => ({ ...Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)), ...to === void 0 ? null : { [k]: to } }));
    return { screen: String(screen2.id ?? ""), locale: screen2.locale ?? {}, v, state, edits, put, busy, act: act2, tap, report, kinds: p.kinds ?? {}, islands: p.islands ?? {}, file: p.onFile };
  }, [key, screen2.id, p.kinds, p.islands, p.onFile]);
  const end = (ok) => {
    asking?.done(ok);
    setAsking(null);
  };
  const button2 = (label, ok, cls = "") => h("button", cls, { type: "button", onClick: () => end(ok) }, h("span", "", null, label));
  const ask = asking ? h("div", "b-confirm", { role: "dialog" }, h("p", "", null, h("b", "", null, asking.c.title)), asking.c.message ? h("p", "m", null, asking.c.message) : null, h("div", "bar", null, button2("cancel", false), button2(asking.c.ok ?? "ok", true, asking.c.destructive ? "bad" : ""))) : null;
  return { cx, ask };
}

// react/src/block.ts
import { Component, createElement as createElement7, memo, useContext as useContext10 } from "react";
import { hooks, named, role } from "./core.js";

// react/src/draw.ts
import { actionOf, figured, linkable as linkable2, value } from "./core.js";
var urlOf = (t) => t?.url != null && linkable2(t.url) ? t.url : void 0;
var sends = (t, action) => {
  const a = t ? t.url != null || t.open != null || t.sheet != null ? null : t.action : action;
  return typeof a === "string" && a ? a : void 0;
};
var out = (url) => ({ href: url, target: "_blank", rel: "noopener" });
var press = (go) => ({ role: "button", tabIndex: 0, onClick: go, onKeyDown: (e) => e.key === "Enter" && go() });
var btn = (label, cls, url, action, attrs, off = false) => {
  const own2 = { "data-action": typeof action === "string" && action ? action : void 0, ...attrs };
  const span = h("span", "", null, String(label ?? ""));
  return url ? h("a", `btn ${cls}`, { ...own2, ...out(url) }, span) : h("button", cls, { type: "button", ...own2, disabled: off || void 0 }, span);
};
var act = (a, cls, cx, url, go) => {
  const k = actionOf(a);
  return btn(a.label, cls, url, sends(a.tap, a.action), { "data-act": k || void 0, onClick: go }, k !== void 0 && cx.v.acts.has(k));
};
var rec = (v) => typeof v === "object" && v !== null;
function ticked(v, cx) {
  if (rec(v) && typeof v.get === "string") return h("span", "", { "data-get": v.get }, cx.v.values[v.get] ?? "");
  return rec(v) && ("since" in v || "until" in v) ? h("span", "", { "data-tick": JSON.stringify(v) }, value(v)) : value(v);
}
var figure = (f, cls) => {
  const s = String(f.state);
  const { glyph, word: word2, tone } = figured(s);
  return h("span", `rsg ${s} ${cls}`, { role: "img", "aria-label": word2, title: word2 }, h("i", `gl ${tone}`, null, glyph));
};
function inline(s, stages) {
  const [stage, ...rest] = stages;
  if (!stage) return s ? [s] : [];
  const next = (t) => inline(t, rest);
  const got = [];
  let at = 0;
  for (const m of s.matchAll(stage[0])) {
    got.push(...next(s.slice(at, m.index)), stage[1](m, next));
    at = (m.index ?? 0) + m[0].length;
  }
  return [...got, ...next(s.slice(at))];
}
function md(s, refs) {
  const link = new RegExp(String.raw`\[([^\]]+)\]\((https?:[^)\s]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)])|\b(${refs ? "t\\d+" : "(?!)"})\b`, "g");
  const stages = [
    [/`([^`]+)`/g, (m, n) => h("code", "", null, ...n(m[1]))],
    [/\*\*([^*]+)\*\*/g, (m, n) => h("b", "", null, ...n(m[1]))],
    [link, (m, n) => m[4] ? h("a", "", { href: "#", "data-thread": m[4] }, m[4]) : h("a", "", out(m[2] ?? m[3]), ...n(m[1] ?? m[3]))],
    [/\n/g, () => h("br", "", null)]
  ];
  const cb = (part) => h("div", "cb", null, h("pre", "", null, part.replace(/\n$/, "")), h("button", "cpy", { type: "button" }, h("span", "", null, "copy")));
  return String(s ?? "").split(/```(?:[a-z]*)\n?/).flatMap((part, i) => i % 2 ? [cb(part)] : inline(part, stages));
}

// react/src/kinds/button.ts
import { useContext } from "react";
function button({ b, hooks: hooks3 }) {
  const cx = useContext(Cx);
  const url = urlOf(b.tap);
  const go = () => b.tap ? cx.tap(b.tap) : void cx.act({ action: b.action ?? "", block: b.id, values: b.values ?? {}, confirm: b.confirm });
  return btn(b.label, b.style ?? "", url, sends(b.tap, b.action), { ...hooks3, "data-id": b.id ?? "", onClick: url ? void 0 : go }, b.id != null && cx.v.disabled.has(b.id));
}

// react/src/kinds/card.ts
import { useContext as useContext2, useState as useState2 } from "react";
function card({ b, hooks: hooks3 }) {
  const cx = useContext2(Cx);
  const [open, setOpen] = useState2(false);
  const cls = `card ${b.tone ?? ""} k-${b.kind ?? ""}`;
  const attrs = { ...hooks3, "data-id": b.id ?? "" };
  const fold = b.fold ?? null;
  const main = fold?.main ?? null;
  const shut = fold !== null && !open;
  const send2 = main && (() => void cx.act({ action: main.action, block: main.block, values: { ...main.values, choice: main.value } }));
  const flip = (e) => e.target instanceof Element && e.target.closest("button") || setOpen((o) => !o);
  const mainBtn = main && shut ? btn(main.label, "main", void 0, main.action, { onClick: send2 }) : null;
  const line = fold ? h("div", "fold", { tabIndex: 0, role: "button", "aria-expanded": String(!shut), onClick: flip }, h("span", "fl", null, fold.line), mainBtn) : null;
  if (shut) return h("div", cls, attrs, line);
  const badge = b.badge ? [" ", h("span", `tag b-card__badge ${b.badge.tone ?? ""}`, null, ticked(b.badge.text, cx))] : [];
  const meta = b.meta ? [" ", h("span", "m", null, ticked(b.meta, cx))] : [];
  const head = b.title || b.badge ? h("div", "ch", null, h("b", "b-card__title", null, b.title ?? ""), ...badge, ...meta) : null;
  const buttons = b.buttons ?? [];
  const bar = buttons.length ? h("div", "bar b-card__actions", null, ...kids(buttons)) : null;
  return h("div", cls, attrs, line, head, b.subtitle ? h("p", "m b-card__subtitle", null, b.subtitle) : null, ...kids(b.blocks), bar);
}

// react/src/kinds/chips.ts
import { useContext as useContext3 } from "react";
function chips({ b, hooks: hooks3 }) {
  const cx = useContext3(Cx);
  const sel = b.selected ?? [];
  const pick2 = (v) => {
    const next = !b.multi || v === "all" ? [v] : sel.includes(v) ? sel.filter((x) => x !== v) : [...sel.filter((x) => x !== "all"), v];
    void cx.act({ action: b.action ?? "", block: b.id, values: { [b.name]: next.length ? next : ["all"] } });
  };
  const chip = (o) => btn(o.label, sel.includes(o.value) ? "on" : "", void 0, b.action, { key: o.value, "aria-pressed": String(sel.includes(o.value)), onClick: () => pick2(o.value) });
  return h("div", "chips", hooks3, ...b.options.map(chip));
}

// react/src/kinds/form.ts
import { useContext as useContext4, useRef as useRef3, useState as useState4 } from "react";
import { fill as fill2, lit } from "./core.js";

// src/gen/words.ts
var words = {
  was: ["was", "\u0E40\u0E14\u0E34\u0E21"],
  set: ["set \u2713 \xB7 type to replace", "\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27 \u2713 \xB7 \u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E41\u0E17\u0E19\u0E17\u0E35\u0E48"],
  unset: ["not set", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07"],
  file1: ["choose file", "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E1F\u0E25\u0E4C"],
  fileN: ["add files", "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E44\u0E1F\u0E25\u0E4C"],
  photo1: ["choose photo", "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E39\u0E1B"],
  photoN: ["add photos", "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E39\u0E1B"],
  camera: ["take photo", "\u0E16\u0E48\u0E32\u0E22\u0E23\u0E39\u0E1B"],
  replace: ["replace", "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19"],
  remove: ["remove", "\u0E25\u0E1A"],
  retry: ["retry", "\u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"],
  dismiss: ["dismiss", "\u0E1B\u0E34\u0E14"],
  image: ["images", "\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E"],
  pdf: ["PDF", "PDF"],
  sheet: ["sheets", "\u0E44\u0E1F\u0E25\u0E4C\u0E15\u0E32\u0E23\u0E32\u0E07"],
  or: [" or ", " \u0E2B\u0E23\u0E37\u0E2D "],
  upTo: ["up to {mb} MB", "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 {mb} MB"],
  each: ["up to {mb} MB each", "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 {mb} MB \u0E15\u0E48\u0E2D\u0E44\u0E1F\u0E25\u0E4C"],
  uploading: ["uploading {p} %", "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14 {p} %"],
  failed: ["upload failed", "\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"],
  onlyType: ["refused: only {types}", "\u0E44\u0E21\u0E48\u0E23\u0E31\u0E1A: \u0E23\u0E31\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30{types}"],
  tooBig: ["refused: {size} is over {mb} MB", "\u0E44\u0E21\u0E48\u0E23\u0E31\u0E1A: {size} \u0E40\u0E01\u0E34\u0E19 {mb} MB"],
  off: ["uploads are off here", "\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48"],
  wait1: ["waiting for {n} upload", "\u0E23\u0E2D\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14 {n} \u0E44\u0E1F\u0E25\u0E4C"],
  waitN: ["waiting for {n} uploads", "\u0E23\u0E2D\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14 {n} \u0E44\u0E1F\u0E25\u0E4C"],
  stuck: ["an upload failed: retry or remove it", "\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: \u0E25\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E1A"],
  files: ["{label}, {n} files", "{label}, {n} \u0E44\u0E1F\u0E25\u0E4C"]
};

// react/src/fields/_view.ts
var word = (c, key) => words[key]?.[c.locale.lang === "th" ? 1 : 0] ?? "";

// react/src/fields/_input.ts
import { createElement as createElement2 } from "react";
function input(x, c, attrs, password, placeholder) {
  const kb = x.keyboard ?? "default";
  const was = password ? "" : String(x.value ?? "");
  const own2 = { type: password ? "password" : kb === "url" ? "url" : "text", inputMode: kb === "default" ? void 0 : kb === "number" ? "decimal" : "url" };
  const draft = password ? void 0 : c.key + x.name;
  const value2 = c.value == null ? "" : String(c.value);
  return createElement2("input", { ...attrs, ...own2, value: value2, placeholder, autoComplete: "off", "data-was": was, "data-draft": draft, onChange: (e) => c.put(e.target.value) });
}

// react/src/fields/text.ts
var text = { draw: (x, c, attrs) => input(x, c, attrs, false, x.placeholder ?? "") };

// react/src/fields/picker.ts
import { createElement as createElement3 } from "react";
var opts = (x) => [...new Set([x.value, ...x.options ?? []].filter((o) => o != null && o !== "").map(String))];
var picker = {
  draw: (x, c, attrs) => createElement3("select", { ...attrs, value: c.value == null || c.value === "" ? opts(x)[0] : String(c.value), onChange: (e) => c.put(e.target.value) }, ...opts(x).map((o) => createElement3("option", { key: o, value: o }, o))),
  sent: (x, v) => v == null || v === "" ? opts(x)[0] ?? "" : v
};

// react/src/fields/secret.ts
var secret = {
  draw: (x, c, attrs) => input({ name: x.name }, c, attrs, true, x.set ? word(c, "set") : x.placeholder ?? word(c, "unset")),
  sent: (_x, v) => v === "" || v == null ? void 0 : v
};

// react/src/fields/toggle.ts
import { createElement as createElement4 } from "react";
var toggle = {
  row: " tg",
  draw: (_x, c, attrs) => createElement4("input", { ...attrs, type: "checkbox", role: "switch", checked: !!c.value, onChange: (e) => c.put(e.target.checked) }),
  sent: (_x, v) => !!v
};

// react/src/fields/upload.ts
import { createElement as createElement5, useRef as useRef2, useState as useState3 } from "react";
import { accepts, fill, held, hint, ids, pick, picked, send, status, waits } from "./core.js";
function item(x, r, w, drop, again) {
  const line = status(x, r, w);
  const hide = { "aria-hidden": "true" };
  const head = r.src && r.state !== "refused" ? h("img", "fut", { ...hide, src: r.src, alt: "" }) : h("span", "fux", hide, r.state === "refused" ? "!" : (r.name.split(".").pop() ?? "").slice(0, 4));
  const p = Math.round(r.part * 100);
  const bar = { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p), "aria-label": r.name, style: { "--v": p } };
  const b = (k, f, cls = "") => btn(w(k), cls, void 0, void 0, { "aria-label": `${w(k)} ${r.name}`, onClick: f });
  const acts = r.state === "failed" ? [b("retry", () => again(r)), b("remove", () => drop(r), "bad")] : [b(r.state === "refused" ? "dismiss" : "remove", () => drop(r))];
  const m = h("span", "fum", null, h("span", "fun", null, r.name), r.state === "uploading" ? h("span", "pgt", bar, h("b", "", null)) : null, h("span", "fus", null, line));
  return h("li", `fui ${r.state}`, { key: r.id ?? `${r.name}~${r.size}`, "aria-label": `${r.name}, ${line}` }, head, m, h("span", "fua", null, ...acts));
}
function Upload({ x, c, attrs }) {
  const w = (k) => word(c, k);
  const [rows, setRows] = useState3(() => held(x));
  const live = useRef2(rows);
  const input2 = useRef2(null);
  const changed = (next) => {
    live.current = next;
    setRows(next);
    c.hold(ids(next), waits(next));
  };
  const go = (r) => c.file && send(r, c.file, { screen: c.screen, block: c.block, field: x.name }, () => changed([...live.current]));
  const drop = (r) => {
    r.stop?.abort();
    changed(live.current.filter((o) => o !== r));
  };
  const open = (camera) => {
    const i = input2.current;
    if (camera) i?.setAttribute("capture", "environment");
    else i?.removeAttribute("capture");
    i?.click();
  };
  const take = (e) => {
    const files = Array.from(e.target.files ?? []);
    const next = picked(x, live.current, files, files.map((f) => f.name));
    e.target.value = "";
    changed(next.rows);
    next.send.forEach(go);
  };
  const label = x.label ?? x.name;
  const choice = pick(x, rows, w);
  const tip = hint(x, w, !!c.file);
  const off = !c.file;
  const fub = h(
    "div",
    "fub",
    null,
    x.capture ? btn(w("camera"), "fuc", void 0, void 0, { onClick: () => open(true) }, off) : null,
    btn(choice, "", void 0, void 0, { "aria-label": `${choice}: ${label}`, onClick: () => open(false) }, off),
    tip ? h("span", "fuh", null, tip) : null,
    h("input", "", { ref: input2, type: "file", tabIndex: -1, multiple: !!x.many, accept: accepts(x.accept ?? []), "aria-hidden": "true", onChange: take })
  );
  const named2 = { role: "group", "data-field": x.name, "aria-label": fill(w("files"), { label, n: rows.filter((r) => r.state !== "refused").length }), "aria-invalid": attrs["aria-invalid"] };
  return h("div", "fu", named2, x.error ? h("span", "fe", null, x.error) : null, rows.length ? h("ul", "fuf", null, ...rows.map((r) => item(x, r, w, drop, go))) : null, fub);
}
var upload = {
  row: " up",
  group: true,
  draw: (x, c, attrs) => createElement5(Upload, { x, c, attrs }),
  sent: (x) => ids(held(x))
};

// react/src/gen/fields.ts
var views = { picker, secret, text, toggle, upload };

// react/src/kinds/form.ts
var viewOf = (x) => views[x.type] ?? text;
var note = (x, was) => x.error ? ["fn err", x.error] : x.was != null ? ["fn was", `${was} ${x.was}`] : ["fn", x.doc ?? ""];
function field(x, key, cx, held2) {
  const v = viewOf(x);
  const [cls, say] = note(v.group ? { ...x, error: null } : x, word(cx, "was"));
  const said = Object.prototype.hasOwnProperty.call(cx.edits, x.name) ? cx.v.says[x.name] : void 0;
  const attrs = { name: x.name, disabled: cx.v.disabled.has(x.name) || void 0, "aria-invalid": x.error ? "true" : void 0 };
  const hold = (sent, w) => {
    held2.sent[x.name] = sent;
    held2.wait(x.name, w);
    cx.put(x.name, lit(x, sent));
  };
  const c = { locale: cx.locale, key, value: cx.state[x.name] ?? null, put: (to) => cx.put(x.name, to), screen: cx.screen, block: held2.block, file: cx.file, hold };
  const control = v.draw(x, c, attrs);
  const l = `fd${v.row ?? ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`;
  return h(v.group ? "div" : "label", l, { key: x.name, hidden: cx.v.hidden.has(x.name) || void 0 }, h("span", "fl", null, h("span", "fk", null, x.label ?? x.name), h("span", cls, null, say)), control, said ? h("span", "fe", null, said) : null);
}
function form({ b, hooks: hooks3 }) {
  const cx = useContext4(Cx);
  const s = b.submit;
  const sent = useRef3({});
  const [waits2, setWaits] = useState4({});
  const held2 = { sent: sent.current, wait: (n, w) => setWaits((o) => ({ ...o, [n]: w })), block: b.id ?? void 0 };
  const rows = b.fields.map((x) => field(x, `draft:${cx.screen}:${String(b.id)}:`, cx, held2));
  if (!s) return h("div", "form", { ...hooks3, "data-id": b.id ?? "" }, ...rows);
  const values = () => {
    const v = {};
    for (const x of b.fields) {
      const own2 = viewOf(x).sent;
      const got = Object.prototype.hasOwnProperty.call(sent.current, x.name) ? sent.current[x.name] : own2 ? own2(x, cx.state[x.name] ?? null) : cx.state[x.name];
      if (typeof got === "string" || typeof got === "boolean" || typeof got === "number" || Array.isArray(got)) v[x.name] = got;
    }
    return v;
  };
  const send2 = () => {
    const v = values();
    if (Object.values(v).every((x) => !String(x || "").trim())) return;
    void cx.act({ action: s.action, block: b.id, values: { ...s.values, ...v } }).then((ok) => ok && b.fields.forEach((x) => cx.put(x.name, void 0)));
  };
  const enter = (e) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement) || e.target.type === "checkbox") return;
    e.preventDefault();
    send2();
  };
  const busy = cx.busy.has(b.id ?? s.action);
  const all = Object.values(waits2), up = all.reduce((n, w) => n + w.up, 0), bad = all.some((w) => w.failed > 0);
  const off = b.id != null && cx.v.disabled.has(b.id) || up > 0 || bad;
  const go = btn(busy ? "sending\u2026" : s.label, "", void 0, s.action, { "data-submit": "", onClick: send2 }, off);
  const line = bad ? word(cx, "stuck") : up ? fill2(word(cx, up > 1 ? "waitN" : "wait1"), { n: up }) : "";
  const wait = b.fields.some((x) => viewOf(x).group) ? h("span", `say-busy${bad ? " bad" : ""}`, null, line) : null;
  return h("div", "form say", { ...hooks3, "data-id": b.id ?? "", onKeyDown: enter }, ...rows, wait, go);
}

// react/src/kinds/images.ts
import { linkable as linkable3 } from "./core.js";
function images({ b, hooks: hooks3 }) {
  const item2 = (i, n) => {
    if (!linkable3(i.src)) return h("span", "", { key: n }, i.alt ?? "");
    const src = i.src.replace(/^[/]/, "");
    return h("a", "", { key: n, ...out(src) }, h("img", "", { src, alt: i.alt ?? "", loading: "lazy" }));
  };
  return h("div", "imgs", hooks3, ...b.items.map(item2));
}

// react/src/kinds/list.ts
var list = ({ b, hooks: hooks3 }) => h("div", "list", hooks3, ...kids(b.rows));

// react/src/kinds/row.ts
import { useContext as useContext5, useRef as useRef4, useState as useState5 } from "react";
function round(d, now, cx) {
  const tap = now ? null : d.tap ?? null;
  const url = urlOf(tap);
  const parts = [h("span", "rdn", null, d.name), h("span", "rdu", null, d.summary ?? ""), d.since ? h("span", "rdt", null, ticked({ since: d.since }, cx)) : null, tap ? h("span", "rc", null, "\u203A") : null];
  const pressed = tap && { "data-action": sends(tap), ...press(() => cx.tap(tap)) };
  const l = url ? h("a", "rdl tap", out(url), ...parts) : h("div", tap ? "rdl tap" : "rdl", pressed || null, ...parts);
  const links = d.links ?? [];
  const lines = d.lane?.lines ?? [];
  const line = (t, i) => d.state === "working" && i === lines.length - 1 ? h("div", "live", null, `\u258D ${t}`) : h("div", "", null, t);
  const lane = d.lane ? [h("div", "rdh", null, [d.lane.name, d.lane.harness, d.lane.model, d.lane.host].filter(Boolean).join(" \xB7 ")), h("div", "rdo", null, ...lines.map(line))] : [];
  const link = links.map((k) => btn(k.label, "", urlOf(k.tap), sends(k.tap), { onClick: urlOf(k.tap) ? void 0 : () => cx.tap(k.tap) }));
  const body = now && (d.lane || d.blocks?.length || links.length) ? h("div", "rdb", null, ...lane, ...kids(d.blocks), links.length ? h("div", "rdk", null, ...link) : null) : null;
  return h("li", `rd ${d.state}${now ? " now" : ""}`, null, h("i", "rdm", { "aria-label": d.state }), h("div", "rdx", null, l, body));
}
function row({ b, hooks: hooks3 }) {
  const cx = useContext5(Cx);
  const [flip, setFlip] = useState5(false);
  const x0 = useRef4(0);
  const toggle2 = () => setFlip((f) => !f);
  const cls = `row${b.style === "link" ? " link" : ""}${b.sticky ? " sticky" : ""}${b.indent ? " in" + Math.min(b.indent, 3) : ""}`;
  const rounds = b.rounds ?? [];
  const last = rounds[rounds.length - 1];
  const open = last !== void 0 && last.state === "needs" !== flip;
  const sub = b.subtitle == null || open ? null : typeof b.subtitle === "string" ? { text: b.subtitle, tone: null } : b.subtitle;
  const badge = b.badge ? [" ", h("span", `tag b-row__badge ${b.badge.tone ?? ""}`, null, ticked(b.badge.text, cx))] : [];
  const main = h("span", "rm", null, h("span", "rt b-row__title", null, b.title ?? ""), ...badge, sub ? h("span", `rs b-row__subtitle ${sub.tone ?? ""}`, null, ticked(sub.text, cx)) : null);
  const parts = [b.figure ? figure(b.figure, "b-row__figure") : null, main, b.value != null ? h("span", "rv b-row__value", null, ticked(b.value, cx)) : null];
  const id = { "data-id": b.id ?? "" };
  if (last) {
    const r = h("div", `${cls} tap`, { ...id, "aria-expanded": String(open), ...press(toggle2) }, ...parts, h("span", "rc", null, "\u203A"));
    return h("div", `rr${open ? " open" : ""}`, hooks3, r, open ? h("ol", "rds", null, ...rounds.map((d) => round(d, d === last, cx))) : null);
  }
  const url = urlOf(b.tap);
  const swipe = b.swipe ?? [];
  const tapped = !url && (b.tap != null || swipe.length > 0);
  const own2 = { ...id, ...tapped ? { "data-action": sends(b.tap), ...press(() => b.tap ? cx.tap(b.tap) : toggle2()) } : null };
  const rc = url || tapped ? `${cls} tap` : cls;
  if (!swipe.length) return url ? h("a", rc, { ...hooks3, ...own2, ...out(url) }, ...parts) : h("div", rc, { ...hooks3, ...own2 }, ...parts);
  const touch = { onTouchStart: (e) => x0.current = e.touches[0].clientX, onTouchEnd: (e) => x0.current - e.changedTouches[0].clientX > 40 && !flip && toggle2() };
  const go = (s) => () => void cx.act({ action: s.action ?? "", block: b.id, values: s.values ?? {}, confirm: s.confirm });
  const bar = h("div", "ra b-row__actions", { hidden: !flip }, ...swipe.map((s) => act(s, s.tone === "bad" ? "bad" : "", cx, void 0, go(s))));
  return h("div", "rw", hooks3, h("div", rc, { ...own2, ...touch }, ...parts), bar);
}

// react/src/kinds/screen.ts
import { useContext as useContext6 } from "react";
var stays = (x) => x.type === "row" && x.sticky === true || x.type === "composer";
function screen({ b, hooks: hooks3 }) {
  const cx = useContext6(Cx);
  const go = (m) => () => m.tap ? cx.tap(m.tap) : void cx.act({ action: m.action ?? "", values: m.values, confirm: m.confirm });
  const acts = (b.actions ?? []).flatMap((a) => a.menu ?? [a]).map((m) => act(m, "b-screen__actions", cx, urlOf(m.tap), urlOf(m.tap) ? void 0 : go(m)));
  const head = h("p", "tabh", null, h("span", "tw b-screen__title", null, (b.title ?? "").toLowerCase()), ...acts);
  const attrs = { ...hooks3, "data-id": String(b.id) };
  const bs = b.blocks ?? [];
  if (!b.focus) return h("div", "scr", attrs, head, ...kids(bs));
  const kept = bs.filter(stays);
  const at = kept.findIndex((x) => x.type === "composer");
  const cut = at < 0 ? kept.length : at;
  return h("div", "scr", attrs, ...kids(kept.slice(0, cut)), h("div", "msgs", null, head, ...kids(bs.filter((x) => !stays(x)))), ...kids(kept.slice(cut)));
}

// react/src/kinds/section.ts
var GROUP = { waiting: "needs", blocked: "needs", asleep: "idle", in: "working" };
var SH = { needs: "r", working: "g" };
function section({ b, hooks: hooks3 }) {
  const w = (b.header ?? "").split(" ")[0];
  const k = GROUP[w] ?? w;
  return h("section", "sec", hooks3, b.header ? h("h3", `sh ${SH[k] ?? ""}`, null, b.header) : null, ...kids(b.blocks), b.footer ? h("p", "m foot", null, b.footer) : null);
}

// react/src/kinds/sheet.ts
var sheet = ({ b, hooks: hooks3 }) => h("div", "shb", hooks3, ...kids(b.blocks));

// react/src/kinds/stat.ts
import { useContext as useContext7 } from "react";
function stat({ b, hooks: hooks3 }) {
  const cx = useContext7(Cx);
  const tile = (i) => {
    const sp = i.spark ?? [];
    const hi = Math.max(1, ...sp);
    const points = sp.map((v, x) => `${x},${10 - v / hi * 10}`).join(" ");
    const spark = h("svg", "spark", { viewBox: `0 0 ${sp.length - 1} 10`, preserveAspectRatio: "none", "aria-hidden": "true" }, h("polyline", "", { points }));
    const unit = i.unit ? [" ", h("small", "", null, i.unit)] : [];
    return h("div", `st ${i.tone ?? ""}`, null, h("b", "b-stat__value", null, ticked(i.value, cx)), ...unit, h("span", "m", null, i.label ?? ""), sp.length > 1 ? spark : null);
  };
  return h("div", "stats", hooks3, ...(b.items ?? [b]).map(tile));
}

// react/src/kinds/text.ts
import { useContext as useContext8 } from "react";
function text2({ b, hooks: hooks3 }) {
  const cx = useContext8(Cx);
  return h("div", "txt", { ...hooks3, "data-md": b.markdown ?? "" }, ...md(b.markdown, cx.screen.startsWith("thread-")));
}

// react/src/gen/views.ts
var views2 = { button, card, chips, form, images, list, row, screen, section, sheet, stat, text: text2 };

// react/src/island.ts
import { createElement as createElement6, Suspense, useContext as useContext9, useLayoutEffect, useState as useState6 } from "react";
function Mark({ on }) {
  useLayoutEffect(() => {
    on(true);
    return () => on(false);
  }, [on]);
  return null;
}
function Isle({ b, attrs }) {
  const cx = useContext9(Cx);
  const [live, setLive] = useState6(false);
  const C = Object.prototype.hasOwnProperty.call(cx.islands, b.name) ? cx.islands[b.name] : void 0;
  const fallback = row2(b.fallback, cx);
  const id = b.id ?? "";
  const emit = (name, values) => b.events?.includes(name) ? void cx.act({ action: name, block: id, values: values ?? {} }) : cx.report({ what: "dropped", block: id, event: name });
  const style = { overflow: "hidden", aspectRatio: b.size?.aspect ?? void 0, width: b.size?.width ?? void 0, height: b.size?.height ?? void 0 };
  const inner = C && createElement6(Boundary, { b, report: cx.report, fallback }, createElement6(Suspense, { fallback }, createElement6(Mark, { on: setLive }), createElement6(C, { props: b.props ?? {}, emit })));
  return h("div", "", { ...attrs, "data-fallback": C && live ? void 0 : "", style }, inner || fallback);
}

// react/src/block.ts
var isBlk = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var core = (b) => Object.prototype.hasOwnProperty.call(hooks, String(b.type));
var isIsland = (b) => b.type === "island" && typeof b.name === "string" && isBlk(b.fallback);
var isFallback = (v) => isBlk(v) && typeof v.title === "string";
function hooksOf(b, cx, fallback) {
  const t = String(b.type);
  const id = typeof b.id === "string" ? b.id : void 0;
  const v = core(b) ? hooks[b.type].variant : null;
  return {
    className: `b${core(b) ? "" : " b-app"} b-${t}`,
    "data-block": t,
    "data-id": id,
    "data-variant": v && b[v] != null ? String(b[v]) : void 0,
    "data-tone": typeof b.tone === "string" ? b.tone : void 0,
    "data-fallback": fallback ? "" : void 0,
    hidden: id !== void 0 && cx.v.hidden.has(id) ? true : void 0,
    "aria-busy": id !== void 0 && cx.busy.has(id) ? true : void 0,
    role: role(b, t),
    "aria-label": named(b, t)
  };
}
function row2(f, cx) {
  const tap = f.tap;
  const pressed = tap ? press(() => cx.tap(tap)) : null;
  const sub = f.subtitle != null ? h("span", "rs b-row__subtitle", null, f.subtitle) : null;
  return h("div", tap ? "row tap" : "row", pressed, h("span", "rm", null, h("span", "rt b-row__title", null, f.title), sub));
}
var kids = (bs) => (Array.isArray(bs) ? bs.filter(isBlk) : []).map((b, i) => createElement7(Block, { key: typeof b.id === "string" ? b.id : `~${i}`, b }));
function Fallen({ b }) {
  const cx = useContext10(Cx);
  const f = b.fallback ?? { title: String(b.type) };
  return h("div", "", hooksOf(b, cx, true), isFallback(f) ? row2(f, cx) : null, ...kids(b.blocks));
}
var Boundary = class extends Component {
  constructor() {
    super(...arguments);
    this.state = { threw: false };
  }
  static getDerivedStateFromError() {
    return { threw: true };
  }
  componentDidCatch(error) {
    this.props.report({ what: "threw", block: String(this.props.b.id ?? this.props.b.type), error });
  }
  componentDidUpdate(was) {
    if (was.b !== this.props.b && this.state.threw) this.setState({ threw: false });
  }
  render() {
    return this.state.threw ? this.props.fallback : this.props.children;
  }
};
var own = (t, b, attrs) => {
  const V = views2[t];
  return V ? createElement7(V, { b, hooks: attrs }) : void 0;
};
function Draw({ b }) {
  const cx = useContext10(Cx);
  if (isIsland(b)) return createElement7(Isle, { b, attrs: hooksOf(b, cx, false) });
  if (core(b)) return own(b.type, b, hooksOf(b, cx, false)) ?? createElement7(Fallen, { b });
  const K = cx.kinds[String(b.type)];
  const act2 = (a) => cx.act({ ...a, block: typeof b.id === "string" ? b.id : null });
  return K ? h("div", "", hooksOf(b, cx, false), createElement7(K, { block: { ...b, type: String(b.type) }, act: act2 })) : createElement7(Fallen, { b });
}
var Block = memo(function Block2({ b }) {
  const cx = useContext10(Cx);
  return createElement7(Boundary, { b, report: cx.report, fallback: createElement7(Fallen, { b }) }, createElement7(Draw, { b }));
});

// react/src/view.ts
var native = Object.keys(hooks2).filter((k) => Object.prototype.hasOwnProperty.call(views2, k));
var DARK = "(prefers-color-scheme: dark)";
var watch = (on) => {
  const m = matchMedia(DARK);
  m.addEventListener("change", on);
  return () => m.removeEventListener("change", on);
};
function BlocksView(p) {
  const last = useRef5(void 0);
  const screen2 = useMemo2(() => last.current = share(last.current, p.screen), [p.screen]);
  const { cx, ask } = useCx(p, screen2);
  const dark = useSyncExternalStore(watch, () => matchMedia(DARK).matches, () => false);
  const s = p.look?.[p.mode === "dark" || p.mode !== "light" && dark ? "dark" : "light"];
  const style = s ? { ...s.tokens, colorScheme: s["color-scheme"] } : void 0;
  return h("div", "b-view", { style }, createElement8(Cx.Provider, { value: cx }, createElement8(Block, { b: screen2 })), ask);
}
export {
  BlocksView,
  native
};
