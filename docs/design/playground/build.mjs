// Preview-only: builds the real site into a temp folder, then writes the mockup's inputs from it:
// site.css and tokens.css (the site's own design system), samples.js (every gallery sample as a
// screen's JSON, plus its Rust cut from the source the site builds it with).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const out = mkdtempSync(join(tmpdir(), "site-"));
execFileSync("cargo", ["run", "-q", "-p", "blocks-site", "--", out], { cwd: root, stdio: "inherit" });

const unesc = (s) =>
  s.replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

writeFileSync(join(here, "site.css"), readFileSync(join(out, "site.css"), "utf8"));
const stat = readFileSync(join(out, "kind-stat.html"), "utf8");
writeFileSync(join(here, "tokens.css"), stat.match(/<style>([\s\S]*?)<\/style>/)[1] + "\n");
const looks = unesc(stat.match(/data-looks="([^"]*)"/)[1]);

const sources = ["site/src/kinds.rs", "crates/blocks/src/kind/sample.rs"].map((f) => ({
  file: f,
  lines: readFileSync(join(root, f), "utf8").split("\n"),
}));

function cut(id) {
  for (const s of sources) {
    const at = s.lines.findIndex((l) => l.includes(`.id("${id}")`) || l.includes(`id: "${id}".into()`));
    if (at < 0) continue;
    let from = at;
    while (from > 0 && !/^\s*(b!\(|let |Block::|vec!\[)/.test(s.lines[from])) from--;
    let depth = 0;
    let to = from;
    for (; to < s.lines.length; to++) {
      for (const c of s.lines[to]) depth += "([{".includes(c) ? 1 : ")]}".includes(c) ? -1 : 0;
      if (depth <= 0 && to >= at) break;
    }
    const pad = Math.min(...s.lines.slice(from, to + 1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    const code = s.lines.slice(from, to + 1).map((l) => l.slice(pad)).join("\n").replace(/,$/, "");
    return { file: s.file, from: from + 1, to: to + 1, code };
  }
  return null;
}

const indent = (t, n) => t.split("\n").map((l) => " ".repeat(n) + l).join("\n");
const screen = (id, blocks) =>
  `{\n  "type": "screen",\n  "id": "${id}",\n  "blocks": [\n${blocks.map((b) => indent(b, 4)).join(",\n")}\n  ]\n}`;

const samples = [];
const home = JSON.parse(readFileSync(join(out, "index.html"), "utf8").match(/id="blocks-screen"[^>]*>([\s\S]*?)<\/script>/)[1]);
home.blocks = home.blocks.filter((b) => b.id !== "site-top" && b.id !== "foot");
samples.push({ name: "home", json: JSON.stringify(home, null, 2), rust: null });
const kinds = readdirSync(out)
  .filter((f) => /^kind-.*\.html$/.test(f))
  .map((f) => f.slice(5, -5));
const order = JSON.parse(readFileSync(join(out, "gallery.html"), "utf8").match(/id="blocks-screen"[^>]*>([\s\S]*?)<\/script>/)[1]);
const seen = JSON.stringify(order).match(/"kind-[a-z]+"/g)?.map((s) => s.slice(6, -1)) ?? [];
const ranked = [...new Set([...seen.filter((k) => kinds.includes(k)), ...kinds])];
for (const k of ranked) {
  const page = readFileSync(join(out, `kind-${k}.html`), "utf8");
  const code = unesc(page.match(/<code class="lang-json">([\s\S]*?)<\/code>/)[1]);
  const blocks = code.split(/\n(?=\{)/);
  const ids = blocks.map((b) => JSON.parse(b).id).filter(Boolean);
  const cuts = ids.map(cut).filter(Boolean);
  samples.push({ name: k, json: screen(k, blocks), rust: cuts.length ? cuts : null });
}
writeFileSync(
  join(here, "samples.js"),
  `export const looks = ${looks};\nexport const samples = ${JSON.stringify(samples, null, 1)};\n`,
);
console.log(`${samples.length} samples, ${samples.filter((s) => s.rust).length} with Rust`);

const kindPage = stat
  .replace('<link rel="stylesheet" href="blocks.css">', '<link rel="stylesheet" href="../../../web/dist/blocks.css">')
  .replace('<link rel="stylesheet" href="site.css">', '<link rel="stylesheet" href="site.css"><link rel="stylesheet" href="playground.css">')
  .replace('<a href="layout.html">layout</a>', '<a href="layout.html">layout</a><a href="playground.html">playground</a>')
  .replace(/(<h3 class="sh ">The sample<\/h3>)[\s\S]*?(<\/section><\/section><section class="sec b b-section" data-block="section" data-id="pair-hooks")/, '$1<div id="tabbed"></div>$2')
  .replace(/<script type="application\/vnd.blocks\+json" id="blocks-screen"[\s\S]*?<\/script>/, "")
  .replace('<script type="module" src="blocks.js"></script>', '<script type="module" src="kind.js"></script>');
if (!kindPage.includes('id="tabbed"')) throw new Error("kind-stat.html: the sample tile moved");
writeFileSync(join(here, "kind-stat.html"), kindPage);
