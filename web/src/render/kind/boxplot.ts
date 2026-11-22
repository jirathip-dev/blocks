import { axis, colour, decimals, places, says } from "../../core/kind/boxplot.ts";
import type { Boxplot, PlotBox } from "../../gen/types.ts";
import { sends } from "../act.ts";
import type { Ctx } from "../ctx.ts";
import { h } from "../dom.ts";

const num = (x: number) => String(Math.round(x * 100) / 100 + 0);

const mark = (cls: string, style: string) => {
  const e = h("i", cls);
  e.setAttribute("style", style);
  return e;
};

function readout(p: Boxplot, x: PlotBox | undefined): HTMLElement {
  if (!x) {
    const key = (cls: string, t: string) => h("span", "", mark(`bxk ${cls}`, ""), t);
    return h("div", "chl bxl", key("kr", "min to max"), key("kb", "Q1 to Q3"), key("km", "median"), key("ko", "outlier"));
  }
  const d = places(p), s = (v: number) => v.toFixed(d), u = p.unit ? ` ${p.unit}` : "", o = x.outliers ?? [];
  const items: [string, string][] = [["median", s(x.median) + u], ["Q1–Q3", `${s(x.q1)} – ${s(x.q3)}`], ["min–max", `${s(x.min)} – ${s(x.max)}`]];
  if (o.length) items.push(["outliers", o.map(s).join(", ")]);
  return h("div", "chl bxl", h("span", "chx", mark("chk", `--k:${colour(x.tone)}`), x.name), ...items.map(([k, v]) => h("span", "", k, h("b", "", v))));
}

function plot(p: Boxplot, at: number, [lo, hi, step]: [number, number, number], pick: (i: number) => void): HTMLElement[] {
  const n = p.boxes.length, top = (v: number) => num(((hi - v) / (hi - lo)) * 100), up = (v: number) => num(((v - lo) / (hi - lo)) * 100);
  const ticks: number[] = [];
  for (let i = 0; lo + i * step <= hi + step / 2; i++) ticks.push(lo + i * step);
  const td = decimals(step), mid = (i: number) => num(((i + 0.5) / n) * 100);
  const ya = h("div", "chy", ...ticks.map((v) => {
    const t = h("span", "", v.toFixed(td));
    t.setAttribute("style", `top:${top(v)}%`);
    return t;
  }));
  const pl = h("div", "chp", ...ticks.map((v, i) => mark(i === 0 ? "bxg base" : "bxg", `top:${top(v)}%`)));
  if (at >= 0) pl.append(mark("chb bxb", `left:${mid(at)}%`));
  p.boxes.forEach((x, i) => {
    const c = h("div", "bx", mark("w", `top:${top(x.max)}%;bottom:${up(x.min)}%`), mark("q", `top:${top(x.q3)}%;bottom:${up(x.q1)}%`), mark("m", `top:${top(x.median)}%`));
    if (x.max !== x.q3) c.append(mark("cap", `top:${top(x.max)}%`));
    if (x.min !== x.q1) c.append(mark("cap", `top:${top(x.min)}%`));
    c.append(...(x.outliers ?? []).map((o) => mark("o", `top:${top(o)}%`)));
    c.setAttribute("style", `left:${mid(i)}%;--k:${colour(x.tone)}`);
    c.setAttribute("aria-hidden", "true");
    pl.append(c);
  });
  const a = sends(p.tap);
  p.boxes.forEach((x, i) => {
    const b = h("button", "chc");
    b.type = "button";
    b.setAttribute("style", `left:${num((i / n) * 100)}%;width:${num(100 / n)}%`);
    b.setAttribute("aria-label", says(p, x));
    if (i === at) b.setAttribute("aria-pressed", "true");
    if (typeof a === "string" && a) b.dataset["action"] = a;
    b.onclick = () => pick(i);
    pl.append(b);
  });
  const wide = Math.max(1, Math.ceil(n / 12)), phone = Math.max(1, Math.ceil(n / 8));
  const xa = h("div", "chx2 bxx", ...p.boxes.map((x, i) => {
    const t = h("span", [i % wide === 0 ? "w" : "", i % phone === 0 ? "p" : "", i === at ? "sel" : ""].filter(Boolean).join(" "), x.name);
    t.setAttribute("style", `left:${mid(i)}%`);
    return t;
  }));
  return [ya, pl, xa];
}

function table(p: Boxplot): HTMLElement {
  const d = places(p), s = (v: number) => v.toFixed(d);
  const row = (t: "th" | "td", cells: string[]) => h("tr", "", ...cells.map((c) => h(t, "", c)));
  const rows = p.boxes.map((x) => row("td", [x.name, ...[x.min, x.q1, x.median, x.q3, x.max].map(s), (x.outliers ?? []).map(s).join(", ") || "—"]));
  return h("details", "", h("summary", "", "Table"), h("div", "tw", h("table", "", h("tbody", "", row("th", ["", "Min", "Q1", "Median", "Q3", "Max", "Outliers"]), ...rows))));
}

export function boxplot(b: Boxplot, ctx: Ctx): HTMLElement {
  const root = h("div", "card chart bxp");
  const n = b.boxes.length;
  const draw = (selected: string | null | undefined) => {
    const at = b.boxes.findIndex((x) => x.name === selected);
    const g = h("div", "chg", h("div", "bxa", b.axis + (b.unit ? ` (${b.unit})` : "")));
    g.setAttribute("style", `--n:${Math.max(n, 1)};--sw:${Math.max(1, Math.ceil(n / 12))};--sp:${Math.max(1, Math.ceil(n / 8))}`);
    const ax = axis(b);
    const pick = (i: number) => {
      const x = b.boxes[i]?.name ?? "";
      draw(x);
      const a = sends(b.tap);
      if (typeof a === "string" && a) void ctx.act({ action: a, block: b.id, values: { ...b.tap?.values, x } });
    };
    if (ax) g.append(...plot(b, at, ax, pick));
    else g.append(h("div", "chy"), h("div", "chp", h("div", "che", b.empty ?? "No data yet")), h("div", "chx2 bxx"));
    root.replaceChildren(h("div", "cht", b.title), readout(b, b.boxes[at]), g, table(b));
  };
  draw(b.selected);
  return root;
}
