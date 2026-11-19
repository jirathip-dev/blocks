import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gate, looks } from "./looks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = process.argv[2];
if (!site) throw new Error("usage: node build.mjs <built site dir>");
for (const f of ["blocks.css", "site.css"]) copyFileSync(join(site, f), join(here, f));
mkdirSync(join(here, "media"), { recursive: true });
cpSync(join(site, "media"), join(here, "media"), { recursive: true });

const FONT = {
  default: `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif`,
  serif: `"Iowan Old Style","Charter","Palatino Linotype",Georgia,serif`,
  mono: `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`,
};
const EASE = { standard: "cubic-bezier(0.2, 0, 0, 1)", calm: "cubic-bezier(0.4, 0, 0.2, 1)", bouncy: "cubic-bezier(0.34, 1.56, 0.64, 1)" };
const SURFACE = {
  solid: ["var(--card)", "solid", "none", "none"],
  dashed: ["var(--card)", "dashed", "none", "none"],
  glass: ["color-mix(in srgb, var(--card) 72%, transparent)", "solid", "0 6px 24px -10px var(--scrim)", "blur(12px) saturate(1.4)"],
};
const FILLS = {
  tint: ["color-mix(in srgb, var(--l) 12%, var(--card))", "var(--fk-l)", "transparent"],
  outline: ["transparent", "var(--fk-l)", "var(--l)"],
  solid: ["var(--l)", "var(--bg)", "var(--l)"],
};

const vars = (look, mode) => {
  const s = look.style;
  const [sb, ss, sh, sf] = SURFACE[s.surface];
  const [fb, ff, fe] = FILLS[s.fills];
  const t = Object.entries(look[mode]).map(([k, v]) => `${k}:${v}`);
  return [
    ...t,
    `--font:${FONT[s.type]}`,
    `--space:${s.space}`,
    `--radius:${s.radius * 6}px`,
    `--motion:${s.motion}`,
    `--ease:${EASE[s.ease]}`,
    `--gap:max(1px, calc(2px + (var(--space) - 1) * 16px))`,
    `--pad-t:calc(16px * var(--space))`,
    `--surf-bg:${sb}`,
    `--surf-line:${ss}`,
    `--surf-shadow:${sh}`,
    `--surf-blur:${sf}`,
    `--fill-bg:${fb}`,
    `--fill-fg:${ff}`,
    `--fill-edge:${fe}`,
    `color-scheme:${mode}`,
  ].join(";");
};
const attrs = (name) => {
  const s = looks[name].style;
  return `data-look="${name}" data-marks="${s.marks}" data-sections="${s.sections}"`;
};

let head = "";
for (const [name, look] of Object.entries(looks)) head += `[data-look=${name}]{${vars(look, "light")}}\n`;
head += "@media (prefers-color-scheme: dark){\n";
for (const [name, look] of Object.entries(looks)) head += `[data-look=${name}]{${vars(look, "dark")}}\n`;
head += "}\n";
let labels = "";
for (const [name, look] of Object.entries(looks)) {
  const l = look.style.labels;
  const sel = { section: ".b-section>.sh", button: "button:not(.b-look button):not(.chips button),a.btn", picked: ".chips button[aria-pressed=true]" };
  for (const [role, d] of Object.entries(l)) {
    const on = sel[role].split(",").map((x) => `html[data-look=${name}] ${x}:not(.pin *)`);
    const pin = sel[role].split(",").map((x) => `.pin[data-look=${name}] ${x}`);
    const all = [...on, ...pin];
    if (d.case) labels += `${all.join(",")}{text-transform:${d.case === "upper" ? "uppercase" : "lowercase"}}\n`;
    if (d.prefix) labels += `${all.map((x) => `${x}::before`).join(",")}{content:"${d.prefix}";display:inline;position:static;inset:auto;width:auto;height:auto;background:none;border:0;transform:none}\n`;
    if (d.suffix) labels += `${all.map((x) => `${x}::after`).join(",")}{content:"${d.suffix}";display:inline;position:static;inset:auto;width:auto;height:auto;background:none;border:0;transform:none}\n`;
  }
}
writeFileSync(join(here, "looks.css"), head + labels + readFileSync(join(here, "axes.css"), "utf8"));

const PAGES = [
  ["index.html", "blocks"],
  ["gallery.html", "gallery"],
  ["styles.html", "styles"],
  ["numbers.html", "numbers"],
  ["behaviours.html", "behaviours"],
  ["islands.html", "islands"],
];
const switcher = (cur) =>
  `<div class="b-look" role="group" aria-label="look"><span class="b-look__k">look</span>` +
  Object.entries(looks)
    .map(([n, l]) => `<button type="button" data-pick="${n}" aria-pressed="${n === cur}"><i class="sw" data-sw="${n}" aria-hidden="true"></i>${l.label}</button>`)
    .join("") +
  `</div>`;
const nav = (cur, look) =>
  `<nav class="nav b b-nav" data-block="nav" data-id="site-nav" role="navigation" aria-label="site-nav"><a class="brand" href="index.html">blocks</a>` +
  PAGES.slice(1)
    .map(([f, t]) => `<a href="${f}"${t === cur ? ' aria-current="page"' : ""}>${t}</a>`)
    .join("") +
  `<a href="https://github.com/jirathip-dev/blocks">github</a>${switcher(look)}</nav>`;

const wear = (html, look, cur) =>
  html
    .replace(/<script[^]*?<\/script>/g, "")
    .replace("<html lang=\"en\">", `<html lang="en" ${attrs(look)}>`)
    .replace(/<style>[^]*?<\/style>/, "")
    .replace('<link rel="stylesheet" href="site.css">', '<link rel="stylesheet" href="site.css"><link rel="stylesheet" href="looks.css">')
    .replace(/<nav class="nav b b-nav" data-block="nav" data-id="site-nav"[^]*?<\/nav>/, nav(cur, look))
    .replace(/data-id="to-schemes" href="schemes.html" role="button" aria-label="Schemes"><span class="rm"><span class="rt b-row__title">Schemes<\/span><span class="rs b-row__subtitle ?">[^<]*<\/span><\/span><span class="rv b-row__value">3</, 'data-id="to-styles" href="styles-default.html" role="button" aria-label="Styles"><span class="rm"><span class="rt b-row__title">Styles</span><span class="rs b-row__subtitle">four looks, and each part of a style drawn in all four</span></span><span class="rv b-row__value">4 looks<');

const built = (f) => readFileSync(join(site, f), "utf8");
for (const look of Object.keys(looks)) {
  writeFileSync(join(here, `home-${look}.html`), wear(built("index.html"), look, "blocks"));
  writeFileSync(join(here, `gallery-${look}.html`), wear(built("gallery.html"), look, "gallery"));
}

const sec = (id, title, body) => `<section class="sec b b-section" data-block="section" data-id="${id}" role="region" aria-label="${title}"><h3 class="sh ">${title}</h3>${body}</section>`;
const prose = (id, html) => `<div class="prose b b-prose" data-block="prose" data-id="${id}" role="group" aria-label="${id}">${html}</div>`;
const row = (t, s, v) => `<div class="row b b-row"><span class="rm"><span class="rt b-row__title">${t}</span>${s ? `<span class="rs b-row__subtitle">${s}</span>` : ""}</span>${v ? `<span class="rv b-row__value">${v}</span>` : ""}</div>`;
const mark = (look, state, word, glyph, tone) =>
  looks[look].style.marks === "text"
    ? `<span class="rsg ${state}" role="img" aria-label="${word}"><i class="gw ${tone}">${word}</i></span>`
    : `<span class="rsg ${state}" role="img" aria-label="${word}"><i class="gl ${tone}">${glyph}</i></span>`;
const AXES = [
  ["colour", "Colour", "scheme pair", "The 19 colour tokens, once for light and once for dark. The page follows the device; each pair passes theme::gate.", (l) => `<div class="sws">${["--bg", "--card", "--edge", "--fg", "--mute", "--l", "--g", "--a", "--r", "--p"].map((k) => `<span style="background:var(${k})"></span>`).join("")}</div><p class="pin-k">accent <b style="color:var(--fk-l)">${looks[l].light["--l"]}</b> · <b style="color:var(--fk-l)">${looks[l].dark["--l"]}</b></p>`],
  ["type", "Type", "type", "The font design every label is set in.", () => `<p class="t-h">Build log, Tuesday</p><p class="t-b">Three builds ran; one waits on you.</p><p class="t-n">1,284 <small>ms</small></p>`],
  ["space", "Space", "space", "A multiplier of the renderer's paddings and gaps.", () => `<div class="list b b-list">${row("api", "build 812", "2 min")}${row("web", "build 811", "9 min")}${row("docs", "build 810", "1 h")}</div>`],
  ["radius", "Radius", "radius", "A multiplier of the renderer's corner radius; 0 is square.", () => `<div class="bar"><button class="primary">save</button><button>cancel</button></div><div class="chips"><button aria-pressed="true">open</button><button>closed</button></div>`],
  ["motion", "Motion", "motion", "A multiplier of every duration; 0 is none. Transform and opacity only, and none under reduced motion.", (l) => motion(l)],
  ["surface", "Surface", "surface", "How a card's surface is drawn.", () => `<div class="card s-card"><b>Deploy to staging</b><p class="m">Waiting on review.</p></div>`],
  ["fills", "Fills", "fills", "How a tinted part is filled: the primary action, the picked chip, a tag.", () => `<div class="bar"><button class="primary">approve</button><span class="tag f-tag">needs you</span></div>`],
  ["marks", "Marks", "marks", "Whether a state mark is a symbol or its word.", (l) => `<div class="list b b-list"><div class="row b b-row">${mark(l, "done", "done", "✓", "mute")}<span class="rm"><span class="rt">build 812</span></span></div><div class="row b b-row">${mark(l, "needs", "needs you", "!", "r")}<span class="rm"><span class="rt">build 811</span></span></div><div class="row b b-row">${mark(l, "fail", "failed", "✗", "r")}<span class="rm"><span class="rt">build 810</span></span></div></div>`],
  ["sections", "Sections", "sections", "How a section's header shows: a title, or quiet.", () => `<section class="b-section s-sec"><h3 class="sh">Today</h3>${row("api", "", "2 min")}</section>`],
  ["labels", "Labels", "labels", "A case and up to 4 marks of punctuation before or after a role's label: section, button, picked.", () => `<section class="b-section s-sec"><h3 class="sh">Recent</h3></section><div class="bar"><button>retry</button></div><div class="chips"><button aria-pressed="true">open</button></div>`],
];
function motion(l) {
  const s = looks[l].style;
  if (s.motion === 0) return `<div class="mo"><span class="f end"></span></div><p class="pin-k">appears at once: no movement</p>`;
  const ms = Math.round(160 * s.motion);
  const over = s.ease === "bouncy";
  return `<div class="mo"><span class="f" style="opacity:.2;transform:translateY(${8 * s.motion}px)"></span><span class="f" style="opacity:.55;transform:translateY(${over ? -3 : 3}px)"></span><span class="f end"></span></div><p class="pin-k">rises ${8 * s.motion}px, settles in ${ms} ms, ${s.ease === "bouncy" ? "overshoots, then settles" : s.ease === "calm" ? "eases in and out" : "eases out"}</p>`;
}
const VALUE = {
  colour: (l) => `${looks[l].label} light · dark`,
  type: (l) => looks[l].style.type,
  space: (l) => looks[l].style.space,
  radius: (l) => looks[l].style.radius,
  motion: (l) => `${looks[l].style.motion} · ${looks[l].style.ease}`,
  surface: (l) => looks[l].style.surface,
  fills: (l) => looks[l].style.fills,
  marks: (l) => looks[l].style.marks,
  sections: (l) => looks[l].style.sections,
  labels: (l) => Object.entries(looks[l].style.labels).map(([r, d]) => `${r}: ${d.prefix ?? ""}…${d.suffix ?? ""}${d.case ? ` ${d.case}` : ""}`.replace(": … ", ": ")).join(", ") || "as is",
};
const NEW = { type: "serif is new", fills: "solid is new", motion: "the ease is new" };
const NEEDS = { type: "paper", fills: "playful", motion: "paper" };
function styles(cur) {
  const cells = (id, fn) =>
    `<div class="pins">${Object.keys(looks)
      .map(
        (l) =>
          `<figure class="pin" ${attrs(l)}><figcaption><b>${looks[l].label}</b><span>${VALUE[id](l)}${NEW[id] && (id === "motion" ? looks[l].style.ease !== "standard" : NEEDS[id] === l) ? ` <em class="new">${NEW[id]}</em>` : ""}</span>${l === cur ? `<i class="on">wearing</i>` : ""}</figcaption><div class="pin-b">${fn(l)}</div></figure>`,
      )
      .join("")}</div>`;
  const intro = prose("intro", `<h2>A look is a scheme pair and a style</h2><p>Every page on this site wears the look picked in the bar above, and keeps it from page to page. Each look is two colour schemes, light and dark, and one <code>style.json</code>. The page follows your device for light or dark. Below, each part of a style, drawn in all four looks side by side.</p>`);
  const axes = AXES.map(([id, t, field, line, fn]) => sec(`axis-${id}`, t, prose(`what-${id}`, `<p><code>${field}</code>. ${line}</p>`) + cells(id, fn))).join("");
  const own = prose("own", `<h2>Bring your own</h2><p>An app hands blocks its own pair and style the same way this site does. <code>theme::gate</code> checks contrast and colour distance before a scheme ships; this site's build runs it on all eight of its schemes.</p><pre><code>${JSON.stringify({ format: 2, type: "serif", space: 1.5, radius: 1, motion: 1.75, surface: "solid", fills: "tint", marks: "text", sections: "quiet", labels: { section: { case: "upper" } } }, null, 2)}</code></pre>`);
  const body = `<div class="scr b b-screen" data-block="screen" data-id="styles" role="group" aria-label="Styles"><p class="tabh"><span class="tw b-screen__title">Styles</span></p>${nav("styles", cur)}${intro}${axes}${own}<div class="txt b b-text foot" data-block="text" data-id="foot">Every page here is a blocks <code>Screen</code>, written by <code>site::page</code>.</div></div>`;
  return `<!doctype html><html lang="en" ${attrs(cur)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Styles · blocks</title><link rel="stylesheet" href="blocks.css"><link rel="stylesheet" href="site.css"><link rel="stylesheet" href="looks.css"></head><body><main>${body}</main></body></html>`;
}
for (const look of Object.keys(looks)) writeFileSync(join(here, `styles-${look}.html`), styles(look));

for (const [n, l] of Object.entries(looks))
  for (const m of ["light", "dark"]) {
    const miss = gate(l[m]).filter(([, g, min]) => g < min);
    console.log(`gate ${n} ${m}: ${miss.length ? `MISS ${miss.map((x) => x[0]).join(", ")}` : "pass"}`);
  }
