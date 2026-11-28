import { type OnFile, sized } from "../core/field/files.ts";
import { linkable } from "../core/check.ts";
import { answered, fresh, type ImportState, type ImportView, kinds, over, sample, say, values, view } from "../core/kind/import.ts";
import type { FileLink, Import, ImportColumn, ImportRow, Locale } from "../gen/types.ts";
import { el, h } from "../render/dom.ts";

/// What the view needs of its renderer: the screen, the locale, the app's file handler and its actions.
export type Ctx = { screen: string; locale?: Locale | undefined; file?: OnFile | undefined; act: (a: { action: string; block?: string | null | undefined; values: Record<string, unknown> }) => Promise<boolean> };
type W = (k: string, v?: Record<string, string | number>) => string;
type X = { b: Import; c: Ctx; st: ImportState; v: ImportView; w: W; draw: () => void };

const states = new Map<string, ImportState>();
const latest = new Map<string, { b: Import; draw: () => void }>();
const num = (c: ImportColumn) => c.type === "money" || c.type === "number";

const press = (label: string, go: () => unknown, off = false, cls = "", name = "") => {
  const e = Object.assign(el("button", cls), { type: "button", disabled: off });
  if (name) e.setAttribute("aria-label", name);
  e.append(h("span", "", label));
  e.onclick = () => void go();
  return e;
};
const busy = (label: string) => {
  const e = press(label, () => 0, true);
  e.setAttribute("aria-busy", "true");
  return e;
};
const link = (label: string, f: FileLink, name: string) => {
  const a = Object.assign(el("a", "btn"), { href: linkable(f.src) ? f.src : "", download: f.name });
  a.setAttribute("aria-label", name);
  a.append(h("span", "", label));
  return a;
};

function act(x: X, action: string, phase: "reading" | "checking" | "sending") {
  const key = keyOf(x.b, x.c), n = ++x.st.seq;
  x.st.phase = phase;
  x.draw();
  void x.c.act({ action, block: x.b.id, values: values(x.b, x.st) }).then((ok) => {
    const at = latest.get(key);
    if (n !== x.st.seq || !at) return;
    answered(x.st, at.b, ok);
    at.draw();
  });
}

function upload(x: X, f: File) {
  const { st, c } = x;
  st.stop?.abort();
  const stop = new AbortController();
  Object.assign(st, { phase: "up", id: "", name: f.name, size: f.size, part: 0, why: "", stop, seq: st.seq + 1 });
  if (over(x.b, f.size) || !c.file) return Object.assign(st, { phase: "upfail", why: say(c.locale?.lang, "tooBig", { size: sized(f.size), mb: x.b.mb ?? 0 }) }), x.draw();
  x.draw();
  const progress = (p: number) => ((st.part = Math.min(1, Math.max(0, p))), x.draw());
  c.file(f, { screen: c.screen, block: x.b.id ?? undefined, field: "file", name: f.name, mime: f.type, size: f.size, progress, signal: stop.signal }).then(
    (ref) => !stop.signal.aborted && ((st.id = ref.id), act(x, x.b.read ?? "", "reading")),
    () => !stop.signal.aborted && ((st.phase = "upfail"), x.draw()),
  );
}

function needs(x: X): HTMLElement {
  const req = x.b.columns.filter((c) => c.required), opt = x.b.columns.filter((c) => !c.required);
  const p = h("p", "imn", `${x.w("imNeeds")} `);
  req.forEach((c, i) => p.append(...(i ? [", "] : []), h("b", "", c.label)));
  if (opt.length) p.append(` ${x.w("imMay")} ${opt.map((c) => (c.values?.length ? `${c.label} (${c.values.join(", ")})` : c.label)).join(", ")}`);
  return p;
}

function empty(x: X): HTMLElement[] {
  const off = x.v.phase === "off", i = Object.assign(el("input"), { type: "file", hidden: true, accept: kinds(x.b).join(",") });
  const open = (f: File | null | undefined) => f && upload(x, f);
  i.onchange = () => open(i.files?.[0]);
  const hint = off ? x.w("imOff") : x.w("imHint", { types: kinds(x.b).join(` ${x.w("imOr")} `), mb: x.b.mb ?? 10 });
  const d = h("div", "imd", h("span", "", x.w("imDrop")), h("span", "m", x.w("imOr")), press(x.w("file1"), () => i.click(), off, "", `${x.w("file1")}: ${x.b.title}`), h("span", "m", hint), i);
  if (!off) {
    d.ondragover = (e) => (e.preventDefault(), d.classList.add("over"));
    d.ondragleave = () => d.classList.remove("over");
    d.ondrop = (e) => (e.preventDefault(), d.classList.remove("over"), open(e.dataTransfer?.files[0]));
  }
  return [d, needs(x)];
}

function fileLine(x: X): HTMLElement {
  const { st, v, w } = x, phase = v.phase, f = v.sheet?.file;
  const bad = phase === "upfail" || phase === "readfail";
  const ext = h("span", "fux", st.name.split(".").pop() ?? "");
  ext.setAttribute("aria-hidden", "true");
  const m = h("span", "fum", h("span", "fun", st.name));
  const size = st.size ? `${sized(st.size)} · ` : "";
  const again = () => (st.stop?.abort(), Object.assign(st, fresh({ ...x.b, done: null, sheet: null })), x.draw());
  const box = h("div", bad ? "imf bad" : "imf", ext, m);
  if (phase === "up") {
    const p = Math.round(st.part * 100), t = h("span", "pgt", el("b"));
    t.setAttribute("style", `--v:${p}`);
    for (const [k, a] of [["role", "progressbar"], ["aria-valuemin", "0"], ["aria-valuemax", "100"], ["aria-valuenow", String(p)], ["aria-label", w("uploading", { p })]] satisfies [string, string][]) t.setAttribute(k, a);
    m.append(t, h("span", "fus", size + w("uploading", { p })));
    box.append(press(w("imCancel"), again, false, "", `${w("imCancel")}: ${st.name}`));
  } else if (phase === "reading") {
    m.append(h("span", "fus spin", size + w("imReading")));
    box.setAttribute("aria-busy", "true");
    box.append(press(w("imCancel"), again, false, "", `${w("imCancel")}: ${st.name}`));
  } else if (bad) {
    m.append(h("span", "fus", size + (st.why || (phase === "upfail" ? w("failed") : w("imNoAnswer")))));
    const retry = () => (phase === "readfail" ? act(x, x.b.read ?? "", "reading") : again());
    box.append(h("span", "bar", ...(st.why ? [] : [press(w("retry"), retry, false, "", `${w("retry")}: ${st.name}`)]), press(w("imAnother"), again)));
  } else {
    if (f?.sheets && f.sheets.length > 1) {
      const s = el("select");
      s.setAttribute("aria-label", w("imSheet"));
      s.disabled = phase !== "review";
      for (const t of f.sheets) s.append(Object.assign(el("option"), { value: t, textContent: `${w("imSheet")}: ${t}`, selected: t === (st.sheet ?? f.sheet) }));
      s.onchange = () => ((st.sheet = s.value), act(x, x.b.read ?? "", "checking"));
      m.append(s);
    }
    m.append(h("span", "fus", w("imRows", { n: f?.rows ?? 0 }) + (f?.sheet && !(f.sheets && f.sheets.length > 1) ? ` · ${w("imSheet")} ${f.sheet}` : "")));
    box.append(press(w("imAnother"), again, phase !== "review" && phase !== "done"));
  }
  return box;
}

function mapping(x: X): HTMLElement {
  const { st, v, w } = x, live = v.phase === "review", ul = el("ul", "iml");
  for (const c of x.b.columns) {
    const got = v.map[c.key] ?? "", s = el("select");
    s.setAttribute("aria-label", `${c.label}: ${w("imCols")}`);
    s.disabled = !live;
    for (const t of ["", ...(v.sheet?.headers ?? [])]) s.append(Object.assign(el("option"), { value: t, textContent: t || w("imNone"), selected: t === got }));
    s.onchange = () => ((st.map = { ...v.map, [c.key]: s.value }), (st.open = true), act(x, x.b.read ?? "", "checking"));
    const k = h("span", "imk", `${c.label} `, ...(c.required ? [h("i", "", w("imReq"))] : []));
    const cls = `imr${!got && c.required ? " no" : ""}${st.map && st.map[c.key] !== v.sheet?.map[c.key] ? " chg" : ""}`;
    ul.append(h("li", cls, k, s, h("span", "ims", got ? w("imEg", { s: sample(c, v) }) : c.required ? w("imPickFor") : "")));
  }
  const skip = v.extra.length ? w("imSkip", { list: v.extra.join(", ") }) : "";
  const sum = h("p", "imc", w("imSum", { n: v.got, m: x.b.columns.length }) + (skip ? ` · ${skip}` : ""), press(w("imChange"), () => ((st.open = true), x.draw()), !live));
  return h("div", `imm${v.missing ? "" : " ok"}${st.open ? " open" : ""}`, h("h4", "sh as-section-label", w("imCols")), sum, ul, ...(skip ? [h("span", "m", skip)] : []));
}

function line(x: X, r: ImportRow, role: (c: ImportColumn) => string): HTMLElement[] {
  const cols = x.b.columns, n = h("td", "imn0 p-meta", String(r.n));
  n.dataset["l"] = x.w("imRow");
  const tr = h("tr", r.bad && Object.keys(r.bad).length ? "imo" : "", n);
  for (const c of cols) {
    const s = x.v.map[c.key] ? (r.cells[c.key] ?? "") : "", bad = !!r.bad?.[c.key];
    const td = h("td", [role(c), num(c) ? "end" : "", bad ? "bad" : "", s ? "" : "nil"].filter(Boolean).join(" "), s || (bad ? "(empty)" : "—"));
    td.dataset["l"] = c.label;
    tr.append(td);
  }
  const why = Object.entries(r.bad ?? {}).map(([k, m]) => `${cols.find((c) => c.key === k)?.label ?? k}: ${m}`).join(" · ");
  return why ? [tr, h("tr", "imx", Object.assign(h("td", "", why), { colSpan: cols.length + 1 }))] : [tr];
}

function rows(x: X): HTMLElement {
  const { st, v, w } = x, cols = x.b.columns, live = v.phase === "review", t = h("div", "imt", h("h4", "sh as-section-label", w("imPreview")));
  if (v.bad.length) {
    const all = press(w("imAll", { n: v.sheet?.file.rows ?? 0 }), () => ((st.show = "all"), x.draw()), !live);
    const bad = press(w("imErrs", { n: v.bad.length }), () => ((st.show = "errors"), x.draw()), !live, "bad");
    all.setAttribute("aria-pressed", String(st.show !== "errors"));
    bad.setAttribute("aria-pressed", String(st.show === "errors"));
    t.append(all, bad);
  }
  const title = cols.find((c, i) => i > 0 && (c.type ?? "text") === "text") ?? cols[0];
  const role = (c: ImportColumn) => (c === title ? "p-title" : c.type === "money" ? "p-value" : c.type === "choice" ? "p-tag" : "p-meta");
  const body = h("tbody", "", ...v.shown.flatMap((r) => line(x, r, role)));
  if (v.hidden > 0) body.append(h("tr", "imq", Object.assign(h("td", "", w("imMore", { n: v.hidden })), { colSpan: cols.length + 1 })));
  const head = h("tr", "", h("th", "imn0", "#"), ...cols.map((c) => h("th", num(c) ? "end" : "", c.label)));
  const table = h("table", "", h("caption", "", `${x.b.title}: ${w("imPreview")}`), h("thead", "", head), body);
  return h("div", "imp", t, h("div", "tbl", h("div", "tbw", table)));
}

function actions(x: X): HTMLElement {
  const { v, w, st } = x, n = v.good, into = x.b.into ?? x.b.title, go = x.b.action ?? "";
  if (v.phase === "ask") {
    const p = h("p", "", w("imAsk", { n, t: into }), h("span", "m", (v.bad.length ? `${w("imLeft", { n: v.bad.length })}. ` : "") + w("imSafe")));
    return h("div", "ima ask", p, press(w("imBack"), () => ((st.phase = "review"), x.draw())), press(w("imGo", { n }), () => act(x, go, "sending")));
  }
  if (v.phase === "checking") return h("div", "ima", h("span", "say-busy", w("imChecking")), busy(w("imWait")));
  const bar = el("div", "ima");
  if (v.missing) bar.append(h("span", "say-busy bad", w("imFix", { c: v.missing.label })));
  else if (v.bad.length) bar.append(h("span", "say-busy", w("imLeft", { n: v.bad.length })));
  bar.append(v.phase === "sending" ? busy(w("imSending")) : press(n ? w("imGo", { n }) : w("imNothing"), () => ((st.phase = "ask"), x.draw()), !!v.missing || !n));
  return bar;
}

function done(x: X): HTMLElement {
  const d = x.b.done, w = x.w, left = d?.left ?? 0;
  const again = press(w("imAgain"), () => (Object.assign(x.st, fresh({ ...x.b, done: null, sheet: null })), x.draw()));
  const dl = left && d?.file ? [link(w("imLeftDl"), d.file, w("imLeftDl"))] : [];
  return h("div", "imz", h("b", "ok", (d?.count ?? 0).toLocaleString("en-US")), h("span", "", w("imDone", { t: x.b.into ?? x.b.title })), ...(left ? [h("span", "m", w("imLeftOut", { n: left }))] : []), h("div", "bar", ...dl, again));
}

const keyOf = (b: Import, c: Ctx) => `${c.screen}\n${b.id ?? b.title}`;

/// Draws the import kind into `box`: the drop area, the upload and the server's read, its columns and rows, the confirm and the count the app took.
export function draw(box: HTMLElement, b: Import, c: Ctx): void {
  const key = keyOf(b, c), st = states.get(key) ?? fresh(b), lang = c.locale?.lang;
  states.set(key, st);
  const paint = () => {
    const x: X = { b, c, st, v: view(b, st, !!c.file), w: (k, v) => say(lang, k, v), draw: paint };
    const { phase } = x.v, wait = phase === "sending" || phase === "checking";
    box.classList.toggle("busy", wait);
    if (wait) box.setAttribute("aria-busy", "true");
    else box.removeAttribute("aria-busy");
    const head = h("div", "imh", h("h3", "sh as-section-label", b.title));
    if (b.template && phase !== "done" && phase !== "off") head.append(link(x.w("imTemplate"), b.template, `${x.w("imTemplate")}: ${b.title}`));
    const errs = b.error && phase !== "up" && phase !== "reading" ? [h("p", "fe", b.error)] : [];
    if (phase === "done") box.replaceChildren(head, ...(x.v.sheet ? [fileLine(x)] : []), done(x));
    else if (phase === "off" || phase === "idle") box.replaceChildren(head, ...errs, ...empty(x));
    else if (!x.v.sheet) box.replaceChildren(head, fileLine(x), needs(x));
    else box.replaceChildren(head, ...errs, fileLine(x), h("div", "imb", mapping(x), rows(x)), actions(x));
  };
  latest.set(key, { b, draw: paint });
  paint();
}
