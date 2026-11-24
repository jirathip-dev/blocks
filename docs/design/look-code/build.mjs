// Preview only: writes styles-*.html, shared.html and format.html from a real site build in argv[2].
import { readFileSync, writeFileSync } from "node:fs";
import { AXES, CASES, ROLES, encode, parts } from "./code.js";

const [, , site, root] = process.argv;
const here = new URL(".", import.meta.url).pathname;
const looks = JSON.parse(readFileSync(`${root}/site/looks.json`, "utf8"));
const { css: lookCss, tiles } = await import(`${root}/web/src/core/look.ts`);
const pairOf = (n) => looks[n].schemes ?? looks.default.schemes;
const NAMES = [["default", "Default"], ["paper", "Paper"], ["console", "Console"], ["playful", "Playful"]];
const codeOf = (n) => encode(looks[n].style, looks[n].schemes ? n : null);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const read = (f) => readFileSync(`${site}/${f}`, "utf8");

const CSS = `<style id="look-code-proposal">
.lc{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere;letter-spacing:.02em}
.st .lc{font-size:var(--fs-title,1.5em)}
.lc .v{color:var(--fk-a)}.lc .x{color:var(--fg)}.lc .lb{color:var(--fk-p)}.lc .sc{color:var(--fk-c)}
.row:has(.rv .lc) .rt{white-space:nowrap}.row:has(.rv .lc) .rm{flex:1 1 40%}.row .rv:has(.lc){flex:0 1 auto;min-width:0;white-space:normal;text-align:right}
.lc-big{display:block;font-size:clamp(28px,6vw,56px);line-height:1.15;margin:var(--s2) 0}
</style>`;

const painted = (code) => {
  const p = parts(code);
  return `<span class="v">${esc(p.version)}</span><span class="x">${esc(p.axes)}</span><span class="lb">${esc(p.labels)}</span><span class="sc">${esc(p.scheme)}</span>`;
};
const sec = (id, title, inner) =>
  `<section class="sec b b-section" data-block="section" data-id="${id}" role="region" aria-label="${esc(title || id)}">${title ? `<h3 class="sh ">${esc(title)}</h3>` : ""}${inner}</section>`;
const txt = (id, html) => `<div class="txt b b-text" data-block="text" data-id="${id}" role="group" aria-label="${id}">${html}</div>`;
const row = (id, title, sub, value, html = false) =>
  `<div class="row b b-row" data-block="row" data-id="${id}" role="group" aria-label="${esc(title)}"><span class="rm"><span class="rt b-row__title">${esc(title)}</span>${sub ? `<span class="rs b-row__subtitle">${esc(sub)}</span>` : ""}</span><span class="rv b-row__value">${html ? value : esc(value)}</span></div>`;
const list = (id, rows) => `<div class="list b b-list" data-block="list" data-id="${id}" role="group" aria-label="${id}">${rows.join("")}</div>`;
const button = (id, label, style = "plain") =>
  `<button class="${style} b b-button" data-block="button" data-id="${id}" data-variant="${style}" type="button" role="button" aria-label="${esc(label)}"><span>${esc(label)}</span></button>`;
const stat = (value, meta) => `<div class="st "><b class="b-stat__value">${value}</b><span class="m">${esc(meta)}</span></div>`;
const listing = (lang, body) => `<div class="prose b b-prose" data-block="prose" data-id="${lang}-use" role="group" aria-label="${lang}"><pre><code class="lang-${lang}">${esc(body)}</code></pre></div>`;
const toast = (tone, glyph, words, action) =>
  `<div class="tst inl ${tone} b b-toast" data-block="toast" data-tone="${tone}" role="status" aria-label="${esc(words)}"><i class="tsg" aria-hidden="true">${glyph}</i><span class="tsx">${esc(words)}</span>${action ? button(`t-${action}`, action) : ""}</div>`;

function described(code, label) {
  const p = parts(code);
  const bits = [`version ${p.version}`, `style ${p.axes}`];
  if (p.labels) bits.push("labels");
  bits.push(p.scheme ? `scheme ${p.scheme.slice(1)}` : "default colours");
  return `${label} · ${bits.join(" · ")}`;
}

function codeSection(look) {
  const code = codeOf(look);
  const label = NAMES.find(([n]) => n === look)[1];
  const p = parts(code);
  const partRows = [
    row("part-v", "version", "which reader takes it", `<span class="lc"><span class="v">${p.version}</span></span>`, true),
    row("part-x", "style", "type, space, radius, motion, easing, surface, fills, buttons, marks, sections", `<span class="lc"><span class="x">${p.axes}</span></span>`, true),
    row("part-l", "labels", "only when a role is decorated", p.labels ? `<span class="lc"><span class="lb">${esc(p.labels)}</span></span>` : "none", true),
    row("part-s", "scheme", "a name the app resolves; none is blocks' own pair", p.scheme ? `<span class="lc"><span class="sc">${esc(p.scheme)}</span></span>` : "none", true),
  ];
  const four = NAMES.map(([n, l]) => row(`code-${n}`, l, n === look ? "worn" : "", `<a class="lc" href="styles.html?look=${encodeURIComponent(codeOf(n))}">${painted(codeOf(n))}</a>`, true));
  return sec(
    "code",
    "Code",
    txt("code-what", "The look you wear as one short code. Copy it to share it, or copy a link that opens this site wearing it. An app wears it with <code>mount({ look })</code>.") +
      stat(`<span class="lc">${painted(code)}</span>`, described(code, label)) +
      `<div class="bar">${button("copy-code", "copy code", "primary")}${button("copy-link", "copy link")}</div>` +
      sec("code-parts", "", list("parts", partRows)) +
      sec("code-four", "The four", list("four", four)),
  );
}

function withLook(html, look, extra = "", { scheme = look, style = looks[look].style, shared = false } = {}) {
  const worn = scheme === "default" && look === "default" ? "" : `<style id="b-look">${tiles}${lookCss(pairOf(scheme), style)}</style>`;
  const attrs = `<html lang="en" data-look="${scheme}"${shared ? " data-shared" : ""}>`;
  return html.replace('<html lang="en">', attrs).replace("</head>", `${worn}${CSS}${extra}</head>`);
}

function introEnd(html) {
  const at = html.indexOf('data-id="intro"');
  return html.indexOf("</div>", at) + "</div>".length;
}

const styles = read("styles.html");
for (const look of ["default", "console"]) {
  const at = introEnd(styles);
  writeFileSync(`${here}/styles-${look}.html`, withLook(styles.slice(0, at) + codeSection(look) + styles.slice(at), look));
}

const shared = encode(looks.playful.style, "paper");
let home = read("index.html");
home = home.replace(/(data-sheet="look:playful"[^>]*>.*?<\/button>)/, `$1<button class="b b-button" data-block="button" data-id="look-shared" type="button" data-sheet="look:shared" role="button" aria-label="Shared"><span>Shared</span></button>`);
home = home.replace("</main>", `<div class="tsts">${toast("ok", "✓", "Wearing a shared look: Paper's colours, Playful's style", "undo").replace(" inl", "")}</div></main>`);
const pin = `<style>html[data-shared] [data-sheet^="look:"]:not([data-sheet="look:shared"]){background:var(--bg);border-color:var(--edge);color:var(--fg)}html[data-shared] [data-sheet="look:shared"]{background:var(--l);border-color:var(--l);color:var(--bg)}</style>`;
writeFileSync(`${here}/shared.html`, withLook(home, "shared", pin, { scheme: "paper", style: looks.playful.style, shared: true }));

const axisRows = AXES.map(([k, v], i) => {
  const vals = v === "scale" ? "0, 0.25, 0.5 … 4 (17 steps)" : v.map((x, j) => `${x} ${j}`).join(" · ");
  return row(`ax-${k}`, `${i + 1}. ${k}`, i === 0 ? "the lowest digit" : "", vals);
});
const examples = [
  ...NAMES.map(([n, l]) => row(`ex-${n}`, l, n === "default" ? "blocks' own pair: no scheme part" : `the site's own ${n} pair`, `<span class="lc">${painted(codeOf(n))}</span>`, true)),
  row("ex-mix", "Paper's colours, Playful's style", "any scheme with any style", `<span class="lc">${painted(shared)}</span>`, true),
  row("ex-swag", "A swag pack's colours", "blocks reads the name, never the colours", `<span class="lc">${painted(encode(looks.default.style, "dusk"))}</span>`, true),
];
const rust = `use blocks::theme::LookCode;

let look: LookCode = "${shared}".parse()?;   // Err(CodeError::Version('9')) on "9…"
look.style      // a Style, every axis set
look.scheme     // Some("paper"): the app resolves it, None is theme::default()
look.to_string() == "${shared}"            // encode: the same code back`;
const ts = `import { mount, lookCode } from "blocks";

mount({ root, layout, schemes, look: "${shared}" });  // the app's own look
lookCode.decode("${shared}")   // { style, scheme: "paper" }; throws on a bad code
lookCode.encode(style, "paper")  // "${shared}"`;
const body =
  txt("f-intro", "One code carries a whole look: the style on every axis, and the name of a scheme pair. It is short enough for a link, a chat line or an app's config.") +
  sec("f-code", "The code", `<span class="lc lc-big">${painted(encode(looks.console.style, "console"))}</span>` +
    list("f-parts", [
      row("fp-v", "version", "one character; this reader takes 1", `<span class="lc"><span class="v">1</span></span>`, true),
      row("fp-x", "style", "5 characters, 0-9 a-z: the ten axes packed as one number", `<span class="lc"><span class="x">0lspy</span></span>`, true),
      row("fp-l", "labels", "~ then the role labels, URL-safe; left out when none", `<span class="lc"><span class="lb">~BAMv…</span></span>`, true),
      row("fp-s", "scheme", ". then a name; left out for blocks' own pair", `<span class="lc"><span class="sc">.console</span></span>`, true),
    ])) +
  sec("f-axes", "Style axes, in order", txt("f-axes-what", "Each axis is a digit of the number, in this order; its first value is the default. A newer blocks adds an axis as a higher digit, so every old code still reads the same. Space, radius and motion go in quarter steps; a style off a step has no code, and encoding it says which axis.") + list("f-axis-list", axisRows)) +
  sec("f-labels", "Labels", txt("f-labels-what", `For each decorated role, in this order: ${ROLES.join(", ")}. Each gives its case (${CASES.join(", ")}), its prefix and its suffix, as bytes, then all of it as URL-safe base64.`)) +
  sec("f-scheme", "Scheme", txt("f-scheme-what", "The part after the dot only names a pair: a swag pack, or the app's own look. blocks keeps no list of names and carries no colours. An app that has no pair by that name wears the style on blocks' own pair and says so.")) +
  sec("f-examples", "Examples", list("f-ex", examples)) +
  sec("f-use", "In an app", listing("rust", rust) + listing("ts", ts)) +
  sec("f-wrong", "When a code is wrong", txt("f-wrong-what", "Opening the site with a code it cannot read keeps the look you had. Each case shows one toast:") +
    toast("bad", "✕", "This look code is version 9; this site reads version 1. Your look is unchanged.") +
    toast("bad", "✕", "This look code was made by a newer blocks. Your look is unchanged.") +
    toast("warn", "!", "No scheme “dusk” here: wearing the shared style on the default colours.") +
    toast("bad", "✕", "“hello” is not a look code. Your look is unchanged."));
let fmt = styles.replace(/<title>[^<]*<\/title>/, "<title>Look code · blocks</title>").replace(/(<span class="tw b-screen__title">)styles/, "$1look code");
const start = fmt.indexOf('<div class="txt b b-text" data-block="text" data-id="intro"');
const end = fmt.indexOf('<div class="txt b b-text" data-block="text" data-id="foot"');
fmt = fmt.slice(0, start) + body + fmt.slice(end);
writeFileSync(`${here}/format.html`, withLook(fmt, "default"));
console.log(JSON.stringify(Object.fromEntries([...NAMES.map(([n]) => [n, codeOf(n)]), ["shared", shared]])));
