import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = readFileSync(join(here, "layout.json"), "utf8").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const repo = "https://github.com/jirathip-dev/blocks";

const pages = [
  ["gallery", "Gallery"], ["schemes", "Schemes"], ["numbers", "Numbers"],
  ["behaviours", "Behaviours"], ["islands", "Islands"], ["layout", "Layout"],
];
const nav = `<nav class="nav b b-nav" data-block="nav" data-id="nav"><a class="brand" href="../showcase/index.html">blocks</a>` +
  pages.map(([id, t]) => `<a href="${id === "layout" ? "layout.html" : `../showcase/${id}.html`}"${id === "layout" ? ' aria-current="page"' : ""}>${t.toLowerCase()}</a>`).join("") +
  `<a href="${repo}">github</a></nav>`;
const text = (id, html, cls = "") => `<div class="txt b b-text${cls}" data-block="text" data-id="${id}">${html}</div>`;
const sec = (id, title, body, cls = "") => `<section class="sec b b-section${cls}" data-block="section" data-id="${id}"><h3 class="sh ">${title}</h3>${body}</section>`;
const row = (id, t, s, v, mk) =>
  `<div class="row b b-row" data-block="row" data-id="${id}">` + (mk ? `<span class="mk ${mk}"></span>` : "") +
  `<span class="rm"><span class="rt b-row__title">${t}</span>${s ? `<span class="rs b-row__subtitle ">${s}</span>` : ""}</span>` +
  (v ? `<span class="rv b-row__value">${v}</span>` : "") + `</div>`;
const list = (id, rows) => `<div class="list b b-list" data-block="list" data-id="${id}">${rows.join("")}</div>`;
const tile = (v, unit, label) => `<div class="st"><b class="b-stat__value">${v}${unit ? `<small>${unit}</small>` : ""}</b><span class="m">${label}</span></div>`;
const stats = (id, tiles) => `<div class="stats b b-stat" data-block="stat" data-id="${id}">${tiles.join("")}</div>`;

const place = (c, w) => `<span class="pl"><span data-on="compact">${c}</span><span data-on="wide">${w}</span></span>`;
const screen = (id, title, c, w, body) =>
  `<section class="b-part" data-screen="${id}" data-block="screen" data-id="${id}" aria-label="${title}"><p class="tabh"><span class="tw b-screen__title">${title}</span>${place(c, w)}</p>${body}</section>`;
const today = screen("today", "Today", "strip", "panel",
  stats("t-figs", [tile("3", "", "to water"), tile("12", "", "plants"), tile("4", "mm", "rain tonight")]) +
  list("t-jobs", [row("j1", "Water the basil", "dry since Monday", "now", "a"), row("j2", "Turn the lemon tree", "leaning to the window", "today"), row("j3", "Repot the fern", "roots out of the base", "Sat")]));
const plants = screen("plants", "Plants", "strip", "column",
  list("p-all", [row("basil", "Basil", "kitchen sill", "dry", "a"), row("fern", "Fern", "bathroom", "fine", "g"), row("lemon", "Lemon tree", "living room", "fine", "g"),
    row("monstera", "Monstera", "hall", "fine", "g"), row("rosemary", "Rosemary", "balcony", "dry", "a"), row("mint", "Mint", "balcony", "fine", "g")]));
const weather = screen("weather", "Weather", "sheet", "cards",
  stats("w-rain", [tile("4", "mm", "rain tonight, from 21:00")]) +
  text("w-note", "Skip the balcony pots: the rain waters them."));
const app = `<div class="stage"><div class="app" role="group" aria-label="the layout, drawn">
${today}${plants}${weather}
<div class="scrim" aria-hidden="true"></div>
<nav class="b-tabs"><button class="b-tab on" type="button" data-on="compact"><span>today</span></button><button class="b-tab" type="button" data-on="compact"><span>plants</span></button><button class="b-tab b-menu" type="button"><span>menu</span></button>${place("menu", "menu")}</nav>
</div></div>`;

const hl = esc(file)
  .replace(/"compact": "(\w+)"/g, `"compact": <mark data-on="compact">"$1"</mark>`)
  .replace(/"wide": "(\w+)"/g, `"wide": <mark data-on="wide">"$1"</mark>`)
  .replace(/"place": "(\w+)"/g, `"place": <mark>"$1"</mark>`);

const sw = `<div class="chips b b-chips sw" data-block="chips" data-id="size" role="group" aria-label="size class">` +
  `<button type="button" data-size="compact" aria-pressed="false"><span>compact</span></button>` +
  `<button type="button" data-size="wide" aria-pressed="false"><span>wide</span></button></div>`;

const where = list("where", [
  row("r-today", "Today", "a tab · the main panel", place("strip", "panel")),
  row("r-plants", "Plants", "a tab · a column at the side", place("strip", "column")),
  row("r-weather", "Weather", "a sheet over the page · a card at the side", place("sheet", "cards")),
  row("r-settings", "Settings", "behind menu, on both", place("menu", "menu")),
]);
const contract = `<div class="prose b b-prose" data-block="prose" data-id="contract"><pre><code class="lang-rust">const GARDEN: Contract = Contract {
    components: &amp;[],
    locked: &amp;["/screens/account"],
};
layout::check(LAYOUT_JSON, &amp;GARDEN)?</code></pre></div>`;
const refused = `<div class="state"><b>refused</b> layout.json:14:24 · root.slots.main[0]: unknown place "tabs"</div>`;

const body =
  text("intro", `One <code>layout.json</code> places the same screens for a phone and for a wide window. Flip the size class: nothing is redrawn, the screens only move.`) +
  `<div class="b b-section bar-size" data-block="section" data-id="switch"><span class="lbl2">Size class</span>${sw}<span class="ok"><span class="mk g"></span>passes <code>layout::check</code> against the site's contract</span></div>` +
  `<div class="lay"><div class="left">` +
  sec("drawn", `Drawn · <span data-on="compact">compact: a phone</span><span data-on="wide">wide: a tablet or a desktop</span>`, app, " drawn") +
  sec("where", "Where each screen goes", where) +
  `</div>` +
  sec("file", "layout.json", `<div class="prose b b-prose" data-block="prose" data-id="json"><pre class="json"><code class="lang-json">${hl}</code></pre></div>`, " file") +
  `</div>` +
  sec("contract", "Checked when the site builds", `<div class="grid2">` + text("c-why", `The site declares its own contract: no components beyond <code>nav</code>, and one screen no file may place. A file that breaks a rule stops the build, with its line and column.`) + `<div class="b c-code">` + contract + refused + `</div></div>`) +
  text("foot", `Every page here is a blocks <code>Screen</code>, written by <code>site::page</code>. No hand-written HTML. <a href="${repo}">Source on GitHub</a>.`, " foot");

const desc = "One layout.json, drawn for a phone and for a wide window.";
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Layout · blocks</title><meta name="description" content="${desc}"><meta property="og:title" content="Layout · blocks"><meta property="og:description" content="${desc}">
<meta property="og:url" content="https://jirathip-dev.github.io/blocks/layout/"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../neutral-default/tokens.css"><link rel="stylesheet" href="../../../web/src/blocks.css"><link rel="stylesheet" href="../showcase/site.css"><link rel="stylesheet" href="layout.css"></head>
<body class="layout"><main><div class="scr b b-screen" data-block="screen" data-id="layout"><p class="tabh"><span class="tw b-screen__title">Layout</span></p>
${nav}${body}</div></main>
<script src="layout.js"></script></body></html>\n`;
writeFileSync(join(here, "layout.html"), html);
console.log("layout.html");
