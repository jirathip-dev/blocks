import type { Field, LineItem, Lines, Lit } from "../gen/types.ts";
import { evaluate } from "../core/eval.ts";
import { btn, type Ctx, el, h } from "./index.ts";

type Draft = { base: string; rows: LineItem[] };
const drafts = new Map<string, Draft>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/// A decimal as a whole count of minor units, rounded half up, as the crate's site writer: never a float sum.
export function minor(v: unknown, scale: number): number | null {
  const s = typeof v === "number" || typeof v === "string" ? String(v) : "";
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s.replace(/[,\s]/g, ""));
  const [int, frac] = [m?.[2] ?? "", m?.[3] ?? ""];
  if (!m || (!int && !frac)) return null;
  const n = Number(int + frac.padEnd(scale, "0").slice(0, scale)) + (frac.charAt(scale) >= "5" ? 1 : 0);
  return m[1] === "-" ? -n : n;
}

/// Minor units as grouped money with `scale` decimals.
export function money(m: number, scale: number): string {
  const d = String(Math.abs(m)).padStart(scale + 1, "0");
  const int = d.slice(0, d.length - scale).replace(/\B(?=(\d{3})+$)/g, ",");
  return `${m < 0 ? "-" : ""}${int}${scale ? "." + d.slice(d.length - scale) : ""}`;
}

const hint = (x: Field) => ("placeholder" in x && typeof x.placeholder === "string" ? x.placeholder : undefined);

const picker = (x: Field) => {
  const s = el("select");
  const options = "options" in x && Array.isArray(x.options) ? x.options.map(String) : [];
  for (const o of ["", ...options]) s.append(Object.assign(el("option"), { value: o, textContent: o || (hint(x) ?? "choose…") }));
  return s;
};

const off = (e: HTMLElement, on: boolean) => {
  if (on) e.setAttribute("disabled", "");
};

const lit = (v: unknown): Lit => {
  const t = typeof v === "string" ? v.replace(/[,\s]/g, "") : "";
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null;
};

type K = { b: Lines; c: Ctx; d: Draft; key: string; scale: number; sums: Set<string>; root: HTMLElement; foot: HTMLElement };

const label = (x: Field) => x.label ?? x.name;
const num = (k: K, x: Field) => k.sums.has(x.name) || ("keyboard" in x && x.keyboard === "number");
const ro = (k: K, x: Field) => x.enabled === false || k.b.calc?.[x.name] != null;
const fixed = (k: K) => k.b.add == null;
const errors = (k: K) => (k.b.errors ?? []).filter((e) => e.row == null || k.d.rows.some((r) => r.id === e.row));

function cell(k: K, r: LineItem, x: Field): unknown {
  const calc = k.b.calc?.[x.name];
  if (calc == null) return r.values[x.name];
  const state: Record<string, Lit> = {};
  for (const [n, v] of Object.entries(r.values)) state[n] = lit(v);
  return evaluate(calc, state);
}

function shown(k: K, r: LineItem, x: Field): string {
  const v = cell(k, r, x);
  const m = minor(v, k.scale);
  return k.sums.has(x.name) && m !== null ? money(m, k.scale) : v == null || v === "" ? "—" : String(v);
}

const rows = (k: K) => k.d.rows.map((r) => ({ id: r.id, values: Object.fromEntries(k.b.columns.map((x) => [x.name, cell(k, r, x) ?? ""])) }));
const total = (k: K, n: string) => k.d.rows.reduce((t, r) => t + (minor(cell(k, r, k.b.columns.find((x) => x.name === n) ?? { type: "text", name: n }), k.scale) ?? 0), 0);

function check(k: K) {
  const a = k.b.action;
  if (!a) return;
  clearTimeout(timers.get(k.key));
  timers.set(k.key, setTimeout(() => void k.c.act({ action: a, block: k.b.id, values: { [k.b.name]: rows(k) } }), 400));
}

function totals(k: K): HTMLElement {
  const t = h("div", "lqt", el("span"));
  let named = false;
  for (const x of k.b.columns) {
    if (k.sums.has(x.name)) t.append(h("span", "num", h("span", "tk", label(x)), h("b", "", money(total(k, x.name), k.scale))));
    else {
      t.append(named ? el("span") : h("span", "tl", "total"));
      named = true;
    }
  }
  if (!fixed(k)) t.append(el("span"));
  return t;
}

function balance(k: K, [dr = "", cr = ""]: string[]): HTMLElement {
  const name = (n: string) => (k.b.columns.find((x) => x.name === n)?.label ?? n).toLowerCase();
  const gap = total(k, dr) - total(k, cr);
  const say = gap ? `out of balance · ${name(gap > 0 ? cr : dr)} short by ${money(Math.abs(gap), k.scale)}` : `balanced · ${name(dr)} = ${name(cr)}`;
  const p = h("p", gap ? "lqb off" : "lqb ok", say);
  p.setAttribute("role", "status");
  return p;
}

function paint(k: K) {
  const { b, d, foot } = k;
  k.root.querySelectorAll<HTMLElement>(".lqv").forEach((v) => {
    const r = d.rows.find((x) => x.id === v.dataset.row);
    const x = b.columns.find((y) => y.name === v.dataset.cell);
    if (r && x) v.textContent = shown(k, r, x);
  });
  foot.replaceChildren(...(k.sums.size ? [totals(k)] : []), ...(b.balance ? [balance(k, b.balance)] : []));
  const out = foot.querySelector(".lqb.off") !== null;
  const s = b.submit;
  if (!s) return;
  const errs = errors(k);
  const bad = new Set(errs.flatMap((e) => (e.row == null ? [] : [e.row]))).size;
  const note = [bad ? `fix ${bad === 1 ? "1 line" : `${bad} lines`}` : errs.length ? "fix the error" : "", out ? "balance the entry" : ""].filter(Boolean).join(" and ");
  const go = btn(s.label, "", undefined, s.action);
  off(go, Boolean(note) || s.off === true);
  go.onclick = () =>
    void k.c.act({ action: s.action, block: b.id, values: { ...s.values, [b.name]: rows(k) } }, go).then((ok) => {
      if (ok) drafts.delete(k.key);
    });
  foot.append(h("div", "ra", ...(note ? [h("p", "m lqw", `${note} to ${s.label}`)] : []), go));
}

function input(k: K, r: LineItem, i: number, x: Field, bad: boolean): HTMLElement {
  const f = x.type === "picker" ? picker(x) : Object.assign(el("input"), { type: "text", autocomplete: "off", placeholder: hint(x) ?? "", inputMode: num(k, x) ? "decimal" : "text" });
  const v = r.values[x.name];
  const m = k.sums.has(x.name) ? minor(v, k.scale) : null;
  f.name = `${k.b.name}.${i}.${x.name}`;
  f.value = m !== null ? money(m, k.scale) : typeof v === "string" || typeof v === "number" ? String(v) : "";
  f.setAttribute("aria-label", `${label(x)}, line ${i + 1}`);
  if (bad) f.setAttribute("aria-invalid", "true");
  f.oninput = f.onchange = () => {
    r.values[x.name] = f.value;
    paint(k);
    check(k);
  };
  return f;
}

function line(k: K, r: LineItem, i: number): HTMLElement[] {
  const mine = errors(k).filter((e) => e.row === r.id);
  const row = h("div", mine.length ? "lqr err" : "lqr", h("i", "lqn", String(i + 1)));
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", `line ${i + 1}`);
  for (const x of k.b.columns) {
    const bad = mine.some((e) => e.name === x.name);
    const box = h("label", `lqc${num(k, x) ? " num" : ""}${ro(k, x) ? " ro" : ""}${bad ? " err" : ""}`, h("span", "lqk", label(x)));
    const v = h("span", "lqv");
    Object.assign(v.dataset, { row: r.id, cell: x.name });
    box.append(ro(k, x) ? v : input(k, r, i, x, bad));
    row.append(box);
  }
  if (!fixed(k)) {
    const x = btn("×", "lqx");
    x.setAttribute("aria-label", `remove line ${i + 1}`);
    off(x, k.d.rows.length <= (k.b.min ?? 0));
    x.onclick = () => {
      k.d.rows.splice(i, 1);
      draw(k, (e) => e.querySelectorAll<HTMLElement>(".lqx")[i] ?? e.querySelector<HTMLElement>(".lqa button"));
      check(k);
    };
    row.append(x);
  }
  return [row, ...mine.map((e) => h("p", "lqe", e.message))];
}

function draw(k: K, focus?: (e: HTMLElement) => HTMLElement | null) {
  const { b, d, root } = k;
  const head = h("div", "lqh", el("span"), ...b.columns.map((x) => h("span", num(k, x) ? "num" : "", label(x))), ...(fixed(k) ? [] : [el("span")]));
  head.setAttribute("aria-hidden", "true");
  root.replaceChildren(head);
  if (!d.rows.length) root.append(h("p", "lqz", b.empty ?? "no lines yet"));
  d.rows.forEach((r, i) => root.append(...line(k, r, i)));
  root.append(...errors(k).filter((e) => e.row == null).map((e) => h("p", "lqe", e.message)));
  if (!fixed(k)) {
    const add = btn(b.add ?? "");
    off(add, b.max != null && d.rows.length >= b.max);
    add.onclick = () => {
      let n = d.rows.length + 1;
      while (d.rows.some((r) => r.id === `new-${n}`)) n++;
      d.rows.push({ id: `new-${n}`, values: {} });
      draw(k, (e) => [...e.querySelectorAll<HTMLElement>(".lqr")].pop()?.querySelector<HTMLElement>("input, select") ?? null);
      check(k);
    };
    root.append(h("div", "lqa", add));
  }
  root.append(k.foot);
  paint(k);
  focus?.(root)?.focus();
}

export function lines(b: Lines, c: Ctx): HTMLElement {
  const key = `${c.screen}:${String(b.id)}`;
  const base = JSON.stringify(b.items);
  const was = drafts.get(key);
  const d: Draft = was?.base === base ? was : { base, rows: b.items.map((r) => ({ id: r.id, values: { ...r.values } })) };
  drafts.set(key, d);
  const k: K = { b, c, d, key, scale: b.scale ?? 2, sums: new Set(b.sum ?? []), root: el("div", "lq"), foot: el("div", "lqf") };
  const width = (x: Field) => (k.sums.has(x.name) ? "14ch" : num(k, x) ? "10ch" : x.type === "picker" ? "minmax(0,1.4fr)" : "minmax(0,2fr)");
  const cols = ["3ch", ...b.columns.map(width), ...(fixed(k) ? [] : ["32px"])];
  k.root.setAttribute("style", `--lq-cols: ${cols.join(" ")};`);
  draw(k);
  return k.root;
}
