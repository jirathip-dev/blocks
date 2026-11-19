const bare = (text) => text.replace(/[/][*][\s\S]*?[*][/]/g, (c) => c.replace(/[^\n]/g, " "));
const line = (text, i) => text.slice(0, i).split("\n").length;

/// Each declaration of a stylesheet outside comments, with its line, and the selectors or at-rules it sits under.
export function declarations(text) {
  const css = bare(text), out = [], open = [];
  let from = 0;
  for (const m of css.matchAll(/[{};]/g)) {
    const chunk = css.slice(from, m.index), colon = chunk.indexOf(":");
    if (m[0] === "{") open.push(chunk.trim());
    else if (colon > 0) out.push({ line: line(css, from + chunk.search(/\S/)), prop: chunk.slice(0, colon).trim().toLowerCase(), value: chunk.slice(colon + 1).trim(), under: open.slice() });
    if (m[0] === "}") open.pop();
    from = m.index + 1;
  }
  return out;
}

/// Each selector of a stylesheet outside comments, with its line.
export const selectors = (text) =>
  Array.from(bare(text).matchAll(/(?:^|[{};])([^{};@]+)\{/g), (m) => ({ line: line(text, m.index + m[0].length - 1 - m[1].trimStart().length), selector: m[1].trim() }));
