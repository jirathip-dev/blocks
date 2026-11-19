import { stripTypeScriptTypes } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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
  statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => files(join(p, f))) : /\.(ts|css)$/.test(p) ? [p] : [];

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
  if (path.endsWith(".css")) return lintCss(path, src);
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
