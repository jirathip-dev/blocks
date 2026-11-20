// react/src/view.ts
import { createElement as createElement8, useMemo as useMemo2, useRef as useRef7, useSyncExternalStore } from "react";
import { hooks as hooks3, share } from "./core.js";

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
  const state2 = start(screen2);
  for (const [k, x] of Object.entries(edits)) if (Object.prototype.hasOwnProperty.call(state2, k)) state2[k] = x;
  const v = view(screen2, state2);
  const live2 = useRef({ screen: screen2, state: state2, v, busy: /* @__PURE__ */ new Set() });
  live2.current = { ...live2.current, screen: screen2, state: state2, v };
  useEffect(() => {
    const out2 = props.current.onReport;
    if (out2) for (const fault of check(screen2, Object.keys(props.current.kinds ?? {}))) out2({ what: "fault", fault });
  }, [screen2]);
  const key2 = JSON.stringify([[...v.hidden], [...v.disabled], v.says, [...v.acts], v.values, [...busy], state2, edits]);
  const cx = useMemo(() => {
    const report = (r) => props.current.onReport?.(r);
    const mark = (k, on) => {
      const b = live2.current.busy;
      if (on) b.add(k);
      else b.delete(k);
      setBusy(new Set(b));
    };
    const act2 = async (a) => {
      const k = a.block ?? a.action;
      if (live2.current.busy.has(k) || a.block != null && live2.current.v.disabled.has(a.block)) return false;
      const c = a.confirm;
      if (c && !await new Promise((done) => setAsking({ c, done }))) return false;
      mark(k, true);
      try {
        const sent2 = { screen: String(live2.current.screen.id ?? ""), action: a.action, block: a.block ?? null, values: a.values ?? null };
        return await props.current.onAction(sent2) !== false;
      } catch (error) {
        report({ what: "failed", action: a.action, error });
        return false;
      } finally {
        mark(k, false);
      }
    };
    const tap = (t) => {
      const go2 = goOf(t);
      if (go2) props.current.onOpen?.(go2);
      if (t.url != null && linkable(t.url)) window.open(t.url, "_blank", "noopener");
      if (t.copy != null) void navigator.clipboard?.writeText(t.copy);
      const sets = {};
      for (const x of t.set ?? []) sets[x.key] = evaluate(x.to, live2.current.state);
      if (t.set?.length) setEdits((e) => ({ ...e, ...sets }));
      if (!go2 && t.action) void act2({ action: t.action, values: t.values });
    };
    const put = (k, to) => setEdits((e) => ({ ...Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)), ...to === void 0 ? null : { [k]: to } }));
    return { screen: String(screen2.id ?? ""), locale: screen2.locale ?? {}, v, state: state2, edits, put, busy, act: act2, tap, report, kinds: p.kinds ?? {}, islands: p.islands ?? {}, file: p.onFile };
  }, [key2, screen2.id, p.kinds, p.islands, p.onFile]);
  const end = (ok) => {
    asking?.done(ok);
    setAsking(null);
  };
  const button2 = (label, ok, cls = "") => h("button", cls, { type: "button", onClick: () => end(ok) }, h("span", "", null, label));
  const ask = asking ? h("div", "b-confirm", { role: "dialog" }, h("p", "", null, h("b", "", null, asking.c.title)), asking.c.message ? h("p", "m", null, asking.c.message) : null, h("div", "bar", null, button2("cancel", false), button2(asking.c.ok ?? "ok", true, asking.c.destructive ? "bad" : ""))) : null;
  return { cx, ask };
}

// react/src/block.ts
import { Component, createElement as createElement7, memo, useContext as useContext12 } from "react";
import { hooks as hooks2, named as named2, role } from "./core.js";

// react/src/draw.ts
import { actionOf, figured, linkable as linkable2, value } from "./core.js";
var urlOf = (t) => t?.url != null && linkable2(t.url) ? t.url : void 0;
var sends = (t, action) => {
  const a = t ? t.url != null || t.open != null || t.sheet != null ? null : t.action : action;
  return typeof a === "string" && a ? a : void 0;
};
var out = (url2) => ({ href: url2, target: "_blank", rel: "noopener" });
var press = (go2) => ({ role: "button", tabIndex: 0, onClick: go2, onKeyDown: (e) => e.key === "Enter" && go2() });
var btn = (label, cls, url2, action, attrs, off = false) => {
  const own3 = { "data-action": typeof action === "string" && action ? action : void 0, ...attrs };
  const span2 = h("span", "", null, String(label ?? ""));
  return url2 ? h("a", `btn ${cls}`, { ...own3, ...out(url2) }, span2) : h("button", cls, { type: "button", ...own3, disabled: off || void 0 }, span2);
};
var act = (a, cls, cx, url2, go2) => {
  const k = actionOf(a);
  return btn(a.label, cls, url2, sends(a.tap, a.action), { "data-act": k || void 0, onClick: go2 }, k !== void 0 && cx.v.acts.has(k));
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
  let at2 = 0;
  for (const m of s.matchAll(stage[0])) {
    got.push(...next(s.slice(at2, m.index)), stage[1](m, next));
    at2 = (m.index ?? 0) + m[0].length;
  }
  return [...got, ...next(s.slice(at2))];
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
function button({ b, hooks: hooks4 }) {
  const cx = useContext(Cx);
  const url2 = urlOf(b.tap);
  const go2 = () => b.tap ? cx.tap(b.tap) : void cx.act({ action: b.action ?? "", block: b.id, values: b.values ?? {}, confirm: b.confirm });
  return btn(b.label, b.style ?? "", url2, sends(b.tap, b.action), { ...hooks4, "data-id": b.id ?? "", onClick: url2 ? void 0 : go2 }, b.id != null && cx.v.disabled.has(b.id));
}

// react/src/kinds/card.ts
import { useContext as useContext2, useState as useState2 } from "react";
function card({ b, hooks: hooks4 }) {
  const cx = useContext2(Cx);
  const [open2, setOpen] = useState2(false);
  const cls = `card ${b.tone ?? ""} k-${b.kind ?? ""}`;
  const attrs = { ...hooks4, "data-id": b.id ?? "" };
  const fold = b.fold ?? null;
  const main = fold?.main ?? null;
  const shut = fold !== null && !open2;
  const send3 = main && (() => void cx.act({ action: main.action, block: main.block, values: { ...main.values, choice: main.value } }));
  const flip = (e) => e.target instanceof Element && e.target.closest("button") || setOpen((o) => !o);
  const mainBtn = main && shut ? btn(main.label, "main", void 0, main.action, { onClick: send3 }) : null;
  const line = fold ? h("div", "fold", { tabIndex: 0, role: "button", "aria-expanded": String(!shut), onClick: flip }, h("span", "fl", null, fold.line), mainBtn) : null;
  if (shut) return h("div", cls, attrs, line);
  const badge = b.badge ? [" ", h("span", `tag b-card__badge ${b.badge.tone ?? ""}`, null, ticked(b.badge.text, cx))] : [];
  const meta = b.meta ? [" ", h("span", "m", null, ticked(b.meta, cx))] : [];
  const head3 = b.title || b.badge ? h("div", "ch", null, h("b", "b-card__title", null, b.title ?? ""), ...badge, ...meta) : null;
  const buttons = b.buttons ?? [];
  const bar4 = buttons.length ? h("div", "bar b-card__actions", null, ...kids(buttons)) : null;
  const s = !b.subtitle ? null : typeof b.subtitle === "string" ? { text: b.subtitle, tone: null } : b.subtitle;
  const sub = s ? h("p", `m b-card__subtitle ${s.tone ?? ""}`.trimEnd(), null, ticked(s.text, cx)) : null;
  return h("div", cls, attrs, line, head3, sub, ...kids(b.blocks), bar4);
}

// react/src/kinds/chips.ts
import { useContext as useContext3 } from "react";
function chips({ b, hooks: hooks4 }) {
  const cx = useContext3(Cx);
  const sel = b.selected ?? [];
  const pick2 = (v) => {
    const next = !b.multi || v === "all" ? [v] : sel.includes(v) ? sel.filter((x) => x !== v) : [...sel.filter((x) => x !== "all"), v];
    void cx.act({ action: b.action ?? "", block: b.id, values: { [b.name]: next.length ? next : ["all"] } });
  };
  const chip = (o) => btn(o.label, sel.includes(o.value) ? "on" : "", void 0, b.action, { key: o.value, "aria-pressed": String(sel.includes(o.value)), onClick: () => pick2(o.value) });
  return h("div", "chips", hooks4, ...b.options.map(chip));
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
var word = (c, key2) => words[key2]?.[c.locale.lang === "th" ? 1 : 0] ?? "";

// react/src/fields/_input.ts
import { createElement as createElement2 } from "react";
function input(x, c, attrs, password, placeholder) {
  const kb = x.keyboard ?? "default";
  const was = password ? "" : String(x.value ?? "");
  const own3 = { type: password ? "password" : kb === "url" ? "url" : "text", inputMode: kb === "default" ? void 0 : kb === "number" ? "decimal" : "url" };
  const draft = password ? void 0 : c.key + x.name;
  const value3 = c.value == null ? "" : String(c.value);
  return createElement2("input", { ...attrs, ...own3, value: value3, placeholder, autoComplete: "off", "data-was": was, "data-draft": draft, onChange: (e) => c.put(e.target.value) });
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
  const head3 = r.src && r.state !== "refused" ? h("img", "fut", { ...hide, src: r.src, alt: "" }) : h("span", "fux", hide, r.state === "refused" ? "!" : (r.name.split(".").pop() ?? "").slice(0, 4));
  const p = Math.round(r.part * 100);
  const bar4 = { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p), "aria-label": r.name, style: { "--v": p } };
  const b = (k, f, cls = "") => btn(w(k), cls, void 0, void 0, { "aria-label": `${w(k)} ${r.name}`, onClick: f });
  const acts = r.state === "failed" ? [b("retry", () => again(r)), b("remove", () => drop(r), "bad")] : [b(r.state === "refused" ? "dismiss" : "remove", () => drop(r))];
  const m = h("span", "fum", null, h("span", "fun", null, r.name), r.state === "uploading" ? h("span", "pgt", bar4, h("b", "", null)) : null, h("span", "fus", null, line));
  return h("li", `fui ${r.state}`, { key: r.id ?? `${r.name}~${r.size}`, "aria-label": `${r.name}, ${line}` }, head3, m, h("span", "fua", null, ...acts));
}
function Upload({ x, c, attrs }) {
  const w = (k) => word(c, k);
  const [rows, setRows] = useState3(() => held(x));
  const live2 = useRef2(rows);
  const input3 = useRef2(null);
  const changed = (next) => {
    live2.current = next;
    setRows(next);
    c.hold(ids(next), waits(next));
  };
  const go2 = (r) => c.file && send(r, c.file, { screen: c.screen, block: c.block, field: x.name }, () => changed([...live2.current]));
  const drop = (r) => {
    r.stop?.abort();
    changed(live2.current.filter((o) => o !== r));
  };
  const open2 = (camera) => {
    const i = input3.current;
    if (camera) i?.setAttribute("capture", "environment");
    else i?.removeAttribute("capture");
    i?.click();
  };
  const take = (e) => {
    const files = Array.from(e.target.files ?? []);
    const next = picked(x, live2.current, files, files.map((f) => f.name));
    e.target.value = "";
    changed(next.rows);
    next.send.forEach(go2);
  };
  const label = x.label ?? x.name;
  const choice = pick(x, rows, w);
  const tip = hint(x, w, !!c.file);
  const off = !c.file;
  const fub = h(
    "div",
    "fub",
    null,
    x.capture ? btn(w("camera"), "fuc", void 0, void 0, { onClick: () => open2(true) }, off) : null,
    btn(choice, "", void 0, void 0, { "aria-label": `${choice}: ${label}`, onClick: () => open2(false) }, off),
    tip ? h("span", "fuh", null, tip) : null,
    h("input", "", { ref: input3, type: "file", tabIndex: -1, multiple: !!x.many, accept: accepts(x.accept ?? []), "aria-hidden": "true", onChange: take })
  );
  const named3 = { role: "group", "data-field": x.name, "aria-label": fill(w("files"), { label, n: rows.filter((r) => r.state !== "refused").length }), "aria-invalid": attrs["aria-invalid"] };
  return h("div", "fu", named3, x.error ? h("span", "fe", null, x.error) : null, rows.length ? h("ul", "fuf", null, ...rows.map((r) => item(x, r, w, drop, go2))) : null, fub);
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
function field(x, key2, cx, held3) {
  const v = viewOf(x);
  const [cls, say2] = note(v.group ? { ...x, error: null } : x, word(cx, "was"));
  const said = Object.prototype.hasOwnProperty.call(cx.edits, x.name) ? cx.v.says[x.name] : void 0;
  const attrs = { name: x.name, disabled: cx.v.disabled.has(x.name) || void 0, "aria-invalid": x.error ? "true" : void 0 };
  const hold = (sent2, w) => {
    held3.sent[x.name] = sent2;
    held3.wait(x.name, w);
    cx.put(x.name, lit(x, sent2));
  };
  const c = { locale: cx.locale, key: key2, value: cx.state[x.name] ?? null, put: (to) => cx.put(x.name, to), screen: cx.screen, block: held3.block, file: cx.file, hold };
  const control = v.draw(x, c, attrs);
  const l = `fd${v.row ?? ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`;
  return h(v.group ? "div" : "label", l, { key: x.name, hidden: cx.v.hidden.has(x.name) || void 0 }, h("span", "fl", null, h("span", "fk", null, x.label ?? x.name), h("span", cls, null, say2)), control, said ? h("span", "fe", null, said) : null);
}
function form({ b, hooks: hooks4 }) {
  const cx = useContext4(Cx);
  const s = b.submit;
  const sent2 = useRef3({});
  const [waits3, setWaits] = useState4({});
  const held3 = { sent: sent2.current, wait: (n, w) => setWaits((o) => ({ ...o, [n]: w })), block: b.id ?? void 0 };
  const rows = b.fields.map((x) => field(x, `draft:${cx.screen}:${String(b.id)}:`, cx, held3));
  if (!s) return h("div", "form", { ...hooks4, "data-id": b.id ?? "" }, ...rows);
  const values = () => {
    const v = {};
    for (const x of b.fields) {
      const own3 = viewOf(x).sent;
      const got = Object.prototype.hasOwnProperty.call(sent2.current, x.name) ? sent2.current[x.name] : own3 ? own3(x, cx.state[x.name] ?? null) : cx.state[x.name];
      if (typeof got === "string" || typeof got === "boolean" || typeof got === "number" || Array.isArray(got)) v[x.name] = got;
    }
    return v;
  };
  const send3 = () => {
    const v = values();
    if (Object.values(v).every((x) => !String(x || "").trim())) return;
    void cx.act({ action: s.action, block: b.id, values: { ...s.values, ...v } }).then((ok) => ok && b.fields.forEach((x) => cx.put(x.name, void 0)));
  };
  const enter = (e) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement) || e.target.type === "checkbox") return;
    e.preventDefault();
    send3();
  };
  const busy = cx.busy.has(b.id ?? s.action);
  const all = Object.values(waits3), up = all.reduce((n, w) => n + w.up, 0), bad = all.some((w) => w.failed > 0);
  const off = b.id != null && cx.v.disabled.has(b.id) || up > 0 || bad;
  const go2 = btn(busy ? "sending\u2026" : s.label, "", void 0, s.action, { "data-submit": "", onClick: send3 }, off);
  const line = bad ? word(cx, "stuck") : up ? fill2(word(cx, up > 1 ? "waitN" : "wait1"), { n: up }) : "";
  const wait = b.fields.some((x) => viewOf(x).group) ? h("span", `say-busy${bad ? " bad" : ""}`, null, line) : null;
  return h("div", "form say", { ...hooks4, "data-id": b.id ?? "", onKeyDown: enter }, ...rows, wait, go2);
}

// react/src/kinds/images.ts
import { linkable as linkable3 } from "./core.js";
function images({ b, hooks: hooks4 }) {
  const item3 = (i, n) => {
    if (!linkable3(i.src)) return h("span", "", { key: n }, i.alt ?? "");
    const src = i.src.replace(/^[/]/, "");
    return h("a", "", { key: n, ...out(src) }, h("img", "", { src, alt: i.alt ?? "", loading: "lazy" }));
  };
  return h("div", "imgs", hooks4, ...b.items.map(item3));
}

// react/src/kinds/list.ts
var list = ({ b, hooks: hooks4 }) => h("div", "list", hooks4, ...kids(b.rows));

// react/src/kinds/row.ts
import { useContext as useContext5, useRef as useRef4, useState as useState5 } from "react";
function round(d, now, cx) {
  const tap = now ? null : d.tap ?? null;
  const url2 = urlOf(tap);
  const parts2 = [h("span", "rdn", null, d.name), h("span", "rdu", null, d.summary ?? ""), d.since ? h("span", "rdt", null, ticked({ since: d.since }, cx)) : null, tap ? h("span", "rc", null, "\u203A") : null];
  const pressed = tap && { "data-action": sends(tap), ...press(() => cx.tap(tap)) };
  const l = url2 ? h("a", "rdl tap", out(url2), ...parts2) : h("div", tap ? "rdl tap" : "rdl", pressed || null, ...parts2);
  const links = d.links ?? [];
  const lines = d.lane?.lines ?? [];
  const line = (t, i) => d.state === "working" && i === lines.length - 1 ? h("div", "live", null, `\u258D ${t}`) : h("div", "", null, t);
  const lane = d.lane ? [h("div", "rdh", null, [d.lane.name, d.lane.harness, d.lane.model, d.lane.host].filter(Boolean).join(" \xB7 ")), h("div", "rdo", null, ...lines.map(line))] : [];
  const link = links.map((k) => btn(k.label, "", urlOf(k.tap), sends(k.tap), { onClick: urlOf(k.tap) ? void 0 : () => cx.tap(k.tap) }));
  const body2 = now && (d.lane || d.blocks?.length || links.length) ? h("div", "rdb", null, ...lane, ...kids(d.blocks), links.length ? h("div", "rdk", null, ...link) : null) : null;
  return h("li", `rd ${d.state}${now ? " now" : ""}`, null, h("i", "rdm", { "aria-label": d.state }), h("div", "rdx", null, l, body2));
}
function row({ b, hooks: hooks4 }) {
  const cx = useContext5(Cx);
  const [flip, setFlip] = useState5(false);
  const x0 = useRef4(0);
  const toggle2 = () => setFlip((f) => !f);
  const cls = `row${b.style === "link" ? " link" : ""}${b.sticky ? " sticky" : ""}${b.indent ? " in" + Math.min(b.indent, 3) : ""}`;
  const rounds = b.rounds ?? [];
  const last = rounds[rounds.length - 1];
  const open2 = last !== void 0 && last.state === "needs" !== flip;
  const sub = b.subtitle == null || open2 ? null : typeof b.subtitle === "string" ? { text: b.subtitle, tone: null } : b.subtitle;
  const badge = b.badge ? [" ", h("span", `tag b-row__badge ${b.badge.tone ?? ""}`, null, ticked(b.badge.text, cx))] : [];
  const main = h("span", "rm", null, h("span", "rt b-row__title", null, b.title ?? ""), ...badge, sub ? h("span", `rs b-row__subtitle ${sub.tone ?? ""}`, null, ticked(sub.text, cx)) : null);
  const parts2 = [b.figure ? figure(b.figure, "b-row__figure") : null, main, b.value != null ? h("span", "rv b-row__value", null, ticked(b.value, cx)) : null];
  const id = { "data-id": b.id ?? "" };
  if (last) {
    const r = h("div", `${cls} tap`, { ...id, "aria-expanded": String(open2), ...press(toggle2) }, ...parts2, h("span", "rc", null, "\u203A"));
    return h("div", `rr${open2 ? " open" : ""}`, hooks4, r, open2 ? h("ol", "rds", null, ...rounds.map((d) => round(d, d === last, cx))) : null);
  }
  const url2 = urlOf(b.tap);
  const swipe = b.swipe ?? [];
  const tapped = !url2 && (b.tap != null || swipe.length > 0);
  const own3 = { ...id, ...tapped ? { "data-action": sends(b.tap), ...press(() => b.tap ? cx.tap(b.tap) : toggle2()) } : null };
  const rc = url2 || tapped ? `${cls} tap` : cls;
  if (!swipe.length) return url2 ? h("a", rc, { ...hooks4, ...own3, ...out(url2) }, ...parts2) : h("div", rc, { ...hooks4, ...own3 }, ...parts2);
  const touch = { onTouchStart: (e) => x0.current = e.touches[0].clientX, onTouchEnd: (e) => x0.current - e.changedTouches[0].clientX > 40 && !flip && toggle2() };
  const go2 = (s) => () => void cx.act({ action: s.action ?? "", block: b.id, values: s.values ?? {}, confirm: s.confirm });
  const bar4 = h("div", "ra b-row__actions", { hidden: !flip }, ...swipe.map((s) => act(s, s.tone === "bad" ? "bad" : "", cx, void 0, go2(s))));
  return h("div", "rw", hooks4, h("div", rc, { ...own3, ...touch }, ...parts2), bar4);
}

// react/src/kinds/screen.ts
import { useContext as useContext6 } from "react";
var stays = (x) => x.type === "row" && x.sticky === true || x.type === "composer";
function screen({ b, hooks: hooks4 }) {
  const cx = useContext6(Cx);
  const go2 = (m) => () => m.tap ? cx.tap(m.tap) : void cx.act({ action: m.action ?? "", values: m.values, confirm: m.confirm });
  const acts = (b.actions ?? []).flatMap((a) => a.menu ?? [a]).map((m) => act(m, "b-screen__actions", cx, urlOf(m.tap), urlOf(m.tap) ? void 0 : go2(m)));
  const head3 = h("p", "tabh", null, h("span", "tw b-screen__title", null, (b.title ?? "").toLowerCase()), ...acts);
  const attrs = { ...hooks4, "data-id": String(b.id) };
  const bs = b.blocks ?? [];
  if (!b.focus) return h("div", "scr", attrs, head3, ...kids(bs));
  const kept = bs.filter(stays);
  const at2 = kept.findIndex((x) => x.type === "composer");
  const cut = at2 < 0 ? kept.length : at2;
  return h("div", "scr", attrs, ...kids(kept.slice(0, cut)), h("div", "msgs", null, head3, ...kids(bs.filter((x) => !stays(x)))), ...kids(kept.slice(cut)));
}

// react/src/kinds/section.ts
var GROUP = { waiting: "needs", blocked: "needs", asleep: "idle", in: "working" };
var SH = { needs: "r", working: "g" };
function section({ b, hooks: hooks4 }) {
  const w = (b.header ?? "").split(" ")[0];
  const k = GROUP[w] ?? w;
  return h("section", "sec", hooks4, b.header ? h("h3", `sh ${SH[k] ?? ""}`, null, b.header) : null, ...kids(b.blocks), b.footer ? h("p", "m foot", null, b.footer) : null);
}

// react/src/kinds/sheet.ts
var sheet = ({ b, hooks: hooks4 }) => h("div", "shb", hooks4, ...kids(b.blocks));

// react/src/kinds/stat.ts
import { useContext as useContext7 } from "react";
function stat({ b, hooks: hooks4 }) {
  const cx = useContext7(Cx);
  const tile = (i) => {
    const sp = i.spark ?? [];
    const hi = Math.max(1, ...sp);
    const points2 = sp.map((v, x) => `${x},${10 - v / hi * 10}`).join(" ");
    const spark = h("svg", "spark", { viewBox: `0 0 ${sp.length - 1} 10`, preserveAspectRatio: "none", "aria-hidden": "true" }, h("polyline", "", { points: points2 }));
    const unit2 = i.unit ? [" ", h("small", "", null, i.unit)] : [];
    return h("div", `st ${i.tone ?? ""}`, null, h("b", "b-stat__value", null, ticked(i.value, cx)), ...unit2, h("span", "m", null, i.label ?? ""), sp.length > 1 ? spark : null);
  };
  return h("div", "stats", hooks4, ...(b.items ?? [b]).map(tile));
}

// react/src/kinds/table.ts
import { useContext as useContext8, useLayoutEffect, useReducer, useRef as useRef5 } from "react";

// src/core/gesture.ts
var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function step(p, e, start2) {
  const live2 = p.at === "pressed" || p.at === "dragging" || p.at === "previewing";
  if (p.at === "idle" && e.on === "press") return [{ at: "pressed" }, null];
  if (p.at === "pressed" && e.on === "release") return [{ at: "idle" }, "tap"];
  if (live2 && e.on === "move") return e.c == null ? [{ at: "dragging" }, null] : [{ at: "previewing", c: e.c }, null];
  if (live2 && e.on === "cancel" || p.at === "dragging" && e.on === "release") return [{ at: "idle" }, null];
  if (p.at === "previewing" && e.on === "release") return same(p.c, start2) ? [{ at: "idle" }, null] : [{ at: "sent", c: p.c }, { send: p.c }];
  if (p.at === "sent" && e.on === "answer") return e.ok ? [{ at: "confirmed" }, null] : [{ at: "refused", why: e.why ?? "" }, null];
  if ((p.at === "confirmed" || p.at === "refused") && e.on === "settled") return [{ at: "idle" }, null];
  return [p, null];
}

// src/core/eval.ts
var own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
var rec2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var UNKNOWN = { "?": null };
var PAIRS = { eq: 2, lt: 2, has: 2, add: 2, sub: 2, mul: 2, div: 2, pick: 3 };
function read(v) {
  if (Array.isArray(v)) return void 0;
  if (!rec2(v)) return v;
  const keys2 = Object.keys(v);
  const k = keys2[0] ?? "";
  const a = v[k];
  const one = (x) => x === void 0 ? UNKNOWN : { [k]: x };
  const list2 = (n) => {
    if (!Array.isArray(a) || n !== void 0 && a.length !== n) return UNKNOWN;
    const xs = a.map(read);
    return xs.includes(void 0) ? UNKNOWN : { [k]: xs };
  };
  if (keys2.length !== 1) return UNKNOWN;
  if (k === "get") return typeof a === "string" ? v : UNKNOWN;
  if (k === "not" || k === "len") return one(read(a));
  if (k === "all" || k === "any" || k === "cat") return list2();
  if (own(PAIRS, k)) return list2(PAIRS[k]);
  if (k === "is" && rec2(a) && typeof a.pattern === "string" && "value" in a) {
    const x = read(a.value);
    return x === void 0 ? UNKNOWN : { is: { value: x, pattern: a.pattern } };
  }
  return UNKNOWN;
}
var flag = (l) => l === null ? false : typeof l === "boolean" ? l : void 0;
var or = (b) => b ?? null;
var num = (f) => Number.isFinite(f) ? f : null;
var text2 = (l) => l === null ? "" : String(l);
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
  if (!rec2(e)) return e === null || typeof e === "boolean" || typeof e === "number" || typeof e === "string" ? e : null;
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
      return rec2(a) ? is(ev(a.value, s), a.pattern) : null;
    case "add":
      return n ? num(n.x + n.y) : null;
    case "sub":
      return n ? num(n.x - n.y) : null;
    case "mul":
      return n ? num(n.x * n.y) : null;
    case "div":
      return n ? num(n.x / n.y) : null;
    case "cat":
      return xs.map(text2).join("");
    case "pick":
      return flags[0] === void 0 ? null : xs[flags[0] ? 1 : 2] ?? null;
  }
  return null;
}
function evaluate2(e, s) {
  const x = read(e);
  return x === void 0 ? null : ev(x, s);
}

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

// src/core/tree.ts
var isBlk = (v) => typeof v === "object" && v !== null;

// src/core/text.ts
function value2(v) {
  if (isBlk(v) && "until" in v) return String(v.label ?? "").replace("{rel}", `${Math.max(0, Math.round((Date.parse(String(v.until)) - Date.now()) / 6e4))}m`);
  if (isBlk(v) && "since" in v) {
    const s = Math.max(0, (Date.now() - Date.parse(String(v.since))) / 1e3);
    if (v.label != null) return String(v.label).replace("{}", s < 120 ? `${Math.floor(s)}s` : s < 7200 ? `${Math.floor(s / 60)}m` : s < 172800 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`);
    return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d`;
  }
  return String(v ?? "");
}

// src/core/kind/table.ts
var STEPS = [
  ["Move up", { dir: "up" }],
  ["Move down", { dir: "down" }],
  ["Move to top", { dir: "up", big: true }],
  ["Move to bottom", { dir: "down", big: true }]
];
var MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
var THAI = "\u0E21.\u0E04. \u0E01.\u0E1E. \u0E21\u0E35.\u0E04. \u0E40\u0E21.\u0E22. \u0E1E.\u0E04. \u0E21\u0E34.\u0E22. \u0E01.\u0E04. \u0E2A.\u0E04. \u0E01.\u0E22. \u0E15.\u0E04. \u0E1E.\u0E22. \u0E18.\u0E04.".split(" ");
function shown(c, v, thai2 = false) {
  if (v === void 0) return "";
  if (typeof v === "object") return typeof v.text === "string" ? v.text : typeof v.text === "number" ? String(v.text) : "";
  if (typeof v === "number") return number(c, v);
  const d = /^(\d+)-(\d+)-(\d+)$/.exec(v);
  if (c.kind !== "date" || !d) return v;
  const be = c.era === "be";
  const month = (be && thai2 ? THAI : MON)[Number(d[2]) - 1];
  return month ? `${Number(d[3])} ${month} ${Number(d[1]) + (be ? 543 : 0)}` : v;
}
function parse(c, text4) {
  if (c.kind === "number" || c.kind === "money") {
    const t = text4.replace(/[,\s]/g, "");
    return /^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)$/.test(t) ? Number(t) : null;
  }
  if (c.kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(text4.trim()) ? text4.trim() : null;
  return c.kind === "text" ? text4 : null;
}
var editable = (b, c) => c.edit === true && b.calc?.[c.id] == null && ["text", "number", "money", "date"].includes(c.kind);
var named = (b, r) => {
  const c = b.columns[0];
  return c && shown(c, r.cells[c.id]) || r.id;
};
function worked(b, r) {
  if (!b.calc || r.group) return r;
  const cells = { ...r.cells };
  for (const c of b.columns) {
    const e = b.calc[c.id];
    if (e == null) continue;
    const s = Object.fromEntries(Object.entries(cells).map(([k, v2]) => [k, typeof v2 !== "object" ? v2 : typeof v2.text === "string" || typeof v2.text === "number" ? v2.text : null]));
    const v = evaluate2(e, s);
    if (typeof v === "number" || typeof v === "string") cells[c.id] = v;
    else delete cells[c.id];
  }
  return { ...r, cells };
}
var head = (b, id) => b.rows.some((r) => r.id === id && r.group === true);
var row2 = (b, id) => b.rows.find((r) => r.id === id);
var column = (b, id) => b.columns.find((c) => c.id === id);
function chunks(order, isHead) {
  const prefix = [];
  const out2 = [];
  for (const id of order) {
    const last = out2[out2.length - 1];
    if (isHead(id)) out2.push([id]);
    else if (last) last.push(id);
    else prefix.push(id);
  }
  return [prefix, out2];
}
function itemTo(b, from, g, to) {
  const rest = from.filter((i) => i !== g);
  const at2 = Math.min(to, rest.length);
  const first = rest.findIndex((i) => head(b, i));
  if (first >= 0 && at2 <= first) return null;
  rest.splice(at2, 0, g);
  return rest;
}
function groupTo(b, from, g, to) {
  const [prefix, all] = chunks(from, (i) => head(b, i));
  const at2 = all.findIndex((c) => c[0] === g);
  if (at2 < 0) return null;
  const [it = []] = all.splice(at2, 1);
  all.splice(Math.min(to, all.length), 0, it);
  return [...prefix, ...all.flat()];
}
function rowsTo(b, from, g, n) {
  const at2 = from.indexOf(g);
  if (at2 < 0) return null;
  const t = Math.max(0, at2 + n);
  if (!head(b, g)) return itemTo(b, from, g, t);
  const [prefix, all] = chunks(from, (i) => head(b, i));
  let start2 = prefix.length;
  let best = [Infinity, 0];
  const pick2 = (d, j) => d < best[0] || d === best[0] && j < best[1] ? [d, j] : best;
  all.filter((c) => c[0] !== g).forEach((c, j) => {
    best = pick2(Math.abs(start2 - t), j);
    start2 += c.length;
  });
  best = pick2(Math.abs(start2 - t), Math.max(0, all.length - 1));
  return groupTo(b, from, g, best[1]);
}
function nudged(b, from, g, by) {
  if (by.dir === "left" || by.dir === "right") return null;
  const up = by.dir === "up";
  let out2;
  if (head(b, g)) {
    const [, all] = chunks(from, (i) => head(b, i));
    const at2 = all.findIndex((c) => c[0] === g);
    if (at2 < 0 || up && !by.big && at2 === 0) return null;
    out2 = groupTo(b, from, g, up ? by.big ? 0 : at2 - 1 : by.big ? all.length - 1 : at2 + 1);
  } else {
    const at2 = from.indexOf(g);
    if (at2 < 0 || up && !by.big && at2 === 0) return null;
    out2 = itemTo(b, from, g, up ? by.big ? from.findIndex((i) => head(b, i)) + 1 : at2 - 1 : by.big ? from.length : at2 + 1);
  }
  return out2 && out2.join("\n") !== from.join("\n") ? out2 : null;
}
function place(b, g, order) {
  const r = row2(b, g);
  const name = r ? named(b, r) : g;
  const [, all] = chunks(order, (i) => head(b, i));
  if (head(b, g)) return `${name}, ${all.findIndex((c) => c[0] === g) + 1} of ${all.length}`;
  const mine = all.find((c) => c.includes(g));
  const hr = mine?.[0] === void 0 ? void 0 : row2(b, mine[0]);
  return mine && hr ? `${name}, ${mine.indexOf(g)} of ${mine.length - 1} in ${named(b, hr)}` : `${name}, ${order.indexOf(g) + 1} of ${order.length}`;
}
var free = (b, id) => {
  const r = row2(b, id);
  return r && r.fixed !== true ? r : void 0;
};
var grid = {
  word: (b, g) => {
    if (typeof g === "string") return b.reorder != null && free(b, g) ? "reorder" : null;
    const c = column(b, g.column);
    const r = free(b, g.row);
    return b.edit != null && r && !r.group && c && editable(b, c) ? "edit" : null;
  },
  start: (b, g) => {
    if (!grid.word(b, g)) return null;
    if (typeof g === "string") return b.rows.map((r) => r.id);
    return { row: g.row, column: g.column, value: row2(b, g.row)?.cells[g.column] ?? "" };
  },
  candidate: (b, g, reach) => {
    const s = grid.start(b, g);
    if (s === null) return null;
    if (typeof g === "string") return Array.isArray(s) && typeof reach === "number" ? rowsTo(b, s, g, reach) : null;
    const c = column(b, g.column);
    const value3 = c && typeof reach === "string" ? parse(c, reach) : null;
    return value3 === null ? null : { row: g.row, column: g.column, value: value3 };
  },
  nudge: (b, g, from, by) => grid.word(b, g) && typeof g === "string" && Array.isArray(from) ? nudged(b, from, g, by) : null,
  steps: (b, g) => {
    const s = grid.start(b, g);
    return s ? STEPS.filter(([, n]) => grid.nudge(b, g, s, n) !== null) : [];
  },
  says: (b, g, ch) => {
    if (Array.isArray(ch)) return typeof g === "string" ? place(b, g, ch) : "";
    const r = row2(b, ch.row);
    const c = column(b, ch.column);
    return `${c?.label ?? ch.column}, ${r ? named(b, r) : ch.row}, ${c ? shown(c, ch.value) : ""}`;
  }
};
var numeric = (c) => c.kind === "number" || c.kind === "money" || c.kind === "bar";
var atEnd = (c) => (c.align ?? (numeric(c) ? "end" : "start")) === "end";
var cellText = (c, v, thai2) => typeof v === "object" ? value2(v.text) : shown(c, v, thai2);
var sortKey = (c, v) => c.kind === "date" && typeof v === "string" ? v : cellText(c, v, false).toLowerCase();
var cmp = (c, a, b) => numeric(c) && typeof a === "number" && typeof b === "number" ? a - b : sortKey(c, a) < sortKey(c, b) ? -1 : sortKey(c, a) > sortKey(c, b) ? 1 : 0;
function sorted(rows, c, dir) {
  if (!c) return rows;
  const by = (r, s) => {
    const a = at(r, c.id), b = at(s, c.id);
    if (a === void 0 || b === void 0) return Number(a === void 0) - Number(b === void 0);
    return dir === "desc" ? cmp(c, b, a) : cmp(c, a, b);
  };
  const out2 = [];
  let run = [];
  for (const r of rows) {
    if (!r.group) run.push(r);
    else out2.push(...run.sort(by), r), run = [];
  }
  return [...out2, ...run.sort(by)];
}
var itemsOf = (rows, i) => {
  const n = rows.slice(i + 1).findIndex((r) => r.group);
  return rows.slice(i + 1, n < 0 ? void 0 : i + 1 + n);
};
function roles2(cols) {
  const r = cols.map((c) => c.phone ?? void 0);
  const claim = (part, ok, pick2) => {
    const i = r.includes(part) ? void 0 : pick2(cols.flatMap((c, i2) => r[i2] === void 0 && ok(c) ? [i2] : []));
    if (i !== void 0) r[i] = part;
  };
  claim("title", (c) => c.kind === "text", (f) => f[0]);
  claim("tag", (c) => c.kind === "tone", (f) => f[0]);
  claim("value", (c) => c.kind === "number" || c.kind === "money", (f) => f.filter((i) => cols[i]?.total).pop() ?? f.pop());
  return r.map((x) => x ?? "meta");
}
var cellRole = (b, x) => b.edit && editable(b, x) ? "ed" : b.calc?.[x.id] != null ? "fx" : x.kind === "number" || x.kind === "money" ? "app" : "";

// src/gesture.ts
var ARROWS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
var key = (b, item3) => `${b.id ?? ""}
${item3}`;
var speaker;
function say(text4) {
  if (!speaker?.isConnected) {
    speaker = Object.assign(document.createElement("div"), { className: "b-sr" });
    speaker.setAttribute("aria-live", "polite");
    document.body.append(speaker);
  }
  speaker.textContent = text4;
}
var beside = (el, steps, run) => el.parentElement?.append(
  ...steps.map(([name, n]) => {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "b-sr", tabIndex: -1, textContent: name });
    b.onclick = () => run(n);
    return b;
  })
);
function held2(c, o) {
  const h2 = c.held?.get(key(o.block, o.item));
  return h2 && same(h2.start, o.rules.start(o.block, o.grab)) ? h2.c : void 0;
}
function gestured(el, c, o) {
  const start2 = o.rules.word(o.block, o.grab) ? o.rules.start(o.block, o.grab) : null;
  if (start2 === null) return () => {
  };
  const k = key(o.block, o.item);
  el.dataset.grab = JSON.stringify(o.grab);
  const out2 = c.held?.get(k);
  let p = out2 ? { at: "sent", c: start2 } : { at: "idle" };
  let x0 = 0;
  let y0 = 0;
  const mark = () => {
    el.dataset.phase = p.at;
    el.setAttribute("aria-pressed", String(p.at === "pressed" || p.at === "dragging" || p.at === "previewing"));
  };
  const back = (ok) => {
    go2({ on: "answer", ok });
    go2({ on: "settled" });
  };
  if (out2) out2.back = back;
  const send3 = async (cand) => {
    const h2 = { start: start2, c: cand, back };
    c.held?.set(k, h2);
    say("sending");
    const ok = await c.act({ action: o.gesture.action, block: o.block.id, values: { [o.gesture.name]: cand } }, el).catch(() => false);
    c.held?.delete(k);
    h2.back(ok);
    say(ok ? o.rules.says(o.block, o.grab, cand) : "not changed");
  };
  const go2 = (e) => {
    const [next, fx] = step(p, e, start2);
    if (next.at === p.at && e.on !== "move") return;
    p = next;
    mark();
    if (p.at === "previewing") o.show(p.c);
    if (p.at === "idle" || p.at === "dragging") o.show(null);
    if (p.at === "pressed") say(`${el.getAttribute("aria-label") ?? ""}, grabbed, ${o.rules.says(o.block, o.grab, start2)}. Arrows move, Enter drops, Escape cancels`);
    if (p.at === "dragging") say("no drop here");
    if (p.at === "previewing") say(o.rules.says(o.block, o.grab, p.c));
    if (fx && fx !== "tap") void send3(fx.send);
  };
  const phase = () => p.at;
  const live2 = () => p.at === "pressed" || p.at === "dragging" || p.at === "previewing";
  const nudge = (n) => {
    const next = o.rules.nudge(o.block, o.grab, p.at === "previewing" ? p.c : start2, n);
    if (next !== null) go2({ on: "move", c: next });
  };
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    if (p.at !== "idle" || e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    [x0, y0] = [e.clientX, e.clientY];
    go2({ on: "press" });
  });
  el.addEventListener("pointermove", (e) => {
    const [dx, dy] = [e.clientX - x0, e.clientY - y0];
    if (live2() && (p.at !== "pressed" || Math.hypot(dx, dy) >= 4)) go2({ on: "move", c: o.rules.candidate(o.block, o.grab, o.reach(dx, dy, x0, y0)) });
  });
  el.addEventListener("pointerup", () => live2() && go2({ on: "release" }));
  el.addEventListener("pointercancel", () => go2({ on: "cancel" }));
  el.addEventListener("blur", () => go2({ on: "cancel" }));
  el.addEventListener("keydown", (e) => {
    const dir = ARROWS[e.key];
    if (p.at === "idle" && e.key === " ") go2({ on: "press" });
    else if (!live2()) return;
    else if (dir) nudge({ dir, big: e.shiftKey });
    else if (e.key === "Enter" || e.key === " ") go2({ on: p.at === "pressed" ? "cancel" : "release" });
    else if (e.key === "Escape") go2({ on: "cancel" });
    else return;
    e.preventDefault();
  });
  const run = (n) => {
    if (p.at !== "idle") return;
    go2({ on: "press" });
    nudge(n);
    go2({ on: phase() === "pressed" ? "cancel" : "release" });
  };
  beside(el, o.rules.steps(o.block, o.grab), run);
  mark();
  return run;
}
function edited(input3, c, o) {
  const start2 = o.rules.word(o.block, o.grab) ? o.rules.start(o.block, o.grab) : null;
  if (start2 === null) return;
  const k = key(o.block, o.item);
  let p = { at: "idle" };
  let gone = false;
  const go2 = (e) => {
    const [next, fx] = step(p, e, start2);
    p = next;
    o.show(p.at, p.at === "previewing" ? p.c : null);
    if (!fx || fx === "tap") return;
    const back = (ok) => (go2({ on: "answer", ok }), go2({ on: "settled" }));
    const h2 = { start: start2, c: fx.send, back };
    c.held?.set(k, h2);
    say("sending");
    void c.act({ action: o.gesture.action, block: o.block.id, values: { [o.gesture.name]: fx.send } }, input3).catch(() => false).then((ok) => {
      c.held?.delete(k);
      h2.back(ok);
      say(ok ? o.rules.says(o.block, o.grab, fx.send) : "not changed");
    });
  };
  const leave = (e, how) => {
    if (gone) return;
    gone = true;
    go2(e);
    o.left(how);
  };
  input3.addEventListener("focus", () => p.at === "idle" && (go2({ on: "press" }), go2({ on: "move", c: o.rules.candidate(o.block, o.grab, input3.value) })));
  input3.addEventListener("input", () => go2({ on: "move", c: o.rules.candidate(o.block, o.grab, input3.value) }));
  input3.addEventListener("blur", () => leave({ on: "release" }, "blur"));
  input3.addEventListener("keydown", (e) => {
    const how = e.key === "Enter" ? "down" : e.key === "Tab" ? e.shiftKey ? "left" : "right" : e.key === "Escape" ? "stay" : "";
    if (!how) return;
    e.preventDefault();
    leave({ on: how === "stay" ? "cancel" : "release" }, how);
  });
}

// react/src/kinds/table.ts
var FORMAT = { csv: "CSV", xlsx: "Excel" };
var thai = () => document.documentElement.lang.startsWith("th");
var shown2 = (c, v) => cellText(c, v, thai());
var pk = (p) => `${p.row}
${p.col}`;
var isIds = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
var isEdit = (v) => typeof v === "object" && v !== null && !Array.isArray(v) && "value" in v;
function cell(tag, c, part, kids2, blank2, attrs = {}) {
  const cls = `${atEnd(c) ? "end" : "start"} k-${c.kind} p-${part}${c.width ? " w" : ""}${blank2 ? " nil" : ""}`;
  return h(tag, cls, { "data-l": c.label, ...attrs, style: c.width ? { "--w": `${c.width}ch` } : void 0 }, ...kids2);
}
var send2 = (v, action, values) => void v.c.act({ action, block: v.b.id, values });
var go = (v, f) => ({ onClick: () => (f(), v.draw()) });
var sent = (v, row4, col) => {
  const c = held2(v.c, { block: v.b, rules: grid, grab: { row: row4, column: col }, item: pk({ row: row4, col }) });
  return isEdit(c) ? c.value : void 0;
};
var waits2 = (v, r) => v.b.columns.some((x) => sent(v, r.id, x.id) !== void 0);
var sort = (v) => v.b.columns.find((x) => x.id === v.st.sort?.by);
var cellAt = (v, p) => Array.from(v.box.current?.querySelectorAll("tbody td[data-c]") ?? []).find((td) => td.dataset.c === p.col && td.parentElement?.dataset.id === p.row);
var fit = (ids2, i, by) => ids2[Math.max(0, Math.min(ids2.length - 1, ids2.indexOf(i) + by))] ?? i;
function tick(v, on, label, set, mixed = false, cls = "", off = false) {
  const ref2 = (e) => {
    if (e) e.indeterminate = mixed;
  };
  const change = (e) => (set(e.target.checked), v.draw());
  return h("input", cls, { type: "checkbox", checked: on, disabled: off || void 0, "aria-label": label, ref: ref2, onClick: (e) => e.stopPropagation(), onChange: change });
}
var every = (v, d, cls = "") => tick(v, d.all, "Select all shown rows", (on) => v.st.sel = new Set(on ? d.items.map((r) => r.id) : []), d.sel > 0 && !d.all, cls);
var menu = (v, name, label) => btn(label, "", void 0, void 0, { "aria-expanded": String(v.st.menu === name), ...go(v, () => v.st.menu = v.st.menu === name ? "" : name) });
function exporter(v, d, f) {
  const label = v.b.export?.length === 1 ? `export ${(FORMAT[f] ?? f).toLowerCase()}` : FORMAT[f] ?? f;
  const values = () => ({ format: f, columns: d.cols.map((x) => x.id), sort: v.st.sort, q: v.st.q, rows: [...v.st.sel] });
  return btn(label, "", void 0, "export", { onClick: () => send2(v, "export", values()) });
}
function sorter(v, d) {
  const opts2 = [h("option", "", { value: "" }, "sort: as sent")];
  for (const x of d.cols) if (x.sort !== false) for (const dir of ["asc", "desc"]) opts2.push(h("option", "", { value: `${x.id}:${dir}` }, `sort: ${x.label.toLowerCase()} ${dir === "asc" ? "\u2191" : "\u2193"}`));
  const change = (e) => {
    const [by, dir] = e.target.value.split(":");
    v.st.sort = by && (dir === "asc" || dir === "desc") ? { by, dir } : null;
    v.draw();
  };
  return h("select", "tbs", { "aria-label": "Sort", value: v.st.sort ? `${v.st.sort.by}:${v.st.sort.dir}` : "", onChange: change }, ...opts2);
}
function bar(v, d) {
  const { b, st } = v, n = b.rows.filter((r) => !r.group).length;
  const q = h("input", "tbq", { key: "q", type: "search", placeholder: "filter", value: st.q, "aria-label": `Filter ${b.title ?? "rows"}`, onChange: (e) => (st.q = e.target.value, v.draw()) });
  const out2 = [];
  if (d.pick) out2.push(every(v, d, "tbk"));
  if (d.sel) {
    out2.push(h("b", "tbt", null, `${d.sel} selected`));
    for (const a of b.select?.actions ?? []) out2.push(btn(a.label, a.bad ? "bad" : "", void 0, a.action, { onClick: () => send2(v, a.action, { rows: [...st.sel] }) }));
    out2.push(h("span", "tbn", null));
  } else out2.push(b.title ? h("b", "tbt", null, b.title) : null, h("span", "tbn", null, st.q ? `${d.items.length} of ${n} rows` : `${n} row${n === 1 ? "" : "s"}`));
  if (b.reorder && !d.sel && (st.sort || st.q)) out2.push(h("span", "tbn", null, `${st.sort ? "sorted" : "filtered"}, so rows stay put`), btn("as sent", "", void 0, void 0, go(v, () => (st.sort = null, st.q = ""))));
  if (n && !d.sel) {
    if (b.filter !== false) out2.push(q);
    out2.push(sorter(v, d));
    if (b.columns.length > 2) out2.push(menu(v, "columns", st.hidden.size ? `columns \xB7 ${st.hidden.size} hidden` : "columns"));
  }
  const formats = n ? b.export ?? [] : [];
  if (formats.length === 1 && formats[0]) out2.push(exporter(v, d, formats[0]));
  else if (formats.length) out2.push(menu(v, "export", "export"));
  if (d.sel) out2.push(btn("clear", "", void 0, void 0, go(v, () => st.sel.clear())));
  const menus = [];
  if (st.menu === "columns" && !d.sel && n) {
    const ticks = b.columns.map((x, i) => {
      const k = tick(v, i === 0 || !st.hidden.has(x.id), `Show ${x.label}`, (on) => on ? st.hidden.delete(x.id) : st.hidden.add(x.id), false, "", i === 0);
      return h("label", "", null, k, x.label);
    });
    menus.push(h("div", "tbm", { role: "group", "aria-label": "Columns" }, ...ticks));
  }
  const note2 = d.sel ? `${d.sel} selected rows` : `${d.items.length} rows, as sorted and shown`;
  if (st.menu === "export" && formats.length > 1) menus.push(h("div", "tbm", null, ...formats.map((f) => exporter(v, d, f)), h("p", "note", null, note2)));
  return [h("div", "tbh", null, ...out2), ...menus];
}
function head2(v, d) {
  const ths = d.cols.map((x) => {
    const on = v.st.sort?.by === x.id ? v.st.sort.dir : null;
    const u = unit(x);
    const label = [h("span", "", null, x.label), u ? h("span", "tbu", null, u) : null, h("i", "", null, on === "asc" ? "\u2191" : on === "desc" ? "\u2193" : "")];
    const cycle = () => v.st.sort = on === "desc" ? null : { by: x.id, dir: on === "asc" ? "desc" : "asc" };
    const kids2 = x.sort === false ? label : [h("button", "tsh", { type: "button", ...go(v, cycle) }, ...label)];
    return cell("th", x, "meta", kids2, false, { scope: "col", "aria-sort": on === "asc" ? "ascending" : on === "desc" ? "descending" : void 0 });
  });
  return h("thead", "", null, h("tr", "", null, d.handles ? h("th", "tbg", null) : null, d.pick ? h("th", "tbc", null, every(v, d)) : null, ...ths));
}
function slide(v, order, g) {
  const trs = Array.from(v.box.current?.querySelectorAll("tbody>tr") ?? []);
  const [, all] = chunks(order ?? [], (i) => v.b.rows.some((r) => r.id === i && r.group));
  const lifted = order ? all.find((c) => c[0] === g) ?? [g] : [];
  let y = trs[0]?.offsetTop ?? 0;
  for (const e of trs) {
    e.style.transform = "";
    e.classList.toggle("lift", lifted.includes(e.dataset.id ?? ""));
  }
  for (const e of (order ?? []).flatMap((id) => trs.find((t) => t.dataset.id === id) ?? [])) {
    e.style.transform = `translateY(${y - e.offsetTop}px)`;
    y += e.offsetHeight;
  }
}
function grip(v, r) {
  const g = v.b.reorder;
  if (!g || !grid.word(v.b, r.id)) return h("td", "tbg", null);
  const wire = (hd) => {
    const td = hd?.parentElement;
    if (!hd || !td || v.wired.has(hd)) return;
    v.wired.add(hd);
    const reach = (_, dy) => Math.round(dy / (td.offsetHeight || 1));
    gestured(hd, v.c, { block: v.b, gesture: g, rules: grid, grab: r.id, item: r.id, reach, show: (o) => slide(v, isIds(o) ? o : null, r.id) });
  };
  return h("td", "tbg", null, h("button", "b-hd", { type: "button", "aria-label": `Move ${named(v.b, r)}`, "data-act": g.action, ref: wire }, "\u2261"));
}
function input2(v, r, x, field2) {
  const { b, st } = v;
  const p = { row: r.id, col: x.id };
  const ik = `${field2 ? "f" : "c"}
${pk(p)}`;
  const was = r.cells[x.id];
  const typed = field2 ? null : st.open?.typed ?? null;
  const gesture = b.edit;
  const wire = (e) => {
    if (!e || !gesture || v.wired.has(e)) return;
    v.wired.add(e);
    if (!field2 && e.offsetParent === null) return st.open = null, v.draw();
    const show = (now, ch) => {
      if (now === "previewing" && isEdit(ch)) st.typed = { ...p, value: ch.value };
      if (now === "refused") st.no = pk(p);
      if (now !== "previewing" && now !== "dragging") st.typed = null;
      if (now === "dragging") st.bad.add(ik);
      else st.bad.delete(ik);
      if (now !== "pressed") v.draw();
    };
    const left = (how) => {
      st.bad.delete(ik);
      if (field2) return st.fields.set(x.id, (st.fields.get(x.id) ?? 0) + 1), v.draw();
      st.open = null;
      const d = shows(v), ids2 = d.items.map((i) => i.id), cols = d.cols.map((i) => i.id);
      const [dr, dc] = { down: [1, 0], right: [0, 1], left: [0, -1] }[how] ?? [0, 0];
      if (how !== "blur") st.cur = { row: fit(ids2, p.row, dr), col: fit(cols, p.col, dc) }, st.focus = true;
      v.draw();
    };
    edited(e, v.c, { block: b, gesture, rules: grid, grab: { row: p.row, column: p.col }, item: pk(p), show, left });
    if (!field2) st.no = "", e.focus();
  };
  const value3 = typed ?? (typeof was === "number" ? String(was) : typeof was === "string" ? was : "");
  const box = h("input", "tbi", { key: `${ik}
${st.fields.get(x.id) ?? 0}`, defaultValue: value3, "aria-label": `${x.label}, ${named(b, r)}`, "aria-invalid": st.bad.has(ik) ? "true" : void 0, ref: wire });
  return [box, st.bad.has(ik) ? h("span", "tbx", null, x.kind === "date" ? "not a date (2026-01-31)" : "not a number") : null];
}
function group(v, d, i) {
  const r = d.rows[i] ?? { id: "", cells: {} };
  const items = itemsOf(d.rows, i);
  const tds = d.cols.map((x, j) => {
    const sub = j > 0 && x.total && x.total !== "count" ? total(x, items) : null;
    const wait = sub && cellRole(v.b, x) === "app" && items.some((it) => waits2(v, it));
    return cell("td", x, d.role[j] ?? "meta", j === 0 ? [shown2(x, r.cells[x.id]), h("span", "tbgn", null, String(items.length))] : sub ? [sub[1]] : [], j > 0 && !sub, { className: wait ? "wait" : void 0 });
  });
  return h("tr", "grp", { key: r.id, "data-id": r.id }, d.handles ? grip(v, r) : null, d.pick ? h("td", "tbc", null) : null, ...tds);
}
function item2(v, d, r) {
  const { b, st } = v;
  const max = (x) => x.max ?? Math.max(1, ...b.rows.map((r2) => at(r2, x.id)).filter((n) => typeof n === "number"));
  const cls = [r.tap && !d.ed ? "tap" : "", st.changed.has(r.id) ? "chg" : "", st.fresh.has(r.id) ? "b-late" : "", st.sel.has(r.id) ? "sel" : ""].filter(Boolean).join(" ");
  const tap = r.tap;
  const wait = waits2(v, r);
  const tds = d.cols.map((x, i) => {
    const c = at(r, x.id), t = shown2(x, c), k = cellRole(b, x), p = { row: r.id, col: x.id };
    const fill3 = h("i", "", { style: { width: `${Math.min(1, Math.max(0, Number(c) / max(x))) * 100}%` } });
    const kids2 = c === void 0 ? [] : typeof c === "object" ? [h("span", `tag ${c.tone ?? ""}`, null, t)] : x.kind === "bar" ? [h("span", `tbb ${x.tone ?? ""}`, null, fill3), t] : [t];
    const typed = k === "ed" && !r.fixed;
    const out2 = sent(v, r.id, x.id) !== void 0;
    const ing = st.open !== null && pk(st.open) === pk(p);
    const more = [out2 ? "sent" : "", k === "app" && wait ? "wait" : "", st.no === pk(p) ? "no" : "", ing ? "ing" : "", ing && st.bad.has(`c
${pk(p)}`) ? "bad" : ""].filter(Boolean).join(" ");
    const attrs = {
      className: more || void 0,
      title: x.width && c !== void 0 ? t : void 0,
      "data-c": d.ed ? x.id : void 0,
      tabIndex: d.ed ? d.tab === pk(p) ? 0 : -1 : void 0,
      "aria-label": d.ed ? [x.label, named(b, r), ...t ? [t] : []].join(", ") : void 0,
      "data-act": typed && b.edit ? b.edit.action : void 0,
      "aria-readonly": k === "fx" ? "true" : void 0,
      "aria-description": k === "fx" ? "worked out" : void 0,
      "aria-busy": out2 ? "true" : void 0
    };
    return cell("td", x, d.role[i] ?? "meta", [...typed ? [h("span", "tbf", null, ...kids2)] : kids2, ...ing ? input2(v, r, x, false) : []], c === void 0, attrs);
  });
  const edit2 = d.ed ? h("td", "tbo", null, h("button", "", { type: "button", "aria-label": `Edit ${named(b, r)}`, ...go(v, () => st.sheet = r.id) }, "\u203A")) : null;
  const pick2 = d.pick ? h("td", "tbc", null, tick(v, st.sel.has(r.id), `Select ${r.id}`, (on) => on ? st.sel.add(r.id) : st.sel.delete(r.id))) : null;
  return h("tr", cls, { key: r.id, "data-id": r.id, onClick: tap && !d.ed ? () => v.tap(tap) : void 0 }, d.handles ? grip(v, r) : null, pick2, ...tds, edit2);
}
function body(v, d) {
  const { b, st } = v;
  const rows = d.rows.map((r, i) => r.group ? group(v, d, i) : item2(v, d, r));
  if (!d.items.length) {
    const clear = b.rows.length ? btn("clear", "", void 0, void 0, go(v, () => st.q = "")) : null;
    const td = h("td", "", { colSpan: d.cols.length + (d.pick ? 1 : 0) + (d.handles ? 1 : 0) }, b.rows.length ? `No rows match \u201C${st.q}\u201D. ` : b.empty ?? "No rows yet.", clear);
    rows.push(h("tr", "tbe", { key: "~" }, td));
  }
  return h("tbody", "", d.ed ? keys(v) : null, ...rows);
}
function foot(v, d) {
  if (!d.items.length || !d.cols.some((x) => x.total)) return null;
  const wait = d.items.some((r) => waits2(v, r));
  const tds = d.cols.slice(1).map((x, j) => {
    const i = j + 1;
    const t = total(x, d.items);
    const part = d.role[i] === "title" ? "meta" : d.role[i] ?? "meta";
    return cell("td", x, part, t ? [...t[0] ? [h("span", "agg", null, t[0]), " "] : [], t[1]] : [], !t, { className: t && wait && cellRole(v.b, x) === "app" ? "wait" : void 0 });
  });
  return h("tfoot", "", null, h("tr", "", null, d.handles ? h("td", "tbg", null) : null, d.pick ? h("td", "tbc", null) : null, h("th", "p-title", { scope: "row" }, "Total"), ...tds));
}
function live(v, r) {
  if (r.group) return r;
  const cells = { ...r.cells };
  for (const x of v.b.columns) {
    const s = sent(v, r.id, x.id);
    if (s !== void 0) cells[x.id] = s;
  }
  const t = v.st.typed;
  if (t?.row === r.id) cells[t.col] = t.value;
  return worked(v.b, { ...r, cells });
}
function shows(v) {
  const { b, st } = v;
  const cols = b.columns.filter((x, i) => i === 0 || !st.hidden.has(x.id));
  const words3 = st.q.toLowerCase().split(/\s+/).filter(Boolean);
  const out2 = b.rows.map((r) => held2(v.c, { block: b, rules: grid, grab: r.id, item: r.id })).find(isIds);
  const all = (out2 ? out2.flatMap((id) => b.rows.find((r) => r.id === id) ?? []) : b.rows).map((r) => live(v, r));
  const hit = (r) => words3.every((w) => cols.some((x) => shown2(x, at(r, x.id)).toLowerCase().includes(w)));
  const kept = all.filter((r, i) => r.group ? itemsOf(all, i).some(hit) : hit(r));
  const rows = sorted(kept, sort(v), st.sort?.dir);
  const items = rows.filter((r) => !r.group);
  for (const s of st.sel) if (!items.some((r) => r.id === s)) st.sel.delete(s);
  const sel = st.sel.size;
  const handles = !!b.reorder && !st.sort && !st.q;
  const cur = st.cur && items.some((r) => r.id === st.cur?.row) && cols.some((x) => x.id === st.cur?.col) ? pk(st.cur) : null;
  const first = items[0] && cols[0] ? pk({ row: items[0].id, col: cols[0].id }) : "";
  return { cols, role: roles2(cols), rows, items, pick: !!b.select && b.rows.length > 0, sel, all: sel > 0 && sel === items.length, handles, ed: !!b.edit, tab: cur ?? first };
}
function open(v, p, typed = null) {
  const td = cellAt(v, p);
  const now = v.st.open !== null && pk(v.st.open) === pk(p);
  if (!v.b.edit || !td || now || td.getAttribute("aria-disabled") === "true" || sent(v, p.row, p.col) !== void 0 || !grid.word(v.b, { row: p.row, column: p.col })) return;
  v.st.open = { ...p, typed };
}
function keys(v) {
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  const onKeyDown = (e) => {
    const td = e.target instanceof HTMLElement && e.target.matches("td[data-c]") ? e.target : null;
    const row4 = td?.parentElement?.dataset.id;
    if (!td || !row4 || !td.dataset.c) return;
    const p = { row: row4, col: td.dataset.c };
    const m = moves[e.key];
    const d = shows(v), ids2 = d.items.map((i) => i.id), cols = d.cols.map((i) => i.id);
    if (m) v.st.cur = { row: fit(ids2, row4, m[0]), col: fit(cols, p.col, m[1]) }, v.st.focus = true;
    else if (e.key === "Enter") open(v, p);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== " ") open(v, p, e.key);
    else return;
    e.preventDefault();
    v.draw();
  };
  const onClick = (e) => {
    const td = e.target instanceof Element ? e.target.closest("td[data-c]") : null;
    const row4 = td?.parentElement?.dataset.id;
    if (!td || !row4 || !td.dataset.c || td.querySelector(".tbi")) return;
    v.st.cur = { row: row4, col: td.dataset.c };
    open(v, v.st.cur);
    v.draw();
  };
  return { onKeyDown, onClick };
}
function sheet2(v, d) {
  const { b, st } = v;
  const r = d.items.find((i) => i.id === st.sheet);
  if (!r) return null;
  const g = [...d.rows].reverse().find((x, i, all) => x.group && all.indexOf(r) < i);
  const mine = g ? itemsOf(d.rows, d.rows.indexOf(g)) : [];
  const where = g ? h("span", "shp", null, `${named(b, g)} \xB7 ${mine.indexOf(r) + 1} of ${mine.length}`) : null;
  const tap = r.tap;
  const top = h("div", "b-sheet__head", null, h("b", "b-sheet__title", null, named(b, r), where), tap ? btn("open", "", void 0, void 0, { onClick: () => v.tap(tap) }) : null, btn("done", "", void 0, void 0, go(v, () => st.sheet = "")));
  const fields = b.columns.map((x) => {
    const k = cellRole(b, x), u = unit(x);
    const typed = k === "ed" && !r.fixed;
    const out2 = sent(v, r.id, x.id) !== void 0;
    const ing = typed && !out2 && grid.word(b, { row: r.id, column: x.id }) !== null;
    const bad = ing && st.bad.has(`f
${pk({ row: r.id, col: x.id })}`);
    const box = h("span", ["shv", ing ? "ing" : "", bad ? "bad" : ""].filter(Boolean).join(" "), null, ...typed ? ing ? input2(v, r, x, true) : [] : [shown2(x, at(r, x.id))]);
    const cls = [out2 ? "sent" : "", k === "app" && waits2(v, r) ? "wait" : ""].filter(Boolean).join(" ");
    return h("label", `fd shf ${atEnd(x) ? "end" : "start"}`, { className: cls || void 0 }, h("span", "fk", null, x.label, u ? h("span", "tbu", null, u) : null), box);
  });
  return h("div", "tbsh", { key: `sheet${st.gen}` }, h("div", "b-sheet__card", { role: "dialog", "aria-label": `Edit ${named(b, r)}` }, top, ...fields));
}
function state(b, st) {
  if (st.b === b) return st;
  const now = new Map(b.rows.map((r) => [r.id, JSON.stringify(r)]));
  if (st.seen.size && JSON.stringify([...now]) !== JSON.stringify([...st.seen])) {
    st.changed = new Set(b.rows.filter((r) => st.seen.get(r.id) !== now.get(r.id)).map((r) => r.id));
    st.fresh = new Set([...st.changed].filter((r) => !st.seen.has(r)));
    st.no = "";
  }
  return Object.assign(st, { b, seen: now, gen: st.gen + 1, open: null });
}
var init = (b) => ({
  b: null,
  gen: 0,
  sort: b.sort ?? null,
  q: "",
  hidden: new Set(b.columns.filter((x) => x.hide).map((x) => x.id)),
  sel: /* @__PURE__ */ new Set(),
  menu: "",
  seen: /* @__PURE__ */ new Map(),
  changed: /* @__PURE__ */ new Set(),
  fresh: /* @__PURE__ */ new Set(),
  cur: null,
  focus: false,
  typed: null,
  no: "",
  sheet: "",
  open: null,
  bad: /* @__PURE__ */ new Set(),
  fields: /* @__PURE__ */ new Map()
});
function table({ b, hooks: hooks4 }) {
  const cx = useContext8(Cx);
  const live2 = useRef5(cx);
  live2.current = cx;
  const keep = useRef5(/* @__PURE__ */ new Map());
  const wired = useRef5(/* @__PURE__ */ new WeakSet());
  const box = useRef5(null);
  const kept = useRef5(null);
  const [, draw2] = useReducer((n) => n + 1, 0);
  const st = state(b, kept.current ??= init(b));
  const v = { b, c: { act: (a) => live2.current.act(a), held: keep.current }, tap: (t2) => live2.current.tap(t2), st, box, wired: wired.current, draw: draw2 };
  useLayoutEffect(() => {
    if (!st.focus || !st.cur) return;
    st.focus = false;
    cellAt(v, st.cur)?.focus();
  });
  const d = shows(v);
  const t = h("table", "", d.ed ? { role: "grid" } : null, h("caption", "", null, b.title ?? "Table"), head2(v, d), body(v, d), foot(v, d));
  const cls = ["tbl", d.sel > 0 ? "bulk" : "", b.edit || b.reorder ? "ed" : ""].filter(Boolean).join(" ");
  return h("div", cls, { ...hooks4, ref: box }, ...bar(v, d), h("div", "tbw", { key: `w${st.gen}` }, t), sheet2(v, d));
}

// react/src/kinds/text.ts
import { useContext as useContext9 } from "react";
function text3({ b, hooks: hooks4 }) {
  const cx = useContext9(Cx);
  return h("div", "txt", { ...hooks4, "data-md": b.markdown ?? "" }, ...md(b.markdown, cx.screen.startsWith("thread-")));
}

// react/src/kinds/timeline.ts
import { useContext as useContext10, useLayoutEffect as useLayoutEffect2, useRef as useRef6, useState as useState6 } from "react";

// src/core/kind/timeline.ts
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MS = 864e5;
var STEPS2 = [
  ["body", "One day earlier", { dir: "left" }],
  ["body", "One day later", { dir: "right" }],
  ["body", "One week earlier", { dir: "left", big: true }],
  ["body", "One week later", { dir: "right", big: true }],
  ["start", "Start one day earlier", { dir: "left" }],
  ["start", "Start one day later", { dir: "right" }],
  ["end", "End one day earlier", { dir: "left" }],
  ["end", "End one day later", { dir: "right" }]
];
function day(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const n = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS;
  return iso(n) === s ? n : null;
}
var iso = (n) => new Date(n * MS).toISOString().slice(0, 10);
var parts = (n) => {
  const d = new Date(n * MS);
  return { date: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), weekday: d.getUTCDay() };
};
var short = (n) => `${parts(n).date} ${MONTHS[parts(n).month] ?? ""}`;
function words2(start2, end) {
  const [a, b] = [day(start2), day(end)];
  if (a === null || b === null) return `${start2} to ${end}`;
  const k = b - a + 1;
  return `${a === b ? short(a) : `${short(a)} to ${short(b)}`}, ${k} ${k === 1 ? "day" : "days"}`;
}
var covers = (b, a, z) => {
  const [s, e] = [day(b.start), day(b.end)];
  return s !== null && e !== null && s <= z && e >= a;
};
var range = (t) => {
  const [f, z] = [day(t.from), day(t.to)];
  return f === null || z === null ? null : { f, z };
};
var track = (t, id) => t.tracks.find((r) => r.id === id);
var bar2 = (t, id) => {
  for (const r of t.tracks) for (const b of r.bars) if (b.id === id) return [r, b];
  return null;
};
function firstFree(t, r) {
  const at2 = range(t);
  for (let d = at2?.f ?? 0; at2 && d <= at2.z; d++) if (!r.bars.some((b) => covers(b, d, d))) return d;
  return null;
}
var span = (a, b, id) => ({ ...id, start: iso(a), end: iso(b) });
function fits(t, g, a, b) {
  const at2 = range(t);
  if (!at2 || a > b) return null;
  if ("row" in g) {
    const r = track(t, g.row);
    return r && a >= at2.f && b <= at2.z && !r.bars.some((o) => covers(o, a, b)) ? span(a, b, { row: g.row }) : null;
  }
  const found = bar2(t, g.bar);
  const [s, e] = found ? [day(found[1].start), day(found[1].end)] : [null, null];
  if (!found || s === null || e === null) return null;
  const past = a !== s && a < at2.f || b !== e && b > at2.z;
  const onto = found[0].bars.some((o) => o.id !== g.bar && o.fixed === true && covers(o, a, b));
  return past || onto ? null : span(a, b, { id: g.bar });
}
function edit(t, g, from, by) {
  const [a, b] = [day(from.start), day(from.end)];
  if (a === null || b === null) return null;
  if ("row" in g) return by >= 0 ? fits(t, g, a, a + by) : fits(t, g, a + by, a);
  if (g.part === "body") return fits(t, g, a + by, b + by);
  return g.part === "start" ? fits(t, g, Math.min(a + by, b), b) : fits(t, g, a, Math.max(b + by, a));
}
var same2 = (x, y) => x.id === y.id && x.row === y.row && x.start === y.start && x.end === y.end;
var timeline = {
  word: (t, g) => {
    if ("row" in g) {
      const r = track(t, g.row);
      return t.draw != null && r && firstFree(t, r) !== null ? "draw" : null;
    }
    const x = bar2(t, g.bar)?.[1];
    if (!x || x.fixed === true || day(x.start) === null || day(x.end) === null) return null;
    if (g.part === "body") return t.move != null ? "move" : null;
    return t.stretch != null ? "stretch" : null;
  },
  start: (t, g) => {
    if (!timeline.word(t, g)) return null;
    if ("bar" in g) {
      const x = bar2(t, g.bar)?.[1];
      return x ? { id: x.id, start: x.start, end: x.end } : null;
    }
    const r = track(t, g.row);
    const d = r ? firstFree(t, r) : null;
    return d === null ? null : { start: iso(d), end: iso(d) };
  },
  candidate: (t, g, r) => {
    const s = timeline.start(t, g);
    if (!s) return null;
    return edit(t, g, "row" in g && r.from != null ? { start: r.from, end: r.from } : s, r.days);
  },
  nudge: (t, g, from, n) => {
    if (n.dir === "up" || n.dir === "down") return null;
    const by = (n.dir === "left" ? -1 : 1) * (n.big ? 7 : 1);
    const [a, b] = [day(from.start), day(from.end)];
    let next;
    if ("row" in g && from.row == null) next = edit(t, g, from, Math.min(Math.abs(by) - 1, 6));
    else if ("row" in g) next = a === null || b === null ? null : fits(t, g, a, Math.max(b + by, a));
    else next = edit(t, g, from, by);
    return next && !same2(next, from) ? next : null;
  },
  steps: (t, g) => {
    const s = timeline.start(t, g);
    if (!s) return [];
    if ("row" in g) return [["Add a bar", { dir: "right" }]];
    return STEPS2.filter(([p, , n]) => p === g.part && timeline.nudge(t, g, s, n) !== null).map(([, name, n]) => [name, n]);
  },
  says: (_, __, c) => words2(c.start, c.end)
};
function lanes(bars) {
  const ends = [];
  const of = /* @__PURE__ */ new Map();
  for (const x of [...bars].sort((p, q) => (day(p.start) ?? 0) - (day(q.start) ?? 0))) {
    const s = day(x.start) ?? 0;
    let i = ends.findIndex((e) => e < s);
    if (i < 0) i = ends.push(0) - 1;
    ends[i] = day(x.end) ?? s;
    of.set(x.id, i);
  }
  return { of, n: Math.max(1, ends.length) };
}
var barName = (x) => `${x.label ?? "Bar"}, ${words2(x.start, x.end)}${x.progress != null ? `, ${x.progress} % done` : ""}${x.fixed ? ", fixed" : ""}`;

// react/src/kinds/timeline.ts
var MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var STEPS3 = [48, 32, 24, 16, 8, 4];
var WD = "SMTWTFS";
var ref = () => ({ current: null });
var vars = (v) => ({ style: Object.fromEntries(Object.entries(v).map(([k, n]) => [`--${k}`, n])) });
var clip = (a, b, x) => ({ o: Math.max(a, x.f) - x.f, d: Math.min(b, x.t) - Math.max(a, x.f) + 1 });
var isSpan = (v) => typeof v === "object" && v !== null && "start" in v && "end" in v;
function axis(x, off) {
  const mo = [];
  const dy = [];
  for (let d = x.f; d <= x.t; ) {
    const { month, year } = parts(d);
    let k = 0;
    while (d + k <= x.t && parts(d + k).month === month) k++;
    const name = x.z === 3 && x.px !== null && k * x.px < 90 ? (MONTH[month] ?? "").slice(0, 3) : MONTH[month] ?? "";
    mo.push(h("span", "", vars({ k }), h("b", "", null, `${name} ${year}`)));
    d += k;
  }
  for (let d = x.f; d <= x.t; d++) {
    const { date, weekday } = parts(d);
    const kids2 = x.z === 1 ? [h("b", "", null, String(date)), h("i", "", null, WD[weekday] ?? "")] : x.z === 2 && (weekday === 1 || d === x.f) ? [h("b", "", null, String(date))] : [];
    dy.push(h("span", off.has(d) ? "off" : "", null, ...kids2));
  }
  return h("div", "tmhd", null, h("div", "tmc", null), h("div", "tmx", null, h("div", "tmm", null, ...mo), h("div", "tmd", null, ...dy)));
}
function shown3(ghost, tag, home, to, px, text4) {
  ghost.classList.toggle("on", to !== null);
  ghost.style.transform = to ? `translateX(${(to.o - home.o) * px}px) scaleX(${to.d / home.d})` : "";
  tag.textContent = text4;
  tag.classList.toggle("on", text4 !== "");
  tag.style.transform = to ? `translateX(${(to.o - home.o) * px}px)` : "";
}
function bar3(b, x, y, gap, ax, wires) {
  const [s, e] = [day(x.start) ?? 0, day(x.end) ?? 0];
  const home = clip(s, e, ax);
  const cls = ["tmb", x.tone, x.fixed ? "fix" : "", s < ax.f ? "cs" : "", e > ax.t ? "ce" : "", home.d <= 1 && gap >= 2 && x.label ? "out" : ""];
  const [w, ghost, tag, body2] = [ref(), ref(), ref(), ref()];
  const movable = ax.live && (b.move != null || b.stretch != null) && !x.fixed;
  const grips = [];
  const grip2 = (part) => {
    const g = ref();
    grips.push(h("span", part === "start" ? "tmgs" : "tmge", { ref: g, role: "button", "aria-label": `${part === "start" ? "Start" : "End"} of ${x.label ?? "bar"}`, tabIndex: b.stretch ? -1 : void 0 }));
    return g;
  };
  const all = movable ? [
    [body2, "body", b.move],
    [ax.z === 1 && s >= ax.f ? grip2("start") : null, "start", b.stretch],
    [ax.z === 1 && e <= ax.t ? grip2("end") : null, "end", b.stretch]
  ] : [];
  const own3 = { ref: body2, "aria-label": barName(x), role: movable ? "button" : "listitem", "aria-roledescription": movable ? "bar" : void 0, tabIndex: x.tap || movable && b.move ? -1 : void 0 };
  wires.push((c) => {
    const [we, gh, tg, bd] = [w.current, ghost.current, tag.current, body2.current];
    if (!we || !gh || !tg || !bd) return;
    const tap = x.tap;
    if (tap) {
      bd.addEventListener("click", () => c.tap(tap));
      bd.addEventListener("keydown", (k) => k.key === "Enter" && !k.defaultPrevented && bd.dataset.phase !== "previewing" && c.tap(tap));
    }
    for (const [r, part, gesture] of all) {
      const g = r?.current;
      if (!g || !gesture) continue;
      const grab = { bar: x.id, part };
      const item3 = `${x.id}${part === "body" ? "" : part === "start" ? "<" : ">"}`;
      const show = (span2) => {
        const [a, z] = span2 ? [day(span2.start) ?? s, day(span2.end) ?? e] : [s, e];
        const px = ax.lane() / ax.n;
        const text4 = span2 ? words2(span2.start, span2.end) : g.dataset.phase === "dragging" ? "no drop here" : "";
        if (part !== "body") return shown3(gh, tg, home, span2 ? clip(a, z, ax) : null, px, text4);
        we.style.transform = span2 ? `translate(${(a - s) * px}px, -3px)` : "";
        shown3(gh, tg, home, null, px, text4);
        gh.classList.toggle("on", span2 !== null);
        tg.style.transform = span2 ? `translateX(${(a - s) * px}px)` : "";
      };
      gestured(g, c, { block: b, gesture, rules: timeline, grab, item: item3, reach: (dx) => ({ days: Math.round(dx / (ax.lane() / ax.n)) }), show });
      const out2 = held2(c, { block: b, rules: timeline, grab, item: item3 });
      if (isSpan(out2)) show(out2);
      if (ax.z > 1) g.addEventListener("pointerdown", (p) => p.stopImmediatePropagation(), { capture: true });
    }
  });
  const kids2 = [x.progress != null ? h("i", "tmp", vars({ p: x.progress / 100 })) : null, h("span", "tmbx", null, x.label ?? ""), h("div", "tmbb", own3), ...grips];
  return [h("div", "tmgh", { ref: ghost, ...vars({ ...home, y }) }), h("div", cls.filter(Boolean).join(" "), { ref: w, ...vars({ ...home, y, gap }) }, ...kids2), h("span", "tmtag", { ref: tag, ...vars({ o: home.o, y }) })];
}
function draw(b, r, ax, gesture, wires) {
  const [hit, ghost, tag] = [ref(), ref(), ref()];
  const home = { o: 0, d: 1 };
  wires.push((c) => {
    const [ht, gh, tg, lane] = [hit.current, ghost.current, tag.current, hit.current?.parentElement];
    if (!ht || !gh || !tg || !lane) return;
    let from = null;
    ht.addEventListener("pointerdown", (p) => {
      const at2 = Math.floor((p.clientX - lane.getBoundingClientRect().left) / (ax.lane() / ax.n));
      from = firstFree(b, r) === null ? null : iso(ax.f + at2);
    });
    const grab = { row: r.id };
    const show = (span2) => {
      const to = span2 ? clip(day(span2.start) ?? ax.f, day(span2.end) ?? ax.f, ax) : null;
      shown3(gh, tg, home, to, ax.lane() / ax.n, span2 ? words2(span2.start, span2.end) : "");
    };
    const n = lane.children.length;
    gestured(ht, c, { block: b, gesture, rules: timeline, grab, item: `row:${r.id}`, reach: (dx) => ({ days: Math.round(dx / (ax.lane() / ax.n)), from }), show });
    tg.after(...Array.from(lane.children).slice(n));
    const out2 = held2(c, { block: b, rules: timeline, grab, item: `row:${r.id}` });
    if (isSpan(out2)) show(out2);
    if (ax.z > 1) ht.addEventListener("pointerdown", (p) => p.stopImmediatePropagation(), { capture: true });
  });
  return [h("div", "tmbb", { ref: hit, "aria-label": `${r.title}, Add a bar`, role: "button", tabIndex: -1 }), h("div", "tmgh st", { ref: ghost, ...vars({ ...home, y: 0 }) }), h("span", "tmtag", { ref: tag, ...vars({ o: 0, y: 0 }) })];
}
function track2(b, r, ax, off, wires) {
  const L = lanes(r.bars);
  const marks = [];
  for (let d = ax.f; d <= ax.t; d++) {
    if (off.has(d)) marks.push(h("div", "tmo", vars({ o: d - ax.f })));
    else if (ax.z > 1 && parts(d).weekday === 1) marks.push(h("div", "tmk", vars({ o: d - ax.f })));
  }
  const drawn = b.draw && ax.live ? draw(b, r, ax, b.draw, wires) : [];
  const bars = r.bars.flatMap((x) => {
    const [s, e] = [day(x.start), day(x.end)];
    if (s === null || e === null || e < ax.f || s > ax.t) return [];
    const y = L.of.get(x.id) ?? 0;
    const next = r.bars.filter((q) => L.of.get(q.id) === y && (day(q.start) ?? 0) > e).map((q) => day(q.start) ?? 0);
    return bar3(b, x, y, Math.min(...next, ax.t + 1) - Math.min(e, ax.t) - 1, ax, wires);
  });
  const label = h("div", "tml", null, h("b", "", null, r.title), r.subtitle ? h("span", "", null, r.subtitle) : null);
  return h("div", "tmr", null, label, h("div", "tmn", { ...vars({ rows: L.n }), role: "list", "aria-label": r.title }, ...marks, ...drawn, ...bars));
}
function rove(root) {
  const stops = () => Array.from(root.querySelectorAll("[data-grab]"));
  const focus = (e) => {
    if (!(e.target instanceof HTMLElement) || !e.target.dataset.grab) return;
    const at2 = e.target;
    for (const s of stops()) s.tabIndex = s === at2 || at2.classList.contains("tmbb") && s.parentElement === at2.parentElement ? 0 : -1;
  };
  const key2 = (e) => {
    const all = stops();
    const i = e.target instanceof HTMLElement ? all.indexOf(e.target) : -1;
    const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (e.defaultPrevented || i < 0 || by === void 0) return;
    all[Math.min(all.length - 1, Math.max(0, i + by))]?.focus();
    e.preventDefault();
  };
  root.addEventListener("focusin", focus);
  root.addEventListener("keydown", key2);
  return () => {
    root.removeEventListener("focusin", focus);
    root.removeEventListener("keydown", key2);
  };
}
function timeline2({ b, hooks: hooks4 }) {
  const cx = useContext10(Cx);
  const live2 = useRef6(cx);
  live2.current = cx;
  const keep = useRef6(/* @__PURE__ */ new Map());
  const done = useRef6(/* @__PURE__ */ new WeakSet());
  const [root, wrap, grid2] = [useRef6(null), useRef6(null), useRef6(null)];
  const [px, setPx] = useState6(null);
  const [f, t] = [day(b.from), day(b.to)];
  const on = b.move != null || b.stretch != null || b.draw != null;
  const z = px === null || px >= 24 ? 1 : px >= 12 ? 2 : 3;
  const ax = f === null || t === null || t < f || b.tracks.length === 0 ? null : { f, t, n: t - f + 1, z, px, live: on, lane: () => grid2.current?.querySelector(".tmn")?.offsetWidth ?? 1 };
  const k = JSON.stringify([b, px]);
  const wires = [];
  useLayoutEffect2(() => root.current ? rove(root.current) : void 0, []);
  useLayoutEffect2(() => {
    if (done.current.has(wires)) return;
    done.current.add(wires);
    const c = { act: (a) => live2.current.act(a), tap: (x) => live2.current.tap(x), held: keep.current };
    for (const w of wires) w(c);
    const first = root.current?.querySelector("[data-grab]");
    if (first) first.tabIndex = 0;
  }, [k]);
  const head3 = h("div", "tmh", null, h("span", "tmt", null, b.title ?? ""), on && z > 1 ? h("span", "tmq", null, "zoom in to drag") : null, ax ? zooms(ax, px, setPx, wrap, grid2) : null);
  if (!ax) return h("div", `tm z${z}`, { ...hooks4, ref: root }, head3, h("div", "tme", null, b.empty ?? "Nothing scheduled"));
  const off = new Set((b.off ?? []).flatMap((d) => day(d) ?? []));
  const body2 = h("div", "tmg", { ref: grid2 }, axis(ax, off), ...b.tracks.map((r) => track2(b, r, ax, off, wires)));
  return h("div", `tm z${z}`, { ...hooks4, ref: root }, head3, h("div", "tmw", { key: k, ref: wrap, style: { "--n": ax.n, ...px === null ? null : { "--day": `${px}px` } } }, body2));
}
function zooms(ax, px, set, wrap, grid2) {
  const fit2 = () => Math.min(48, Math.max(24, ((wrap.current?.clientWidth ?? 0) - (grid2.current?.querySelector(".tml")?.offsetWidth ?? 200)) / ax.n));
  const now = () => px ?? fit2();
  const zoom = (name, label, to, end) => h("button", "", { type: "button", "aria-label": name, disabled: end || void 0, onClick: () => set(to()) }, label);
  return h(
    "div",
    "tmz",
    null,
    zoom("zoom out", "\u2212", () => STEPS3.find((s) => s < now()) ?? 4, px === 4),
    zoom("fit to width", "fit", () => null, px === null),
    zoom("zoom in", "+", () => [...STEPS3].reverse().find((s) => s > now()) ?? 48, px === 48)
  );
}

// react/src/gen/views.ts
var views2 = { button, card, chips, form, images, list, row, screen, section, sheet, stat, table, text: text3, timeline: timeline2 };

// react/src/island.ts
import { createElement as createElement6, Suspense, useContext as useContext11, useLayoutEffect as useLayoutEffect3, useState as useState7 } from "react";
function Mark({ on }) {
  useLayoutEffect3(() => {
    on(true);
    return () => on(false);
  }, [on]);
  return null;
}
function Isle({ b, attrs }) {
  const cx = useContext11(Cx);
  const [live2, setLive] = useState7(false);
  const C = Object.prototype.hasOwnProperty.call(cx.islands, b.name) ? cx.islands[b.name] : void 0;
  const fallback = row3(b.fallback, cx);
  const id = b.id ?? "";
  const emit = (name, values) => b.events?.includes(name) ? void cx.act({ action: name, block: id, values: values ?? {} }) : cx.report({ what: "dropped", block: id, event: name });
  const style = { overflow: "hidden", aspectRatio: b.size?.aspect ?? void 0, width: b.size?.width ?? void 0, height: b.size?.height ?? void 0 };
  const inner = C && createElement6(Boundary, { b, report: cx.report, fallback }, createElement6(Suspense, { fallback }, createElement6(Mark, { on: setLive }), createElement6(C, { props: b.props ?? {}, emit })));
  return h("div", "", { ...attrs, "data-fallback": C && live2 ? void 0 : "", style }, inner || fallback);
}

// react/src/block.ts
var isBlk2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var core = (b) => Object.prototype.hasOwnProperty.call(hooks2, String(b.type));
var isIsland = (b) => b.type === "island" && typeof b.name === "string" && isBlk2(b.fallback);
var isFallback = (v) => isBlk2(v) && typeof v.title === "string";
function hooksOf(b, cx, fallback) {
  const t = String(b.type);
  const id = typeof b.id === "string" ? b.id : void 0;
  const v = core(b) ? hooks2[b.type].variant : null;
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
    "aria-label": named2(b, t)
  };
}
function row3(f, cx) {
  const tap = f.tap;
  const pressed = tap ? press(() => cx.tap(tap)) : null;
  const sub = f.subtitle != null ? h("span", "rs b-row__subtitle", null, f.subtitle) : null;
  return h("div", tap ? "row tap" : "row", pressed, h("span", "rm", null, h("span", "rt b-row__title", null, f.title), sub));
}
var kids = (bs) => (Array.isArray(bs) ? bs.filter(isBlk2) : []).map((b, i) => createElement7(Block, { key: typeof b.id === "string" ? b.id : `~${i}`, b }));
function Fallen({ b }) {
  const cx = useContext12(Cx);
  const f = b.fallback ?? { title: String(b.type) };
  return h("div", "", hooksOf(b, cx, true), isFallback(f) ? row3(f, cx) : null, ...kids(b.blocks));
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
var own2 = (t, b, attrs) => {
  const V = views2[t];
  return V ? createElement7(V, { b, hooks: attrs }) : void 0;
};
function Draw({ b }) {
  const cx = useContext12(Cx);
  if (isIsland(b)) return createElement7(Isle, { b, attrs: hooksOf(b, cx, false) });
  if (core(b)) return own2(b.type, b, hooksOf(b, cx, false)) ?? createElement7(Fallen, { b });
  const K = cx.kinds[String(b.type)];
  const act2 = (a) => cx.act({ ...a, block: typeof b.id === "string" ? b.id : null });
  return K ? h("div", "", hooksOf(b, cx, false), createElement7(K, { block: { ...b, type: String(b.type) }, act: act2 })) : createElement7(Fallen, { b });
}
var Block = memo(function Block2({ b }) {
  const cx = useContext12(Cx);
  return createElement7(Boundary, { b, report: cx.report, fallback: createElement7(Fallen, { b }) }, createElement7(Draw, { b }));
});

// react/src/view.ts
var native = Object.keys(hooks3).filter((k) => Object.prototype.hasOwnProperty.call(views2, k));
var DARK = "(prefers-color-scheme: dark)";
var watch = (on) => {
  const m = matchMedia(DARK);
  m.addEventListener("change", on);
  return () => m.removeEventListener("change", on);
};
function BlocksView(p) {
  const last = useRef7(void 0);
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
