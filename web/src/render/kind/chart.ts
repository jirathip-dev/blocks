import { axis, chart as rules, isLine, type PointGrab, shown, stepOf } from "../../core/kind/chart.ts";
import type { Chart, ChartFormat, PointMove, Series, Tone } from "../../gen/types.ts";
import { gestured, held } from "../../gesture.ts";
import { sends } from "../act.ts";
import type { Ctx } from "../ctx.ts";
import { esc, nodes } from "../dom.ts";

const H = 180;
const ORDER = ["--l", "--c", "--a", "--p", "--g"];
const EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TONES: Record<string, string> = { ok: "--g", warn: "--a", bad: "--r", info: "--c", accent: "--p", mute: "--mute" };

const num = (x: number) => String(Math.round(x * 100) / 100 + 0);
const th = (c: Chart) => c.lang === "th";

function group(v: number, tenths: boolean): string {
  const scaled = Math.round(v * (tenths ? 10 : 1));
  const whole = tenths ? Math.trunc(scaled / 10) : scaled;
  const tenth = scaled - whole * 10;
  return whole.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (tenths && tenth > 0 ? `.${tenth}` : "");
}

function value(v: number | undefined, f?: ChartFormat | null): string {
  if (v === undefined) return "—";
  const a = Math.abs(v);
  const body =
    f === "thb" ? `฿${group(a, false)}`
    : f === "thb_m" ? (a >= 1e6 ? `฿${group(a / 1e6, true)}M` : a >= 1e3 ? `฿${group(a / 1e3, false)}K` : `฿${group(a, false)}`)
    : f === "percent" ? `${group(a, true)}%`
    : group(a, false);
  return (v < 0 ? "-" : "") + body;
}

function label(c: Chart, x: string, long: boolean): string {
  const m = /^(\d{4})-(\d{2})$/.exec(x);
  const name = m ? (th(c) ? TH : EN)[Number(m[2]) - 1] : undefined;
  if (!m || name === undefined) return x;
  const y = Number(m[1]) + (c.era === "be" ? 543 : 0);
  return `${name} ${long ? y : String(y % 100).padStart(2, "0")}`;
}

const colour = (tone: Tone | null | undefined, i: number) => `--k:var(${TONES[tone ?? ""] ?? ORDER[i % ORDER.length]})`;

const at = (s: Series, i: number): number | undefined => s.values[i];

function svg(c: Chart, lo: number, hi: number): string {
  const n = c.x.length, w = num(n * 10);
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  let out = `<svg viewBox="0 0 ${w} ${num(H)}" preserveAspectRatio="none" aria-hidden="true">`;
  for (const t of [0.5, 1]) out += `<line class="grid" x1="0" x2="${w}" y1="${num(H - t * H)}" y2="${num(H - t * H)}"/>`;
  const gap = n > 16 ? 1.5 : 2.5;
  const bars = c.series.map((s, i) => [s, i] as const).filter(([s]) => !isLine(c, s));
  const rect = (x: number, width: number, top: number, bottom: number, k: string) =>
    `<rect class="s" x="${num(x)}" width="${num(width)}" y="${num(top)}" height="${num(Math.max(0, bottom - top))}" style="${k}"/>`;
  for (let i = 0; i < n; i++) {
    const left = i * 10 + gap;
    if (c.chart === "bar") {
      const each = (10 - 2 * gap) / Math.max(1, bars.length), thin = bars.length > 1 ? 0.4 : 0;
      bars.forEach(([s, si], j) => {
        const v = at(s, i);
        if (v !== undefined) out += rect(left + j * each, Math.max(0.2, each - thin), y(Math.max(v, lo)), H, colour(s.tone, si));
      });
    } else {
      let base = 0;
      for (const [s, si] of bars) {
        const v = at(s, i);
        if (v === undefined || v <= 0) continue;
        out += rect(left, 10 - 2 * gap, y(base + v), y(base) - (base > 0 ? 2 : 0), colour(s.tone, si));
        base += v;
      }
    }
  }
  out += `<line class="base" x1="0" x2="${w}" y1="${num(H)}" y2="${num(H)}"/>`;
  c.series.forEach((s, si) => {
    if (!isLine(c, s)) return;
    const pts = c.x.flatMap((_, i) => {
      const v = at(s, i);
      return v === undefined ? [] : [`${num(i * 10 + 5)} ${num(y(v))}`];
    });
    out += `<path class="s${s.dash === true ? " dash" : ""}" d="M${pts.join("L")}" style="${colour(s.tone, si)}"/>`;
  });
  return out + "</svg>";
}

const top = (v: number, lo: number, hi: number) => (1 - (v - lo) / (hi - lo)) * 100;
const pct = (share: number) => `${Math.round(share).toFixed(0)}%`;
const tag = (t: string, cls: string, text: string, attrs = "") => `<${t}${cls ? ` class="${cls}"` : ""}${attrs}>${esc(text)}</${t}>`;

function tapBtn(c: Chart, cls: string, attrs: string): string {
  const a = sends(c.tap);
  return `<button class="${cls}"${attrs} type="button"${typeof a === "string" && a ? ` data-action="${esc(a)}"` : ""}>`;
}

function legend(c: Chart, i: number | null): string {
  let out = `<div class="chl">`;
  const x = i === null ? undefined : c.x[i];
  if (x !== undefined) out += tag("span", "chx", label(c, x, true));
  c.series.forEach((s, si) => {
    const cls = `chk${isLine(c, s) ? " chkl" : ""}${s.dash === true ? " chkd" : ""}`;
    out += `<span><i class="${cls}" style="${colour(s.tone, si)}"></i>${esc(s.name)}`;
    if (i !== null) out += tag("b", "", value(at(s, i), c.format));
    out += "</span>";
  });
  return out + "</div>";
}

function table(c: Chart, head: string[], rows: string[][]): string {
  const tr = (r: string[], t: string) => `<tr>${r.map((x) => tag(t, "", x)).join("")}</tr>`;
  return `<details>${tag("summary", "", th(c) ? "ตาราง" : "Table")}<div class="tw"><table>${tr(head, "th")}${rows.map((r) => tr(r, "td")).join("")}</table></div></details>`;
}

const isEmpty = (c: Chart) => c.x.length === 0 || c.series.every((s) => !s.values.length);
const pickOf = (c: Chart) => (isEmpty(c) || c.x.indexOf(c.selected ?? "") < 0 ? null : c.x.indexOf(c.selected ?? ""));
const readout = (c: Chart, hover: number | null) => (isEmpty(c) ? null : (hover ?? pickOf(c) ?? Math.max(0, c.x.length - 1)));

function plot(c: Chart): string {
  const n = c.x.length, empty = isEmpty(c), picked = pickOf(c);
  const [lo, hi] = axis(c);
  let out = legend(c, readout(c, null));
  out += `<div class="chg"><div class="chy">`;
  for (const t of [0, 0.5, 1]) out += tag("span", "", empty ? "" : value(lo + (hi - lo) * t, c.format), ` style="top:${num(100 - t * 100)}%"`);
  out += `</div><div class="chp">`;
  const band = (i: number) => `left:${num((i / n) * 100)}%;width:${num(100 / n)}%`;
  if (picked !== null) out += `<i class="chb" style="${band(picked)}"></i>`;
  out += svg(c, lo, hi);
  c.series.forEach((s, si) => {
    const v = picked === null || !isLine(c, s) ? undefined : at(s, picked);
    if (picked === null || v === undefined) return;
    const top = ((H - ((v - lo) / (hi - lo)) * H) / H) * 100;
    out += `<i class="chd" style="left:${num(((picked + 0.5) / n) * 100)}%;top:${num(top)}%;${colour(s.tone, si)}"></i>`;
  });
  if (empty) out += tag("div", "che", c.empty ?? "No data yet");
  else
    c.x.forEach((x, i) => {
      const name = `${label(c, x, true)}: ${c.series.map((s) => `${s.name} ${value(at(s, i), c.format)}`).join(", ")}`;
      out += `${tapBtn(c, "chc", ` style="${band(i)}" aria-label="${esc(name)}"${picked === i ? ` aria-pressed="true"` : ""}`)}</button>`;
    });
  c.series.forEach((s, si) =>
    s.values.forEach((v, i) => {
      const x = c.x[i];
      if (x === undefined || !rules.word(c, { series: s.name, at: x })) return;
      const name = `${s.name}, ${label(c, x, true)}: ${shown(c, s, v)}`;
      out += `<span class="chqw"><span class="chq" role="button" tabindex="-1" data-si="${si}" data-i="${i}" aria-roledescription="editable point" aria-label="${esc(name)}" style="${band(i)};top:${num(top(v, lo, hi))}%;${colour(s.tone, si)}"></span></span>`;
    }),
  );
  out += `</div><div class="chx2">`;
  const wide = Math.max(1, Math.ceil(n / 12)), phone = Math.max(1, Math.ceil(n / 6));
  c.x.forEach((x, i) => {
    const cls = [i % wide === 0 ? "w" : "", i % phone === 0 ? "p" : "", picked === i ? "sel" : ""].filter(Boolean).join(" ");
    out += tag("span", cls, label(c, x, false), ` style="left:${num(((i + 0.5) / n) * 100)}%"`);
  });
  out += "</div></div>";
  const rows = c.x.map((x, i) => [label(c, x, true), ...c.series.map((s) => value(at(s, i), c.format))]);
  return out + table(c, ["", ...c.series.map((s) => s.name)], rows);
}

function slices(c: Chart): { name: string; v: number; tone?: Tone }[] {
  const s = c.series[0];
  const parts: { name: string; v: number; tone?: Tone }[] = c.x.map((name, i) => ({ name, v: (s && at(s, i)) ?? 0 }));
  parts.sort((a, b) => b.v - a.v);
  if (parts.length <= 5) return parts;
  const rest = parts.slice(4);
  return [...parts.slice(0, 4), { name: `${th(c) ? "อื่นๆ" : "Other"} (${rest.length})`, v: rest.reduce((a, p) => a + p.v, 0), tone: "mute" }];
}

function donut(c: Chart): string {
  const parts = slices(c);
  const total = parts.reduce((a, p) => a + p.v, 0);
  const share = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const sel = parts.find((p) => p.name === c.selected);
  let ring = `<svg viewBox="0 0 100 100" aria-hidden="true">`, off = 0;
  parts.forEach((p, i) => {
    const len = share(p.v);
    ring += `<circle cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="${num(Math.max(0, len - 0.8))} ${num(100 - len + 0.8)}" stroke-dashoffset="${num(-off)}"${sel === p ? ` class="sel"` : ""} style="${colour(p.tone, i)}"/>`;
    off += len;
  });
  let out = `<div class="chn"><div class="ring">${ring}</svg><div class="mid">${tag("b", "", value(sel ? sel.v : total, c.format))}${tag("span", "", sel ? sel.name : th(c) ? "รวม" : "Total")}</div></div><div class="rows">`;
  parts.forEach((p, i) => {
    const aria = `${p.name}: ${value(p.v, c.format)}, ${pct(share(p.v))}`;
    out += `${tapBtn(c, sel === p ? "chr sel" : "chr", ` aria-label="${esc(aria)}"`)}<i class="chk" style="${colour(p.tone, i)}"></i>${tag("span", "nm", p.name)}${tag("b", "", value(p.v, c.format))}${tag("i", "pc", pct(share(p.v)))}</button>`;
  });
  out += "</div></div>";
  return out + table(c, ["", c.series[0]?.name ?? "", "%"], parts.map((p) => [p.name, value(p.v, c.format), pct(share(p.v))]));
}

const inner = (c: Chart) => tag("div", "cht", c.title) + (c.chart === "donut" ? donut(c) : plot(c));

export function chart(b: Chart, ctx: Ctx): HTMLElement {
  const root = document.createElement("div");
  root.className = "card chart";
  let now: Chart = b;
  const keys = () => (now.chart === "donut" ? slices(now).map((p) => p.name) : now.x);
  const draw = () => {
    root.replaceChildren(...nodes(inner(now)));
    root.querySelectorAll<HTMLButtonElement>(".chc,.chr").forEach((e, i) => {
      const x = keys()[i] ?? "";
      e.onclick = () => {
        now = { ...now, selected: x };
        draw();
        const a = sends(b.tap);
        if (typeof a === "string" && a) void ctx.act({ action: a, block: b.id, values: { ...b.tap?.values, x } });
      };
      if (now.chart === "donut") return;
      const read = (at: number | null) => root.querySelector(".chl")?.replaceWith(...nodes(legend(now, readout(now, at))));
      e.onmouseenter = () => read(i);
      e.onmouseleave = () => read(null);
    });
    if (now.move) points(root, now, ctx, now.move);
  };
  draw();
  rove(root);
  return root;
}

function rove(root: HTMLElement) {
  const centre = (q: Element) => {
    const r = q.getBoundingClientRect();
    return r.top + r.height / 2;
  };
  root.addEventListener(
    "pointerdown",
    (e) => {
      const q = e.target instanceof HTMLElement && e.target.classList.contains("chq") ? e.target : null;
      const near = Array.from(root.querySelectorAll<HTMLElement>(`.chq[data-i="${q?.dataset["i"] ?? ""}"]`)).sort((a, b) => Math.abs(centre(a) - e.clientY) - Math.abs(centre(b) - e.clientY))[0];
      if (!q || !near || near === q || !e.isTrusted) return;
      e.stopPropagation();
      near.dispatchEvent(new PointerEvent("pointerdown", e));
    },
    { capture: true },
  );
  root.addEventListener("keydown", (e) => {
    const by = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    const q = e.target instanceof HTMLElement && e.target.classList.contains("chq") ? e.target : null;
    if (!q || by === undefined || e.defaultPrevented) return;
    const all = Array.from(root.querySelectorAll<HTMLElement>(`.chq[data-si="${q.dataset["si"] ?? ""}"]`));
    const next = all[all.indexOf(q) + by];
    if (!next) return;
    all.forEach((x) => (x.tabIndex = x === next ? 0 : -1));
    next.focus();
    e.preventDefault();
  });
}

function points(root: HTMLElement, now: Chart, ctx: Ctx, gesture: NonNullable<Chart["move"]>) {
  const [lo, hi] = axis(now);
  const seen = new Set<string>();
  root.querySelectorAll<HTMLElement>(".chq").forEach((q) => {
    const [si, i] = [Number(q.dataset["si"]), Number(q.dataset["i"])];
    const s = now.series[si], x = now.x[i], start = s?.values[i];
    if (!s || x === undefined || start === undefined) return;
    if (!seen.has(s.name)) {
      seen.add(s.name);
      q.tabIndex = 0;
    }
    const grab: PointGrab = { series: s.name, at: x };
    let dragged = false;
    const show = (m: PointMove | null) => {
      dragged ||= m !== null;
      const y = m?.y ?? start;
      const moved: Chart = { ...now, series: now.series.map((o, k) => (k === si ? { ...o, values: o.values.map((v, j) => (j === i ? y : v)) } : o)) };
      q.style.top = `${num(top(y, lo, hi))}%`;
      root.querySelector(".chp svg")?.replaceWith(...nodes(svg(moved, lo, hi)));
      root.querySelector(".chl")?.replaceWith(...nodes(legend(moved, m ? i : readout(now, null))));
      root.querySelectorAll(".chq-g,.chq-t").forEach((e) => e.remove());
      if (!m || m.y === start) return;
      const d = m.y - start, item = root.querySelectorAll(".chl>span:not(.chx)")[si];
      item?.querySelector("b")?.replaceChildren(shown(now, s, m.y));
      item?.append(...nodes(tag("em", "chq-d", `${d > 0 ? "+" : "−"}${shown(now, s, Math.abs(d))} from ${shown(now, s, start)}`)));
      q.before(...nodes(`<i class="chq-g" style="left:${num(((i + 0.5) / now.x.length) * 100)}%;top:${num(top(start, lo, hi))}%"></i>`));
      root.querySelector(".chy")?.append(...nodes(tag("span", "chq-t", shown(now, s, m.y), ` style="top:${num(top(m.y, lo, hi))}%"`)));
    };
    q.addEventListener("pointerdown", () => (dragged = false));
    q.addEventListener("click", () => {
      if (!dragged) root.querySelectorAll<HTMLElement>(".chc")[i]?.click();
    });
    const px = () => ((root.querySelector<HTMLElement>(".chp")?.offsetHeight ?? H) * stepOf(now, s)) / (hi - lo);
    gestured(q, ctx, { block: now, gesture, rules, grab, item: `${s.name}\n${x}`, reach: (_, dy) => ({ steps: Math.round(-dy / px()) }), show });
    const out = held(ctx, { block: now, rules, grab, item: `${s.name}\n${x}` });
    if (isMove(out)) show(out);
  });
}

const isMove = (v: unknown): v is PointMove => typeof v === "object" && v !== null && "y" in v && typeof v.y === "number";
