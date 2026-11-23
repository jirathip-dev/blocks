import { drawn, type PlotDrawn } from "../../core/kind/plot.ts";
import type { Block, Plot, PlotAxis } from "../../gen/types.ts";
import { esc, nodes } from "../dom.ts";
import { colour } from "./chart.ts";

type Frame = { xf: (v: number) => number; yf: (v: number) => number };
type Mark = { cls: string; at: [string, string][]; text?: string };

const num = (x: number) => String(Math.floor(x * 100 + 0.5) / 100 + 0);
const px = (f: number) => String(Math.floor(f * 10000 + 0.5) + 0);
const shapes = new WeakMap<Element, string>();
const axisLabel = (a: PlotAxis | null | undefined) => [a?.label ?? "", a?.unit ? `(${a.unit})` : ""].filter(Boolean).join(" ");
const tag = (t: string, cls: string, text: string, attrs = "") => `<${t}${cls ? ` class="${cls}"` : ""}${attrs}>${esc(text)}</${t}>`;
const empty = (p: Plot) => p.series.every((s) => !s.x.length);
const frame = (d: PlotDrawn): Frame => ({ xf: (v) => (v - d.x[0]) / (d.x[1] - d.x[0]), yf: (v) => 1 - (v - d.y[0]) / (d.y[1] - d.y[0]) });
const isPlot = (b: Block): b is { type: "plot" } & Plot => b.type === "plot";

function shape(p: Plot, d: PlotDrawn): string {
  return JSON.stringify([p.series.map((s) => [s.name, s.tone]), d.last.map(Boolean), d.band !== null, p.peak != null, empty(p), p.empty, axisLabel(p.x), axisLabel(p.y)]);
}

const html = (t: string, ms: Mark[]) =>
  ms.map((m) => `<${t}${m.cls ? ` class="${m.cls}"` : ""}${m.at.map(([k, v]) => ` ${k}="${v}"`).join("")}${m.text === undefined ? "/>" : `>${esc(m.text)}</${t}>`}`).join("");

function edgeOf(at: number): string {
  if (at < 0.001) return "lo";
  if (at > 0.999) return "hi";
  return at < 0.04 || at > 0.96 ? "near" : "";
}

const yTicks = (d: PlotDrawn, f: Frame): Mark[] => d.yTicks.map((t) => ({ cls: "", at: [["style", `top:${num(f.yf(t.at) * 100)}%`]], text: t.text }));

const xTicks = (d: PlotDrawn, f: Frame): Mark[] =>
  d.xTicks.map((t) => {
    const at = f.xf(t.at);
    const edge = edgeOf(at);
    return { cls: [edge, t.odd ? "odd" : ""].filter(Boolean).join(" "), at: [["style", `left:${num(at * 100)}%`]], text: t.text };
  });

function grid(d: PlotDrawn, f: Frame): Mark[] {
  const across = (y: string): [string, string][] => [["x1", "0"], ["x2", "10000"], ["y1", y], ["y2", y]];
  const ys = d.yTicks.map((t) => ({ cls: Math.abs(t.at - d.y[0]) < 1e-9 ? "base" : "grid", at: across(px(f.yf(t.at))) }));
  const xs = d.xTicks
    .map((t) => f.xf(t.at))
    .filter((at) => at > 0.001 && at < 0.999)
    .map((at): Mark => ({ cls: "grid", at: [["x1", px(at)], ["x2", px(at)], ["y1", "0"], ["y2", "10000"]] }));
  return [...ys, ...xs];
}

function marks(p: Plot, f: Frame): Mark[] {
  const across = (y: string): [string, string][] => [["x1", "0"], ["x2", "10000"], ["y1", y], ["y2", y]];
  const out: Mark[] = [];
  if (p.target) {
    const [top, bottom] = [f.yf(p.target.max), f.yf(p.target.min)];
    out.push({ cls: "plb", at: [["x", "0"], ["width", "10000"], ["y", px(top)], ["height", px(Math.max(0, bottom - top))]] });
    out.push({ cls: "plbe", at: across(px(top)) }, { cls: "plbe", at: across(px(bottom)) });
  }
  if (p.peak) out.push({ cls: "peak", at: across(px(f.yf(p.peak.y))) });
  return out;
}

function path(p: Plot, d: PlotDrawn, f: Frame, i: number): string {
  const [s, line] = [p.series[i], d.lines[i] ?? []];
  let out = "";
  for (const j of line) out += `${out ? "L" : "M"}${px(f.xf(s?.x[j] ?? 0))} ${px(f.yf(s?.y[j] ?? 0))}`;
  return out;
}

const dots = (p: Plot, f: Frame): Mark[] =>
  p.series.flatMap((s, i) => {
    const [x, y] = [s.x[s.x.length - 1], s.y[s.y.length - 1]];
    if (x === undefined || y === undefined || f.xf(x) < 0 || f.xf(x) > 1.0001) return [];
    return [{ cls: "pld", at: [["style", `left:${num(f.xf(x) * 100)}%;top:${num(f.yf(y) * 100)}%;${colour(s.tone, i)}`]], text: "" }];
  });

function inner(p: Plot, d: PlotDrawn): string {
  const f = frame(d);
  let out = tag("div", "plt", p.title) + `<div class="pll">`;
  p.series.forEach((s, i) => {
    out += `<span><i class="plk" style="${colour(s.tone, i)}"></i>${esc(s.name)}${d.last[i] ? tag("b", "", d.last[i] ?? "") : ""}</span>`;
  });
  if (d.band !== null) out += `<span><i class="plk band"></i>Target${tag("b", "", d.band)}</span>`;
  if (p.peak) out += `<span><i class="plk peak"></i>${tag("b", "", p.peak.label)}</span>`;
  out += `</div><div class="plg"><div class="plu">${tag("span", "", axisLabel(p.y))}</div><div class="ply">${html("span", yTicks(d, f))}</div><div class="plp">`;
  const m = marks(p, f).map((x) => html(x.cls === "plb" ? "rect" : "line", [x])).join("");
  out += `<svg viewBox="0 0 10000 10000" preserveAspectRatio="none" aria-hidden="true"><g class="plgr">${html("line", grid(d, f))}</g>${m}`;
  p.series.forEach((s, i) => (out += `<path class="s" d="${path(p, d, f, i)}" style="${colour(s.tone, i)}"/>`));
  out += `</svg>${html("i", dots(p, f))}`;
  if (empty(p)) out += `<div class="ple">${tag("span", "", p.empty ?? "No data yet")}</div>`;
  out += `</div><div class="plx">${html("span", xTicks(d, f))}</div>`;
  const xl = axisLabel(p.x);
  if (xl) out += `<div class="plu x">${tag("span", "", xl)}</div>`;
  return out + "</div>";
}

export function plot(b: Plot): HTMLElement {
  const root = document.createElement("div");
  root.className = "card plot";
  const d = drawn(b);
  root.replaceChildren(...nodes(inner(b, d)));
  shapes.set(root, shape(b, d));
  return root;
}

function put(e: Element, m: Mark): void {
  if ((e.getAttribute("class") ?? "") !== m.cls) e.setAttribute("class", m.cls);
  for (const [k, v] of m.at) if (e.getAttribute(k) !== v) e.setAttribute(k, v);
  if (m.text !== undefined && e.textContent !== m.text) e.textContent = m.text;
}

function fit(es: Element[], ms: Mark[], make: () => Element, where: (n: Element[]) => void): void {
  if (es.length !== ms.length) {
    es.forEach((e) => e.remove());
    return where(
      ms.map((m) => {
        const e = make();
        put(e, m);
        return e;
      }),
    );
  }
  es.forEach((e, i) => {
    const m = ms[i];
    if (m) put(e, m);
  });
}

const kids = (e: Element | null) => Array.from(e?.children ?? []);

/// Draws plot `block` into `root`, the element `plot` drew, keeping its elements; false when its series, target, peak or emptiness changed and it must be drawn again.
export function sync(root: HTMLElement, block: Block): boolean {
  if (!isPlot(block)) return false;
  const b: Plot = block;
  const d = drawn(b);
  if (shapes.get(root) !== shape(b, d)) return false;
  const f = frame(d);
  const q = (sel: string) => root.querySelector(sel);
  const legend = root.querySelectorAll(".pll>span>b");
  const texts = [...d.last.filter(Boolean), ...(d.band !== null ? [d.band] : []), ...(b.peak ? [b.peak.label] : [])];
  texts.forEach((t, i) => {
    if (legend[i]?.textContent !== t) legend[i]?.replaceChildren(t);
  });
  if (q(".plt")?.textContent !== b.title) q(".plt")?.replaceChildren(b.title);
  const [ply, plx, plgr] = [q(".ply"), q(".plx"), q(".plgr")];
  const span = () => document.createElement("span");
  fit(kids(ply), yTicks(d, f), span, (n) => ply?.append(...n));
  fit(kids(plx), xTicks(d, f), span, (n) => plx?.append(...n));
  fit(kids(plgr), grid(d, f), () => document.createElementNS("http://www.w3.org/2000/svg", "line"), (n) => plgr?.append(...n));
  const m = marks(b, f);
  Array.from(root.querySelectorAll(".plb,.plbe,line.peak")).forEach((e, i) => {
    const x = m[i];
    if (x) put(e, x);
  });
  root.querySelectorAll("path.s").forEach((e, i) => e.setAttribute("d", path(b, d, f, i)));
  fit(Array.from(root.querySelectorAll(".pld")), dots(b, f), () => document.createElement("i"), (n) => q(".plp svg")?.after(...n));
  return true;
}
