import { drawn, type PlotDrawn } from "../../core/kind/plot.ts";
import type { Axis, Block, Plot } from "../../gen/types.ts";
import { esc, nodes } from "../dom.ts";
import { colour } from "./chart.ts";

const num = (x: number) => String(Math.floor(x * 100 + 0.5) / 100 + 0);
const shapes = new WeakMap<Element, string>();

const axisLabel = (a: Axis | null | undefined) => [a?.label || "", a?.unit ? `(${a.unit})` : ""].filter(Boolean).join(" ");
const tag = (t: string, cls: string, text: string, attrs = "") => `<${t}${cls ? ` class="${cls}"` : ""}${attrs}>${esc(text)}</${t}>`;
const empty = (p: Plot) => p.series.every((s) => !s.x.length);

type Frame = { xf: (v: number) => number; yf: (v: number) => number };
const frame = (d: PlotDrawn): Frame => ({ xf: (v) => (v - d.x[0]) / (d.x[1] - d.x[0]), yf: (v) => 1 - (v - d.y[0]) / (d.y[1] - d.y[0]) });

function shape(p: Plot, d: PlotDrawn): string {
  return JSON.stringify([p.series.map((s) => [s.name, s.tone]), d.last.map(Boolean), d.band !== null, p.peak != null, empty(p), p.empty, axisLabel(p.x), axisLabel(p.y)]);
}

const yTicks = (d: PlotDrawn, f: Frame) => d.yTicks.map((t) => tag("span", "", t.text, ` style="top:${num(f.yf(t.at) * 100)}%"`)).join("");

function xTicks(d: PlotDrawn, f: Frame): string {
  return d.xTicks
    .map((t) => {
      const at = f.xf(t.at);
      const edge = at < 0.001 ? "lo" : at > 0.999 ? "hi" : at < 0.04 || at > 0.96 ? "near" : "";
      return tag("span", [edge, t.odd ? "odd" : ""].filter(Boolean).join(" "), t.text, ` style="left:${num(at * 100)}%"`);
    })
    .join("");
}

function grid(d: PlotDrawn, f: Frame): string {
  let out = "";
  for (const t of d.yTicks) {
    const y = num(f.yf(t.at) * 1000);
    out += `<line class="${Math.abs(t.at - d.y[0]) < 1e-9 ? "base" : "grid"}" x1="0" x2="1000" y1="${y}" y2="${y}"/>`;
  }
  for (const t of d.xTicks) {
    const at = f.xf(t.at);
    if (at > 0.001 && at < 0.999) out += `<line class="grid" x1="${num(at * 1000)}" x2="${num(at * 1000)}" y1="0" y2="1000"/>`;
  }
  return out;
}

function band(p: Plot, f: Frame): { y: string; h: string; lo: string; hi: string } | undefined {
  if (!p.target) return undefined;
  const [top, bottom] = [f.yf(p.target.max) * 1000, f.yf(p.target.min) * 1000];
  return { y: num(top), h: num(Math.max(0, bottom - top)), lo: num(bottom), hi: num(top) };
}

function path(p: Plot, d: PlotDrawn, f: Frame, i: number): string {
  const s = p.series[i];
  const pts = (d.lines[i] ?? []).map((j) => `${num(f.xf(s?.x[j] ?? 0) * 1000)} ${num(f.yf(s?.y[j] ?? 0) * 1000)}`);
  return pts.length ? `M${pts.join("L")}` : "";
}

function dots(p: Plot, f: Frame): string {
  return p.series
    .map((s, i) => {
      const [x, y] = [s.x[s.x.length - 1], s.y[s.y.length - 1]];
      if (x === undefined || y === undefined || f.xf(x) < 0 || f.xf(x) > 1.0001) return "";
      return `<i class="pld" style="left:${num(f.xf(x) * 100)}%;top:${num(f.yf(y) * 100)}%;${colour(s.tone, i)}"></i>`;
    })
    .join("");
}

function inner(p: Plot, d: PlotDrawn): string {
  const f = frame(d);
  let out = tag("div", "plt", p.title) + `<div class="pll">`;
  p.series.forEach((s, i) => {
    out += `<span><i class="plk" style="${colour(s.tone, i)}"></i>${esc(s.name)}${d.last[i] ? tag("b", "", d.last[i] ?? "") : ""}</span>`;
  });
  if (d.band !== null) out += `<span><i class="plk band"></i>Target${tag("b", "", d.band)}</span>`;
  if (p.peak) out += `<span><i class="plk peak"></i>${tag("b", "", p.peak.label)}</span>`;
  out += `</div><div class="plg"><div class="plu">${tag("span", "", axisLabel(p.y))}</div><div class="ply">${yTicks(d, f)}</div><div class="plp">`;
  out += `<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><g class="plgr">${grid(d, f)}</g>`;
  const b = band(p, f);
  if (b) out += `<rect class="plb" x="0" width="1000" y="${b.y}" height="${b.h}"/><line class="plbe" x1="0" x2="1000" y1="${b.hi}" y2="${b.hi}"/><line class="plbe" x1="0" x2="1000" y1="${b.lo}" y2="${b.lo}"/>`;
  if (p.peak) out += `<line class="peak" x1="0" x2="1000" y1="${num(f.yf(p.peak.y) * 1000)}" y2="${num(f.yf(p.peak.y) * 1000)}"/>`;
  p.series.forEach((s, i) => (out += `<path class="s" d="${path(p, d, f, i)}" style="${colour(s.tone, i)}"/>`));
  out += `</svg>${dots(p, f)}`;
  if (empty(p)) out += `<div class="ple">${tag("span", "", p.empty ?? "No data yet")}</div>`;
  out += `</div><div class="plx">${xTicks(d, f)}</div>`;
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

const isPlot = (b: Block): b is { type: "plot" } & Plot => b.type === "plot";
const svgKids = (html: string) => Array.from(nodes(`<svg>${html}</svg>`)[0]?.childNodes ?? []);
const set = (e: Element | null | undefined, attrs: Record<string, string>) => Object.entries(attrs).forEach(([k, v]) => e?.setAttribute(k, v));

/// Draws plot `b` into `root`, the element `plot` drew, keeping its elements; false when its series, target, peak or emptiness changed and it must be drawn again.
export function sync(root: HTMLElement, block: Block): boolean {
  if (!isPlot(block)) return false;
  const b: Plot = block;
  const d = drawn(b);
  if (shapes.get(root) !== shape(b, d)) return false;
  const f = frame(d);
  const q = <E extends Element>(sel: string) => root.querySelector<E>(sel);
  const legend = root.querySelectorAll(".pll>span>b");
  const texts = [...d.last.filter(Boolean), ...(d.band !== null ? [d.band] : []), ...(b.peak ? [b.peak.label] : [])];
  texts.forEach((t, i) => {
    if (legend[i]?.textContent !== t) legend[i]?.replaceChildren(t);
  });
  q(".plt")?.replaceChildren(b.title);
  q(".ply")?.replaceChildren(...nodes(yTicks(d, f)));
  q(".plx")?.replaceChildren(...nodes(xTicks(d, f)));
  q(".plgr")?.replaceChildren(...svgKids(grid(d, f)));
  const bd = band(b, f);
  if (bd) {
    set(q(".plb"), { y: bd.y, height: bd.h });
    const [hi, lo] = root.querySelectorAll(".plbe");
    set(hi, { y1: bd.hi, y2: bd.hi });
    set(lo, { y1: bd.lo, y2: bd.lo });
  }
  if (b.peak) set(q("line.peak"), { y1: num(f.yf(b.peak.y) * 1000), y2: num(f.yf(b.peak.y) * 1000) });
  root.querySelectorAll("path.s").forEach((e, i) => e.setAttribute("d", path(b, d, f, i)));
  root.querySelectorAll(".pld").forEach((e) => e.remove());
  q("svg")?.after(...nodes(dots(b, f)));
  return true;
}
