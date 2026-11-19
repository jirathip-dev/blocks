import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const bench = JSON.parse(readFileSync(join(root, "docs/bench-blocks.json"), "utf8"));
const fixture = (k) => readFileSync(join(root, `fixtures/html/${k}.html`), "utf8").replace(/src="\/media\/[a-z.]*"/g, `src="media/sample.svg"`).replace(/<form id="b-f\d+"[^]*?<\/form>/g, "");
const sample = (k) => readFileSync(join(root, `fixtures/blocks/${k}.json`), "utf8").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const pages = [
  ["home", "index.html", "blocks", "Typed screens, drawn the same on the web, in SwiftUI and as a static page."],
  ["gallery", "gallery.html", "Gallery", "Every core kind of blocks, drawn from its sample."],
  ["schemes", "schemes.html", "Schemes", "The built-in default pair, and a scheme this site brings itself."],
  ["numbers", "numbers.html", "Numbers", "blocks' own measurements, and the budgets CI holds it to."],
  ["behaviours", "behaviours.html", "Behaviours", "What a screen does in the browser with nothing sent."],
  ["islands", "islands.html", "Islands", "An app's own component inside a screen, with its fallback."],
];
const repo = "https://github.com/jirathip-dev/blocks";

const nav = (cur) =>
  `<nav class="nav b b-nav" data-block="nav" data-id="nav"><a class="brand" href="index.html">blocks</a>` +
  pages.slice(1).map(([id, f, t]) => `<a href="${f}"${id === cur ? ' aria-current="page"' : ""}>${t.toLowerCase()}</a>`).join("") +
  `<a href="${repo}">github</a></nav>`;
const sec = (id, title, body) =>
  `<section class="sec b b-section" data-block="section" data-id="${id}"><h3 class="sh ">${title}</h3>${body}</section>`;
const text = (id, md, cls = "") => `<div class="txt b b-text${cls}" data-block="text" data-id="${id}">${md}</div>`;
const prose = (id, html) => `<div class="prose b b-prose" data-block="prose" data-id="${id}">${html}</div>`;
const list = (id, rows) => `<div class="list b b-list" data-block="list" data-id="${id}">${rows.join("")}</div>`;
const row = (id, t, s, v, href, mk) =>
  `<${href ? `a href="${href}"` : "div"} class="row b b-row${href ? " tap" : ""}" data-block="row" data-id="${id}">` +
  (mk ? `<span class="mk ${mk}"></span>` : "") +
  `<span class="rm"><span class="rt b-row__title">${t}</span>${s ? `<span class="rs b-row__subtitle ">${s}</span>` : ""}</span>` +
  (v ? `<span class="rv b-row__value">${v}</span>` : "") + `</${href ? "a" : "div"}>`;
const tile = (v, unit, label, note, tone = "") =>
  `<div class="st ${tone}"><b class="b-stat__value">${v}${unit ? `<small>${unit}</small>` : ""}</b><span class="m">${label}${note ? `<i>${note}</i>` : ""}</span></div>`;
const stats = (id, tiles) => `<div class="stats b b-stat" data-block="stat" data-id="${id}">${tiles.join("")}</div>`;
const foot = text("foot", `Every page here is a blocks <code>Screen</code>, written by <code>site::page</code>. No hand-written HTML. <a href="${repo}">Source on GitHub</a>.`, " foot");

const page = (id, body, extra = {}) => {
  const [, file, title, desc] = extra.page ?? pages.find((p) => p[0] === id);
  const t = id === "home" ? "blocks: typed screens, three renderers" : `${title} · blocks`;
  return `<!doctype html><html lang="en"${extra.html ?? ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title><meta name="description" content="${desc}"><meta property="og:title" content="${t}"><meta property="og:description" content="${desc}">
<meta property="og:url" content="https://jirathip-dev.github.io/blocks/${file === "index.html" ? "" : file.replace(".html", "/")}"><meta property="og:image" content="media/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../neutral-default/tokens.css"><link rel="stylesheet" href="../../../web/src/blocks.css"><link rel="stylesheet" href="site.css"></head>
<body class="${id}"><main><div class="scr b b-screen" data-block="screen" data-id="${id}"><p class="tabh"><span class="tw b-screen__title">${title}</span></p>
${nav(extra.nav ?? id)}${body}${foot}</div></main>${extra.after ?? ""}
<script>document.querySelectorAll(".scr>*").forEach((e,i)=>e.style.setProperty("--i",i));addEventListener("load",()=>document.body.dataset.h=document.documentElement.scrollHeight)</script></body></html>\n`;
};

const home = page("home",
  `<header class="hero b b-hero" data-block="hero" data-id="hero"><h1 class="b-hero__title">blocks</h1>` +
  `<p class="b-hero__subtitle">Typed screens, drawn the same on the web, in SwiftUI and as a static page.</p>` +
  `<figure class="media"><img src="media/tiles.svg" alt="tiles of a screen settling into place" width="640" height="400"><figcaption>This page is one too.</figcaption></figure>` +
  `<div class="bar b-hero__actions"><a class="btn primary" href="gallery.html"><span>see the kinds</span></a><a class="btn" href="${repo}" target="_blank" rel="noopener"><span>github</span></a><a class="btn" href="${repo}#readme" target="_blank" rel="noopener"><span>docs</span></a></div></header>` +
  stats("facts", [tile("26", "", "core kinds", ""), tile("3", "", "renderers: web, SwiftUI, static", ""), tile((bench.results.script_gzip_bytes.median / 1024).toFixed(1), "KB", "of script, gzipped", ""), tile("0", "", "lines of hand-written HTML here", "")]) +
  `<div class="grid2">` +
  prose("what", `<h2>One shape for a screen</h2><p>An app builds a <b>Screen</b> from typed blocks: rows, stats, forms, prose. A server sends it once, then only what changed. Each renderer draws the same tree, and every block carries a fallback, so a renderer that lacks a kind still shows something true.</p><p>With JS off, a page is plain HTML: every link works and every word reads. With <code>blocks.js</code>, the page is adopted where it stands, with no redraw.</p>`) +
  prose("code", `<h2>This page, in Rust</h2><pre><code class="lang-rust">Screen::new("home")
  .push(Nav::site(&amp;links))
  .push(Hero::new("blocks")
    .subtitle("Typed screens, drawn the same…")
    .action(Act::url("see the kinds", "gallery/")))
  .push(Stat::tiles(facts))</code></pre>`) + `</div>` +
  sec("tour", "Look around", list("pages", [
    row("gallery", "Gallery", "every core kind, drawn from its sample; the ones with no HTML view show their fallback", "26 kinds", "gallery.html"),
    row("schemes", "Schemes", "the default pair, light and dark, and a scheme this site brings itself", "3", "schemes.html"),
    row("numbers", "Numbers", "first paint, update cost and script size, against the budgets CI holds", "", "numbers.html"),
    row("behaviours", "Behaviours", "checks, show and enabled rules that run in the page, nothing sent", "", "behaviours.html"),
    row("islands", "Islands", "an app's own component in a screen, its props in and its events out", "", "islands.html"),
  ])));

const groups = [
  ["Layout", ["screen", "section", "sheet", "card"]],
  ["Words and pictures", ["text", "prose", "hero", "nav", "media", "images", "diagram"]],
  ["Lists and figures", ["list", "row", "stat", "chips"]],
  ["Input", ["button", "choice", "form", "composer", "run"]],
  ["Fallback only, no HTML view yet", ["config", "secret", "diff", "editor", "web", "scene", "island"]],
];
const about = {
  screen: "A whole screen: its title and its blocks.", section: "A titled group of blocks.", sheet: "A sheet over a screen.",
  card: "A card with a title, a line and its actions.", text: "Markdown, or one plain styled line.", prose: "Headings, paragraphs, lists, quotes and code.",
  hero: "A page's opening: a title, a line, a picture, its actions.", nav: "A site's link bar.", media: "A picture or a video of a known size.",
  images: "A strip of images.", diagram: "A diagram from its source, with counts on its nodes.", list: "A list of rows.", row: "One row: a title, a line, a value.",
  stat: "Figures: one tile, or a list of tiles.", chips: "A row of chips, one or many picked.", button: "A button that posts its action.",
  choice: "A question with options and a default.", form: "Fields, their checks and a submit.", composer: "A message box and its send action.",
  run: "A command someone approves to run.", config: "Settings as fields.", secret: "A secret's input; its value is never sent back.",
  diff: "A file's diff.", editor: "A text editor and its errors.", web: "A web view of a fixed height.", scene: "A live scene of workers.",
  island: "An app's own component, its props in and events out.",
};
const fallbackOnly = new Set(groups[4][1]);
const kindTile = (k) => sec(`kind-${k}`, `<a href="kind-${k}.html">${k}</a>`,
  text(`about-${k}`, about[k]) +
  (fallbackOnly.has(k) ? text(`fb-${k}`, `<span class="fbk">No HTML view yet: this is its fallback</span>`) : "") +
  `<div class="spec">${fixture(k)}</div>`);
const gallery = page("gallery",
  text("intro", `Each kind below is drawn by the real HTML renderer from its sample in <code>fixtures/blocks</code>. Seven kinds have no HTML view yet; they draw the fallback every block carries, and say so.`) +
  text("jump", `<nav class="jump">${groups.map(([g, ks]) => ks.map((k) => `<a href="#kind-${k}">${k}</a>`).join("")).join("")}</nav>`) +
  groups.map(([g, ks], i) => sec(`group-${i}`, `${g} · ${ks.length}`, `<div class="grid3">${ks.map(kindTile).join("")}</div>`)).join(""));

const stat = page("gallery",
  text("crumb", `<a href="gallery.html">gallery</a> / lists and figures / stat. ${about.stat}`) +
  `<div class="grid2">` +
  sec("drawn", "Drawn", `<div class="spec">${fixture("stat")}</div>` +
    text("more", `With <code>items</code>, a <code>unit</code> and a <code>tone</code>:`) +
    `<div class="spec">${stats("week", [tile("3", "", "open", ""), tile("12", "ms", "p50", ""), tile("2", "", "failing", "", "warn")])}</div>`) +
  sec("sample", "The sample · fixtures/blocks/stat.json", prose("json", `<pre><code class="lang-json">${esc(sample("stat"))}</code></pre>`) +
    text("rust", `In Rust: <code>Stat::new("open").label("open").value(3)</code>`)) +
  `</div><div class="grid2">` +
  sec("fallback", "Its fallback", text("fb", `What a renderer without <code>stat</code> draws: a row with its label and value.`) +
    `<div class="spec">${row("open", "open", "", "3")}</div>`) +
  sec("hooks", "Style hooks", list("hooks", [row("h1", "<code>.b-stat</code>", "the block", "data-block=stat"), row("h2", "<code>.b-stat__value</code>", "each figure", ""), row("h3", "<code>[data-id=open]</code>", "this one block", "")])) +
  `</div>` + text("next", `<nav class="jump"><a href="kind-row.html">← row</a><a href="kind-chips.html">chips →</a></nav>`),
  { page: ["stat", "kind-stat.html", "stat", "stat: figures, one tile or a list of tiles. Drawn from its sample."] });

const swatches = ["--bg", "--card", "--edge", "--fg", "--mute", "--l", "--g", "--a", "--r", "--c"];
const preview = (cls, name, note) => `<div class="${cls}"><div class="lbl"><span>${name}</span><span>${note}</span></div><div class="scheme">` +
  `<div class="tile sw">${swatches.map((v) => `<i style="background:var(${v})"></i>`).join("")}</div>` +
  `<div class="tile">${row("p1", "Build", "green, 2 minutes ago", "2m", "", "g")}${row("p2", "Deploy", "waiting on review", "", "", "a")}${row("p3", "Lint", "3 warnings", "", "", "r")}</div>` +
  `<div class="stats">${tile("3", "", "open", "")}${tile("12", "ms", "p50", "")}</div>` +
  `<div class="tile"><div class="chips" style="margin:0"><button class="on" type="button"><span>low</span></button><button type="button"><span>high</span></button><button class="primary" type="button"><span>save</span></button><button class="bad" type="button"><span>delete</span></button></div></div></div></div>`;
const look = (now) => `<div class="b-sheet open"><div class="b-sheet__card" style="max-width:520px"><div class="b-sheet__head"><span class="b-sheet__title"><b>look</b></span><button type="button"><span>done</span></button></div>` +
  `<div class="list">${[["own", "the app's own", "follows the device"], ["light", "Default light", ""], ["dark", "Default dark", ""], ["paper", "Paper", "this site's own"]]
    .map(([id, t, s]) => `<div class="row${id === now ? " on" : ""}"><span class="rm"><span class="rt">${t}</span>${s ? `<span class="rs">${s}</span>` : ""}</span><span class="rv">${id === now ? "✓" : ""}</span></div>`).join("")}</div></div></div>`;
const schemesBody = (sheet) =>
  text("intro", `blocks ships one scheme: the default pair, light and dark. An app brings any other itself. With JS off you see all three below; with <code>blocks.js</code>, the <b>look</b> button opens the shell's look sheet and the whole site changes.`) +
  stats("pick", []).replace("</div>", `<button type="button" style="margin:0"><span>look</span></button></div>`).replace('class="stats', 'style="display:flex;justify-content:flex-end" class="stats') +
  `<div class="grid3">${preview("s-light", "Default light", "built in")}${preview("s-dark", "Default dark", "built in")}${preview("s-paper", "Paper", "this site's own")}</div>` +
  `<div class="grid2">` +
  prose("own", `<h2>Bring your own</h2><p>A scheme is the 19 colour tokens and a label. The site hands it to <code>mount</code> with the default pair; the look sheet lists what it is given. The gate checks contrast and colour distance before a scheme ships.</p>`) +
  prose("json", `<h2>paper.json</h2><pre><code class="lang-json">{"label": "Paper", "color-scheme": "light",
 "tokens": {"--bg": "#f3eee4", "--card": "#fcfaf5",
  "--edge": "#d3c9b6", "--fg": "#1f1c17",
  "--l": "#24406b", "--link": "#24406b", …}}</code></pre>`) + `</div>` + (sheet ? look("paper") : "");
const schemes = page("schemes", schemesBody(false));
const schemesSheet = page("schemes", schemesBody(true), { html: ' class="paper"' });

const r = bench.results;
const ms = (k) => [r[k].median, "ms", `${r[k].min}–${r[k].max}`];
const by = (k) => [Math.round(r[k].median).toLocaleString("en"), "B", `${r[k].min.toLocaleString("en")}–${r[k].max.toLocaleString("en")}`];
const m = bench.machine;
const numbers = page("numbers",
  text("intro", `Measured by <code>just bench</code> in the headless WebKit on a 200-row screen: the median of ${bench.runs} runs, min–max under it. ${m.cpu}, ${m.cores} cores, WebKit ${bench.versions.webkit}, ${bench.date}.`) +
  sec("paint", "First paint, 200 rows", stats("p", [["cold", ...ms("first_paint_cold_ms")], ["warm", ...ms("first_paint_warm_ms")]].map(([l, v, u, n]) => tile(v, u, `${l}`, n)))) +
  sec("update", "One update, to the screen", stats("u", [["one row changed", "update_one"], ["one row inserted", "update_insert"], ["20 rows changed", "update_twenty"]].map(([l, k]) => {
    const [v, u, n] = ms(`${k}_ms`); const [bv] = by(`${k}_bytes`); return tile(v, u, l, `${n} ms · ${bv} B sent`);
  }))) +
  sec("weight", "Weight", stats("w", [tile((r.script_gzip_bytes.median / 1024).toFixed(1), "KB", "script, gzipped", "blocks.js, level 9"), tile(Math.round(r.memory_after_updates_mb.median), "MB", "page memory after 1,000 updates", `${Math.round(r.memory_after_updates_mb.min)}–${Math.round(r.memory_after_updates_mb.max)} MB`)])) +
  sec("budgets", "Budgets CI holds · just perf, release", text("bnote", `CI fails a change that takes longer than these. Measured times join them once the perf run writes its numbers.`) +
    stats("b", [["150", "µs", "diff a 200-row screen"], ["150", "µs", "apply its ops"], ["3", "ms", "serialize a 500 KB screen"], ["5", "ms", "parse a 500 KB screen"], ["10", "ms", "write a 500 KB screen as HTML"], ["300", "µs", "check a 200-node layout"]].map(([v, u, l]) => tile(`≤ ${v}`, u, l, "budget")))));

const behaviours = page("behaviours",
  text("intro", `A screen carries small rules: a field's checks, when a block hides, when a control is off. The renderer runs them as you type; nothing goes to a server. With JS off, each block shows its start state and the page still reads.`) +
  `<div class="grid2">` +
  sec("try", "Try it", `<div class="form b b-form" data-block="form" data-id="signup">` +
    `<label class="fd err"><span class="fk">Email</span><input name="email" type="text" value="ada@"></label><p class="hint err">needs a domain after the @</p>` +
    `<label class="fd"><span class="fk">Updates</span><span class="toggle"></span><span class="m">send me the monthly note</span></label>` +
    `<label class="fd"><span class="fk">How often</span><span class="chips" style="margin:0"><button class="on" type="button"><span>monthly</span></button><button type="button"><span>weekly</span></button></span></label>` +
    `<div class="bar"><button class="primary" type="button" disabled><span>sign up</span></button><span class="m">off until every check holds</span></div></div>` +
    `<div class="state"><b>state</b> email: "ada@" · updates: true · often: "monthly"<br><b>view</b> hidden: [] · disabled: [sign-up] · says: {email}</div>`) +
  sec("rules", "The rules on this screen", prose("rules", `<pre><code class="lang-json">email:    "checks": [{"ok": {"is": [{"get": "email"}, "email"]},
                       "say": "needs a domain after the @"}]
often:    "show":    {"get": "updates"}
sign-up:  "enabled": {"all": [{"is": [{"get": "email"}, "email"]}, ...]}</code></pre>`) +
    list("where", [row("w1", "Web", "blocks.js runs the loop on each keystroke", "live"), row("w2", "SwiftUI", "the same rules, the same messages", "live"), row("w3", "Static page, JS off", "start state; the form posts and the server checks", "start")])) +
  `</div>` + text("pages", `On this site there is no server, so a submit goes nowhere; the rules still run in the page.`));

const islands = page("islands",
  text("intro", `An island is a component the app brings, inside a blocks screen. blocks gives it props and passes its named events back as actions. Until it loads, and with JS off, it shows the fallback the block carries, in the box it reserves.`) +
  `<div class="grid2">` +
  sec("before", "Before it loads · JS off", `<div class="b b-island" data-block="island" data-id="chart" data-fallback=""><div class="boxed">${row("", "Downloads by week", "the chart needs JS; 1,204 last week", "")}</div></div>`) +
  sec("after", "Mounted · x-chart", `<x-chart class="b b-island" data-block="island" data-id="chart"><div class="chart">${[30, 42, 38, 55, 61, 48, 72, 80].map((h, i) => `<i style="height:${h}%"${i === 6 ? ' class="on"' : ""}></i>`).join("")}</div><div class="axis">${["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"].map((w) => `<span>${w}</span>`).join("")}</div></x-chart>` +
    text("picked", `You picked <b>w7</b>: 1,012. The <code>pick</code> event came out of the island; this line changed in the page.`)) +
  `</div><div class="grid2">` +
  sec("contract", "Its contract", list("c", [row("c1", "name", "the custom element's tag", "x-chart"), row("c2", "props in", "set at mount and after each update", "weeks, picked"), row("c3", "events out", "dispatched as blocks-event, posted as an action", "pick"), row("c4", "size", "kept before it loads, so nothing jumps", "16:7")])) +
  sec("code", "In Rust", prose("rs", `<pre><code class="lang-rust">Island::new("x-chart", Fallback::row("Downloads by week"))
  .props(json_props)
  .events(["pick"])
  .size(IslandSize::aspect("16:7"))</code></pre>`)) + `</div>`);

const out = { "index.html": home, "gallery.html": gallery, "kind-stat.html": stat, "schemes.html": schemes, "schemes-sheet.html": schemesSheet, "numbers.html": numbers, "behaviours.html": behaviours, "islands.html": islands };
for (const [f, html] of Object.entries(out)) writeFileSync(join(here, f), html);
console.log(Object.keys(out).join(" "));
