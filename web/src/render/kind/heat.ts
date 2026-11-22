import type { Heat, HeatCell } from "../../gen/types.ts";
import { sends } from "../act.ts";
import type { Ctx } from "../ctx.ts";
import { el, h } from "../dom.ts";

const num = (x: number) => String(Math.round(x * 100) / 100 + 0);
const th = (b: Heat) => b.lang === "th";
const noData = (b: Heat) => (th(b) ? "ไม่มีข้อมูล" : "no data");
const peakWord = (b: Heat) => (th(b) ? "สูงสุด" : "Peak");
const NONE: HeatCell = {};
const TONES = ["ok", "warn", "bad", "accent", "mute"];

function unit(b: Heat): string {
  const u = b.scale?.unit ?? "";
  return u === "%" || !u ? u : ` ${u}`;
}

function nice(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw));
  return Math.ceil(raw / p) * p;
}

function values(b: Heat): number[] {
  return b.grid.flatMap((r) => r.cells.flatMap((c) => (c.value == null ? [] : [c.value])));
}

function range(b: Heat): [number, number] {
  const vs = values(b);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const min = b.scale?.min ?? (lo < 0 ? lo : 0);
  const raw = (hi - min) / 5;
  return [min, b.scale?.max ?? (vs.length && raw > 0 ? min + 5 * nice(raw) : min + 1)];
}

function step(v: number, [min, max]: [number, number]): number {
  if (max <= min) return 3;
  const at = ((v - min) / (max - min)) * 5;
  return [1, 2, 3, 4].reduce((s, k) => (at >= k ? k + 1 : s), 1);
}

function said(b: Heat, row: string, col: string, c: HeatCell): string {
  const v = c.value == null ? noData(b) : num(c.value) + unit(b);
  return `${row}, ${col}: ${v}${c.label ? `, ${c.label}` : ""}`;
}

function peak(b: Heat): [number, number] | null {
  let out: [number, number, number] | null = null;
  b.grid.forEach((r, ri) => r.cells.forEach((c, ci) => {
    if (c.value != null && (!out || c.value > out[2])) out = [ri, ci, c.value];
  }));
  return out ? [out[0], out[1]] : null;
}

function picked(b: Heat): [number, number] | null {
  const ri = b.grid.findIndex((r) => r.name === b.selected?.row), ci = b.columns.indexOf(b.selected?.column ?? "");
  return ri < 0 || ci < 0 ? null : [ri, ci];
}

function readout(o: HTMLElement, b: Heat, at: [number, number] | null, how: string) {
  o.replaceChildren();
  const row = at && b.grid[at[0]], col = at && b.columns[at[1]];
  if (!at || !row || col === undefined) return;
  const c = row.cells[at[1]] ?? NONE;
  if (how) o.append(h("span", "", how));
  o.append(h("span", "at", `${row.name} · ${col}`));
  const n = c.value == null ? null : num(c.value), shown = n === null ? null : n + unit(b);
  o.append(h("b", "", shown ?? "—"));
  if (c.label && c.label !== n && c.label !== shown) o.append(h("span", "", c.label));
}

function legend(b: Heat): HTMLElement {
  const [min, max] = range(b), vs = values(b), u = b.scale?.unit;
  const lg = h("div", "hml");
  lg.setAttribute("aria-label", `Scale ${num(min)} to ${num(max)}${u ? ` ${u}` : ""}`);
  if (u) lg.append(h("span", "u", u));
  const ramp = h("div", "ramp", ...[1, 2, 3, 4, 5].map((s) => el("i", `s${s}`)));
  const under = b.scale?.min != null && vs.some((v) => v < min), over = b.scale?.max != null && vs.some((v) => v > max);
  const rx = el("div", "rx");
  for (let i = 0; i <= 5; i++) {
    if (b.edges === "ends" && i > 0 && i < 5) continue;
    const low = i === 0 && under ? "≤" : "";
    const mark = i === 5 && over ? "≥" : low;
    rx.append(h("span", "", mark + num(min + ((max - min) * i) / 5)));
  }
  ramp.append(rx);
  lg.append(ramp);
  if (b.grid.some((r) => r.cells.length < b.columns.length || r.cells.some((c) => c.value == null)))
    lg.append(h("span", "nd", el("i"), th(b) ? "ไม่มีข้อมูล" : "No data"));
  return lg;
}

export function heat(b: Heat, ctx: Ctx): HTMLElement {
  const root = h("div", `card heat${b.tone && TONES.includes(b.tone) ? ` hk-${b.tone}` : ""}`, h("div", "hmt", b.title));
  const o = h("div", "hmo");
  o.setAttribute("aria-live", "polite");
  root.append(o);
  let sel = picked(b);
  const rest = () => readout(o, b, sel ?? peak(b), sel ? "" : peakWord(b));
  rest();
  if (!b.grid.some((r) => r.cells.some((c) => c.value != null || c.label != null))) {
    root.append(h("div", "hme", b.empty ?? "No data yet"));
    return root;
  }
  const r = range(b), a = sends(b.tap), action = typeof a === "string" && a ? a : null;
  const head = h("tr", "", el("td"), ...b.columns.map((c) => Object.assign(h("th", "", c), { scope: "col" })));
  const buttons: HTMLButtonElement[][] = [], where = new Map<HTMLButtonElement, [number, number]>();
  const body = b.grid.map((row, ri) => {
    buttons[ri] = [];
    const tr = h("tr", "", Object.assign(h("th", "", row.name), { scope: "row" }));
    b.columns.forEach((col, ci) => {
      const c = row.cells[ci] ?? NONE;
      const td = el("td", c.value == null ? "e" : `s${step(c.value, r)}`);
      if (sel?.[0] === ri && sel[1] === ci) td.classList.add("sel");
      const lb = h("span", "lb", c.label ?? (c.value == null ? "–" : ""));
      lb.setAttribute("aria-hidden", "true");
      if (action === null) {
        td.append(h("span", "v", lb, h("span", "b-sr", said(b, row.name, col, c))));
      } else {
        const bt = Object.assign(h("button", "", lb), { type: "button" });
        bt.setAttribute("aria-label", said(b, row.name, col, c));
        bt.dataset["action"] = action;
        bt.tabIndex = (sel ? sel[0] === ri && sel[1] === ci : ri === 0 && ci === 0) ? 0 : -1;
        if (sel?.[0] === ri && sel[1] === ci) bt.setAttribute("aria-pressed", "true");
        bt.onmouseenter = () => readout(o, b, [ri, ci], "");
        bt.onmouseleave = rest;
        bt.onfocus = () => readout(o, b, [ri, ci], "");
        bt.onblur = rest;
        bt.onclick = () => {
          root.querySelector("td.sel")?.classList.remove("sel");
          root.querySelector("[aria-pressed]")?.removeAttribute("aria-pressed");
          td.classList.add("sel");
          bt.setAttribute("aria-pressed", "true");
          sel = [ri, ci];
          rest();
          void ctx.act({ action, block: b.id, values: { ...b.tap?.values, row: row.name, column: col } });
        };
        buttons[ri]?.push(bt);
        where.set(bt, [ri, ci]);
        td.append(bt);
      }
      tr.append(td);
    });
    return tr;
  });
  root.addEventListener("keydown", (e) => {
    const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key] ?? [];
    const at = e.target instanceof HTMLButtonElement ? where.get(e.target) : undefined;
    const next = at && dr !== undefined && dc !== undefined ? buttons[at[0] + dr]?.[at[1] + dc] : undefined;
    if (!next) return;
    buttons.flat().forEach((x) => (x.tabIndex = x === next ? 0 : -1));
    next.focus();
    e.preventDefault();
  });
  const table = h("table", "", h("thead", "", head), h("tbody", "", ...body));
  root.append(h("div", "hmw", table), legend(b));
  return root;
}
