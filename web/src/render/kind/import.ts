import type { Import, ImportColumn } from "../../gen/types.ts";
import { cell, fresh, type ImportState, type ImportView, leftOut, pick, say, template, values, view } from "../../core/kind/import.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";

type V = { b: Import; c: Ctx; st: ImportState; v: ImportView; w: (k: string, x?: Record<string, string | number>) => string; draw: () => void };

const states = new Map<string, ImportState>();
const draws = new Map<string, () => void>();
const num = (c: ImportColumn) => c.type === "money" || c.type === "number";

const press = (label: string, go: () => unknown, off = false, cls = "") => {
  const e = Object.assign(el("button", cls), { type: "button", disabled: off });
  e.append(h("span", "", label));
  e.onclick = () => void go();
  return e;
};

function needs(x: V): HTMLElement {
  const req = x.b.columns.filter((c) => c.required), opt = x.b.columns.filter((c) => !c.required);
  const p = h("p", "imn", `${x.w("imNeeds")} `);
  req.forEach((c, i) => p.append(...(i ? [", "] : []), h("b", "", c.label)));
  if (opt.length) p.append(` ${x.w("imMay")} ${opt.map((c) => (c.values?.length ? `${c.label} (${c.values.join(", ")})` : c.label)).join(", ")}`);
  return p;
}

function empty(x: V): HTMLElement[] {
  const off = x.v.step === "off", i = Object.assign(el("input"), { type: "file", hidden: true, accept: ".xlsx,.csv" });
  const open = async (f: File | null | undefined) => {
    if (!f) return;
    await pick(x.b, x.st, f.name, new Uint8Array(await f.arrayBuffer()), x.c.locale?.lang);
    x.draw();
  };
  i.onchange = () => open(i.files?.[0]);
  const d = h("div", "imd", h("span", "", x.w("imDrop")), h("span", "m", x.w("imOr")), press(x.w("file1"), () => i.click(), off), h("span", "m", off ? x.w("imOff") : x.w("imHint", { max: x.b.max ?? 5000 })), i);
  if (!off) {
    d.ondragover = (e) => (e.preventDefault(), d.classList.add("over"));
    d.ondragleave = () => d.classList.remove("over");
    d.ondrop = (e) => (e.preventDefault(), d.classList.remove("over"), void open(e.dataTransfer?.files[0]));
  }
  return [d, needs(x)];
}

function fileLine(x: V, f: NonNullable<ImportState["file"]>): HTMLElement {
  const { book } = f, live = x.v.step === "review";
  const m = h("span", "fum", h("span", "fun", f.name));
  if (book.sheets.length > 1) {
    const s = el("select");
    s.setAttribute("aria-label", x.w("imSheet"));
    book.sheets.forEach((t, i) => s.append(Object.assign(el("option"), { value: String(i), textContent: `${x.w("imSheet")}: ${t}`, selected: i === book.sheet })));
    s.onchange = async () => (await pick(x.b, x.st, f.name, f.bytes, x.c.locale?.lang, Number(s.value)), x.draw());
    m.append(s);
  }
  m.append(h("span", "fus", x.w("imRows", { n: book.rows.length }) + (book.enc ? ` · ${book.enc}` : book.sheets.length === 1 ? ` · ${x.w("imSheet")} ${book.sheets[0]}` : "")));
  const ext = h("span", "fux", f.name.split(".").pop() ?? "");
  ext.setAttribute("aria-hidden", "true");
  return h("div", "imf", ext, m, press(x.w("imAnother"), () => (Object.assign(x.st, fresh()), x.draw()), !live));
}

function mapping(x: V, f: NonNullable<ImportState["file"]>): HTMLElement {
  const live = x.v.step === "review", ul = el("ul", "iml");
  for (const c of x.b.columns) {
    const at = f.map[c.key], s = el("select");
    s.setAttribute("aria-label", `${c.label}: ${x.w("imCols")}`);
    s.disabled = !live;
    [x.w("imNone"), ...f.book.head].forEach((t, i) => s.append(Object.assign(el("option"), { value: String(i - 1), textContent: t, selected: i - 1 === at })));
    s.onchange = () => ((f.map[c.key] = Number(s.value)), x.draw());
    const eg = x.v.rows.slice(0, 2).map((r) => cell(c, r)).filter(Boolean).join(", ");
    const k = h("span", "imk", `${c.label} `, ...(c.required ? [h("i", "", x.w("imReq"))] : []));
    ul.append(h("li", at < 0 && c.required ? "imr no" : "imr", k, s, h("span", "ims", at >= 0 ? x.w("imEg", { s: eg }) : c.required ? x.w("imPickFor") : "")));
  }
  const skip = x.v.extra.length ? x.w("imSkip", { list: x.v.extra.join(", ") }) : "";
  const sum = h("p", "imc", x.w("imSum", { n: x.v.got, m: x.b.columns.length }) + (skip ? ` · ${skip}` : ""), press(x.w("imChange"), () => ((x.st.open = true), x.draw()), !live));
  return h("div", `imm${x.v.missing ? "" : " ok"}${x.st.open ? " open" : ""}`, h("h4", "sh", x.w("imCols")), sum, ul, ...(skip ? [h("span", "m", skip)] : []));
}

function rows(x: V): HTMLElement {
  const cols = x.b.columns, live = x.v.step === "review", t = h("div", "imt", h("h4", "sh", x.w("imPreview")));
  if (x.v.bad.length) {
    const all = press(x.w("imAll", { n: x.v.rows.length }), () => ((x.st.show = "all"), x.draw()), !live);
    const bad = press(x.w("imErrs", { n: x.v.bad.length }), () => ((x.st.show = "errors"), x.draw()), !live, "bad");
    all.setAttribute("aria-pressed", String(x.st.show === "all"));
    bad.setAttribute("aria-pressed", String(x.st.show === "errors"));
    t.append(all, bad);
  }
  const title = cols.find((c, i) => i > 0 && (c.type ?? "text") === "text") ?? cols[0];
  const role = (c: ImportColumn) => (c === title ? "title" : c.type === "money" ? "value" : c.type === "choice" ? "tag" : "meta");
  const body = el("tbody"), span = cols.length + 1;
  for (const r of x.v.shown) {
    const n = h("td", "imn0 p-meta", String(r.n));
    n.dataset.l = x.w("imRow");
    const tr = h("tr", Object.keys(r.bad).length ? "imo" : "", n);
    for (const c of cols) {
      const s = x.st.file && x.st.file.map[c.key] >= 0 ? cell(c, r) : "", bad = c.key in r.bad;
      const td = h("td", [`p-${role(c)}`, num(c) ? "end" : "", bad ? "bad" : "", s ? "" : "nil"].filter(Boolean).join(" "), s || "—");
      td.dataset.l = c.label;
      tr.append(td);
    }
    body.append(tr);
    const why = Object.entries(r.bad).map(([k, m]) => `${cols.find((c) => c.key === k)?.label ?? k}: ${m}`).join(" · ");
    if (why) body.append(h("tr", "imx", Object.assign(h("td", "", why), { colSpan: span })));
  }
  if (x.v.hidden > 0 && x.st.show === "all") body.append(h("tr", "imq", Object.assign(h("td", "", x.w("imMore", { n: x.v.hidden })), { colSpan: span })));
  const head = h("tr", "", h("th", "imn0", "#"), ...cols.map((c) => h("th", num(c) ? "end" : "", c.label)));
  const table = h("table", "", h("caption", "", `${x.b.title}: ${x.w("imPreview")}`), h("thead", "", head), body);
  return h("div", "imp", t, h("div", "tbl", h("div", "tbw", table)));
}

function actions(x: V): HTMLElement {
  const { v, w } = x, n = v.good.length, into = x.b.into ?? x.b.title;
  const go = () => {
    x.st.step = "sending";
    x.draw();
    void x.c.act({ action: x.b.action, block: x.b.id, values: values(x.st, v) }).then((ok) => {
      Object.assign(x.st, { step: "review", sent: ok, again: false });
      draws.get(keyOf(x.b, x.c))?.();
    });
  };
  if (v.step === "ask") {
    const p = h("p", "", w("imAsk", { n, t: into }), h("span", "m", (v.bad.length ? `${w("imLeft", { n: v.bad.length })}. ` : "") + w("imSafe")));
    return h("div", "ima ask", p, press(w("imBack"), () => ((x.st.step = "review"), x.draw())), press(w("imGo", { n }), go));
  }
  const bar = el("div", "ima");
  if (v.missing) bar.append(h("span", "say-busy bad", w("imFix", { c: v.missing.label })));
  else if (v.bad.length) bar.append(h("span", "say-busy", w("imLeft", { n: v.bad.length })));
  const b = v.step === "sending" ? press(w("imSending"), () => 0, true) : press(n ? w("imGo", { n }) : w("imNothing"), () => ((x.st.step = "ask"), x.draw()), !!v.missing || !n);
  if (v.step === "sending") b.setAttribute("aria-busy", "true");
  bar.append(b);
  return bar;
}

function done(x: V): HTMLElement {
  const left = x.v.bad.length, again = press(x.w("imAgain"), () => (Object.assign(x.st, fresh(), { again: true }), x.draw()));
  const dl = left ? [press(x.w("imLeftDl"), () => leftOut(x.b, x.v, x.c.locale?.lang))] : [];
  return h("div", "imz", h("b", "ok", (x.b.done ?? 0).toLocaleString("en-US")), h("span", "", x.w("imDone", { t: x.b.into ?? x.b.title })), ...(left ? [h("span", "m", x.w("imLeftOut", { n: left }))] : []), h("div", "bar", ...dl, again));
}

const keyOf = (b: Import, c: Ctx) => `${c.screen}\n${b.id ?? b.title}`;

/// The import kind: pick a file, map its columns, see its rows and their errors, confirm, and the count the app took.
export function import_(b: Import, c: Ctx): HTMLElement {
  const key = keyOf(b, c), st = states.get(key) ?? fresh(), box = el("section", "im");
  states.set(key, st);
  const draw = () => {
    const x: V = { b, c, st, v: view(b, st, c.locale?.lang), w: (k, v) => say(c.locale?.lang, k, v), draw };
    const step = x.v.step, f = st.file;
    box.classList.toggle("busy", step === "sending");
    const head = h("div", "imh", h("h3", "sh", b.title));
    if (b.template !== false && step !== "done") head.append(press(x.w("imTemplate"), () => template(b, c.locale?.lang), step === "off"));
    const errs = [b.error, st.error].filter((e): e is string => !!e).map((e) => h("p", "fe", e));
    if (step === "done") box.replaceChildren(head, ...(f ? [fileLine(x, f)] : []), done(x));
    else if (!f || step === "off" || step === "pick") box.replaceChildren(head, ...errs, ...empty(x));
    else box.replaceChildren(head, ...errs, fileLine(x, f), h("div", "imb", mapping(x, f), rows(x)), actions(x));
  };
  draws.set(key, draw);
  draw();
  return box;
}
