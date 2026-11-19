import { stripTypeScriptTypes } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const typed = [
  [/^as\s+(?!const\b)/, "an `as` cast (only `as const`)"],
  [/^!/, "a non-null `!`"],
  [/\bany\b(?!\??\s*:)/, "`any`"],
];
const code = [
  [/@ts-(ignore|expect-error)\b/, "`@ts-ignore` / `@ts-expect-error`"],
  [/\.(innerHTML|outerHTML)\b|\binsertAdjacentHTML\b/, "raw HTML (`innerHTML`, `outerHTML`, `insertAdjacentHTML`)"],
  [/\beval\s*\(|\bnew\s+Function\b/, "`eval` / `new Function`"],
  [/\bconsole\.log\b/, "`console.log`"],
  [/\bexport\s+default\b/, "a default export"],
];

const files = (p) =>
  statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => files(join(p, f))) : /\.(ts|css|swift)$/.test(p) ? [p] : [];

const root = join(import.meta.dirname, "..");
const tokensAt = (f) => readFileSync(join(root, "ci/tokens", f), "utf8").split("\n").filter(Boolean);
const allowed = new Set(tokensAt("allowed.txt").map((l) => l.split(" ").slice(0, 2).join(" ")));
const baseline = tokensAt("baseline.txt");
const colours = "white|black|red|green|blue|gray|grey|yellow|orange|purple|pink|cyan|magenta|teal|navy|silver|maroon|olive|lime|aqua|fuchsia|mint|indigo|brown";
const raws = {
  css: [
    new RegExp(`#[0-9a-f]{3,8}\\b|(?<![\\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\([^)]*\\)|(?<![\\w-])(?:${colours})(?![\\w-])`, "gi"),
    /(?<![\w#.-])-?(?:\d*\.)?\d+(?:px|r?em|ch|ex|[dsl]?v[hw]|vmin|vmax|cq[whib]|%|m?s)(?![\w-])/g,
  ],
  swift: [
    new RegExp(`\\bColor\\((?:red|white|hue|\\.sRGB|\\.displayP3)|\\.hex\\(\\w*|#colorLiteral|(?<![\\w)\\]])\\.(?:${colours})\\b|\\bColor\\.(?:${colours})\\b`, "g"),
    /(?:\b(?:spacing|width|height|minWidth|maxWidth|minHeight|maxHeight|idealWidth|idealHeight|minLength|radius|cornerRadius|lineWidth|size|duration|horizontalSpacing|verticalSpacing|rowGap|gap|gutter|least|x|y|top|bottom|leading|trailing|horizontal|vertical):\s*|\.(?:padding|ui|offset|blur|cornerRadius|milliseconds|seconds)\((?:\.\w+,\s*)?)-?\d+(?:\.\d+)?\b/g,
  ],
};

function rawValues(path, src) {
  const out = [];
  const push = (lang, what, raw, i) => {
    const zero = /^-?[\d.]+[a-z%]*$/i.test(raw) && Number.parseFloat(raw) === 0;
    if (!zero && !allowed.has(`${lang} ${raw}`)) out.push([what.replace(/\s+/g, " "), lineOf(src, i)]);
  };
  if (path.endsWith(".swift")) {
    for (const re of raws.swift) for (const m of src.matchAll(re)) push("swift", m[0], m[0].match(/-?[\d.]+$/)?.[0] ?? m[0], m.index);
    return out;
  }
  const body = src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/:root\s*\{[^}]*\}/g, (r) => r.replace(/--[\w-]+\s*:[^;}]*/g, (d) => " ".repeat(d.length)));
  for (const d of body.matchAll(/(?<=[{;]\s*)([\w-]+)\s*:([^;{}]*)(?=[;}])/g))
    for (const re of raws.css) for (const m of d[2].matchAll(re)) push("css", `${d[1]} ${m[0]}`, m[0], d.index);
  return out;
}

function lintTokens(path, src) {
  const at = relative(root, resolve(path));
  if (allowed.has(`file ${at}`) || at.includes("/gen/")) return [];
  const left = new Map();
  for (const l of baseline) if (l.startsWith(`${at} `)) left.set(l.slice(at.length + 1), (left.get(l.slice(at.length + 1)) ?? 0) + 1);
  const bad = [];
  for (const [what, line] of rawValues(path, src)) {
    if (left.get(what)) left.set(what, left.get(what) - 1);
    else bad.push(`${path}:${line}: raw \`${what}\` (use a scheme or style token; ci/tokens/allowed.txt lists the exceptions)`);
  }
  for (const [what, n] of left)
    for (let k = 0; k < n; k++) bad.push(`${path}: ci/tokens/baseline.txt lists \`${at} ${what}\`, gone from the file: shrink the baseline`);
  return bad;
}

const lineOf = (src, i) => src.slice(0, i).split("\n").length;

const moves = (p) => p === "transform" || p === "opacity" || p === "none";

function lintCss(path, src) {
  const bad = [];
  const at = (i, what) => bad.push(`${path}:${lineOf(src, i)}: motion of \`${what}\` (animate only transform and opacity)`);
  for (const m of src.matchAll(/\btransition(?:-property)?\s*:([^;}]+)/g))
    for (const item of m[1].split(/,(?![^(]*\))/)) if (!moves(item.trim().split(/[\s!]+/)[0])) at(m.index, item.trim());
  for (const m of src.matchAll(/@keyframes[^{]*\{/g)) {
    let depth = 1, i = m.index + m[0].length, from = i;
    for (; i < src.length && depth; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
    for (const d of src.slice(from, i).matchAll(/([\w-]+)\s*:/g)) if (!moves(d[1])) at(m.index, d[1]);
  }
  return bad;
}

function lint(path) {
  const src = readFileSync(path, "utf8");
  if (path.endsWith(".swift")) return lintTokens(path, src);
  if (path.endsWith(".css")) return [...lintCss(path, src), ...lintTokens(path, src)];
  let js;
  try {
    js = stripTypeScriptTypes(src, { mode: "strip" });
  } catch (e) {
    return [`${path}: ${e.message} (no \`enum\`: use a union or an \`as const\` object)`];
  }
  const bad = [];
  for (let i = 0; i < src.length; i++) {
    if (js[i] === src[i]) continue;
    let j = i;
    while (j < src.length && /\s/.test(js[j]) && (js[j] !== src[j] || /\s/.test(src[j]))) j++;
    const t = src.slice(i, j).trim();
    for (const [re, what] of typed) if (re.test(t)) bad.push(`${path}:${lineOf(src, i)}: ${what}: \`${t}\``);
    i = j;
  }
  src.split("\n").forEach((l, n) => {
    for (const [re, what] of code) if (re.test(l)) bad.push(`${path}:${n + 1}: ${what}`);
  });
  return bad;
}

const bad = process.argv.slice(2).flatMap(files).flatMap(lint);
for (const b of bad) process.stderr.write(`${b}\n`);
process.stdout.write(`ts-lint: ${bad.length} violations\n`);
process.exit(bad.length ? 1 : 0);
