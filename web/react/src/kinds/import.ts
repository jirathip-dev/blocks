import { type DragEvent, type ReactNode, useContext, useReducer, useRef } from "react";
import type { Import, ImportColumn } from "../../../src/core/index.ts";
import { cell, fresh, type ImportState, type ImportView, leftOut, pick, say, template, values, view } from "../../../src/core/kind/import.ts";
import { Cx } from "../act.ts";
import type { V } from "../draw.ts";
import { h } from "../h.ts";

type X = { b: Import; st: ImportState; v: ImportView; lang: string | undefined; w: (k: string, x?: Record<string, string | number>) => string; draw: () => void };
type File1 = NonNullable<ImportState["file"]>;

const num = (c: ImportColumn) => c.type === "money" || c.type === "number";
const press = (label: string, go: () => unknown, off = false, cls = "", more: Record<string, unknown> = {}) =>
  h("button", cls, { type: "button", disabled: off || undefined, onClick: () => void go(), ...more }, h("span", "", null, label));
const opened = async (x: X, f: File | null | undefined) => {
  if (f) await pick(x.b, x.st, f.name, new Uint8Array(await f.arrayBuffer()), x.lang);
  x.draw();
};

function empty(x: X, input: { current: HTMLInputElement | null }): ReactNode[] {
  const off = x.v.step === "off", { b, w } = x;
  const req = b.columns.filter((c) => c.required), opt = b.columns.filter((c) => !c.required);
  const drop = off ? {} : { onDragOver: (e: DragEvent) => e.preventDefault(), onDrop: (e: DragEvent) => (e.preventDefault(), void opened(x, e.dataTransfer.files[0])) };
  const file = h("input", "", { ref: input, type: "file", hidden: true, accept: ".xlsx,.csv", onChange: () => void opened(x, input.current?.files?.[0]) });
  const d = h("div", "imd", drop, h("span", "", null, w("imDrop")), h("span", "m", null, w("imOr")), press(w("file1"), () => input.current?.click(), off), h("span", "m", null, off ? w("imOff") : w("imHint", { max: b.max ?? 5000 })), file);
  const may = opt.map((c) => (c.values?.length ? `${c.label} (${c.values.join(", ")})` : c.label)).join(", ");
  return [d, h("p", "imn", null, `${w("imNeeds")} `, ...req.flatMap((c, i) => [i ? ", " : "", h("b", "", { key: c.key }, c.label)]), opt.length ? ` ${w("imMay")} ${may}` : "")];
}

function fileLine(x: X, f: File1): ReactNode {
  const { book } = f, w = x.w;
  const sheets = book.sheets.length > 1 ? h("select", "", { "aria-label": w("imSheet"), value: String(book.sheet), onChange: (e: { target: { value: string } }) => void pick(x.b, x.st, f.name, f.bytes, x.lang, Number(e.target.value)).then(x.draw) }, ...book.sheets.map((t, i) => h("option", "", { key: t, value: String(i) }, `${w("imSheet")}: ${t}`))) : null;
  const more = book.enc ? ` · ${book.enc}` : book.sheets.length === 1 ? ` · ${w("imSheet")} ${book.sheets[0]}` : "";
  const m = h("span", "fum", null, h("span", "fun", null, f.name), sheets, h("span", "fus", null, w("imRows", { n: book.rows.length }) + more));
  return h("div", "imf", null, h("span", "fux", { "aria-hidden": "true" }, f.name.split(".").pop() ?? ""), m, press(w("imAnother"), () => (Object.assign(x.st, fresh()), x.draw()), x.v.step !== "review"));
}

function mapping(x: X, f: File1): ReactNode {
  const { b, v, w } = x, live = v.step === "review";
  const li = (c: ImportColumn) => {
    const at = f.map[c.key], eg = v.rows.slice(0, 2).map((r) => cell(c, r)).filter(Boolean).join(", ");
    const opts = [w("imNone"), ...f.book.head].map((t, i) => h("option", "", { key: i, value: String(i - 1) }, t));
    const s = h("select", "", { "aria-label": `${c.label}: ${w("imCols")}`, disabled: !live || undefined, value: String(at), onChange: (e: { target: { value: string } }) => ((f.map[c.key] = Number(e.target.value)), x.draw()) }, ...opts);
    const k = h("span", "imk", null, `${c.label} `, c.required ? h("i", "", null, w("imReq")) : null);
    return h("li", at < 0 && c.required ? "imr no" : "imr", { key: c.key }, k, s, h("span", "ims", null, at >= 0 ? w("imEg", { s: eg }) : c.required ? w("imPickFor") : ""));
  };
  const skip = v.extra.length ? w("imSkip", { list: v.extra.join(", ") }) : "";
  const sum = h("p", "imc", null, w("imSum", { n: v.got, m: b.columns.length }) + (skip ? ` · ${skip}` : ""), press(w("imChange"), () => ((x.st.open = true), x.draw()), !live));
  return h("div", `imm${v.missing ? "" : " ok"}${x.st.open ? " open" : ""}`, null, h("h4", "sh", null, w("imCols")), sum, h("ul", "iml", null, ...b.columns.map(li)), skip ? h("span", "m", null, skip) : null);
}

function rows(x: X, f: File1): ReactNode {
  const { b, v, w, st } = x, cols = b.columns, live = v.step === "review", span = cols.length + 1;
  const tabs = v.bad.length
    ? [press(w("imAll", { n: v.rows.length }), () => ((st.show = "all"), x.draw()), !live, "", { "aria-pressed": String(st.show === "all") }), press(w("imErrs", { n: v.bad.length }), () => ((st.show = "errors"), x.draw()), !live, "bad", { "aria-pressed": String(st.show === "errors") })]
    : [];
  const title = cols.find((c, i) => i > 0 && (c.type ?? "text") === "text") ?? cols[0];
  const role = (c: ImportColumn) => (c === title ? "title" : c.type === "money" ? "value" : c.type === "choice" ? "tag" : "meta");
  const body = v.shown.flatMap((r) => {
    const tds = cols.map((c) => {
      const s = f.map[c.key] >= 0 ? cell(c, r) : "";
      return h("td", [`p-${role(c)}`, num(c) ? "end" : "", c.key in r.bad ? "bad" : "", s ? "" : "nil"].filter(Boolean).join(" "), { key: c.key, "data-l": c.label }, s || "—");
    });
    const why = Object.entries(r.bad).map(([k, m]) => `${cols.find((c) => c.key === k)?.label ?? k}: ${m}`).join(" · ");
    const tr = h("tr", why ? "imo" : "", { key: r.n }, h("td", "imn0 p-meta", { "data-l": w("imRow") }, String(r.n)), ...tds);
    return why ? [tr, h("tr", "imx", { key: `${r.n}x` }, h("td", "", { colSpan: span }, why))] : [tr];
  });
  const more = v.hidden > 0 && st.show === "all" ? h("tr", "imq", null, h("td", "", { colSpan: span }, w("imMore", { n: v.hidden }))) : null;
  const head = h("tr", "", null, h("th", "imn0", null, "#"), ...cols.map((c) => h("th", num(c) ? "end" : "", { key: c.key }, c.label)));
  const table = h("table", "", null, h("caption", "", null, `${b.title}: ${w("imPreview")}`), h("thead", "", null, head), h("tbody", "", null, ...body, more));
  return h("div", "imp", null, h("div", "imt", null, h("h4", "sh", null, w("imPreview")), ...tabs), h("div", "tbl", null, h("div", "tbw", null, table)));
}

function actions(x: X, act: (values: Record<string, unknown>) => Promise<boolean>): ReactNode {
  const { v, w, st } = x, n = v.good.length, into = x.b.into ?? x.b.title;
  const go = () => {
    st.step = "sending";
    x.draw();
    void act(values(st, v)).then((ok) => (Object.assign(st, { step: "review", sent: ok, again: false }), x.draw()));
  };
  if (v.step === "ask") {
    const p = h("p", "", null, w("imAsk", { n, t: into }), h("span", "m", null, (v.bad.length ? `${w("imLeft", { n: v.bad.length })}. ` : "") + w("imSafe")));
    return h("div", "ima ask", null, p, press(w("imBack"), () => ((st.step = "review"), x.draw())), press(w("imGo", { n }), go));
  }
  const note = v.missing ? h("span", "say-busy bad", null, w("imFix", { c: v.missing.label })) : v.bad.length ? h("span", "say-busy", null, w("imLeft", { n: v.bad.length })) : null;
  const b = v.step === "sending" ? press(w("imSending"), () => 0, true, "", { "aria-busy": "true" }) : press(n ? w("imGo", { n }) : w("imNothing"), () => ((st.step = "ask"), x.draw()), !!v.missing || !n);
  return h("div", "ima", null, note, b);
}

function done(x: X): ReactNode {
  const left = x.v.bad.length, again = press(x.w("imAgain"), () => (Object.assign(x.st, fresh(), { again: true }), x.draw()));
  const dl = left ? press(x.w("imLeftDl"), () => leftOut(x.b, x.v, x.lang)) : null;
  return h("div", "imz", null, h("b", "ok", null, (x.b.done ?? 0).toLocaleString("en-US")), h("span", "", null, x.w("imDone", { t: x.b.into ?? x.b.title })), left ? h("span", "m", null, x.w("imLeftOut", { n: left })) : null, h("div", "bar", null, dl, again));
}

/// The import kind, as the HTML renderer draws it.
export function import_({ b, hooks }: V<Import>) {
  const cx = useContext(Cx), st = useRef(fresh()).current, input = useRef<HTMLInputElement | null>(null);
  const [, draw] = useReducer((n: number) => n + 1, 0), lang = cx.locale.lang ?? undefined;
  const x: X = { b, st, v: view(b, st, lang), lang, w: (k, v) => say(lang, k, v), draw };
  const { step } = x.v, f = st.file;
  const head = h("div", "imh", null, h("h3", "sh", null, b.title), b.template !== false && step !== "done" ? press(x.w("imTemplate"), () => template(b, lang), step === "off") : null);
  const errs = [b.error, st.error].filter((e): e is string => !!e).map((e) => h("p", "fe", { key: e }, e));
  const act = (values: Record<string, unknown>) => cx.act({ action: b.action ?? "", block: b.id, values });
  const kids = step === "done" ? [f ? fileLine(x, f) : null, done(x)] : !f || step === "off" || step === "pick" ? [...errs, ...empty(x, input)] : [...errs, fileLine(x, f), h("div", "imb", null, mapping(x, f), rows(x, f)), actions(x, act)];
  return h("section", `im${step === "sending" ? " busy" : ""}`, hooks, head, ...kids);
}
