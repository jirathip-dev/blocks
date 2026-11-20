import { h } from "../shell.ts";

const RES = {
  json: /("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g,
  rust: /("(?:[^"\\]|\\.)*")|\b(\d[\d_]*(?:\.\d+)?(?:_?[uif](?:8|16|32|64|size))?)\b|\b(let|fn|pub|mut|move|if|else|match|for|in|return|use|Some|None|true|false|self|Self)\b|\b([A-Z]\w*)\b|\b([a-z_]\w*!)|([(){}[\],.;:|&?])/g,
};
const CLS = { json: ["s", "n", "l", "p"], rust: ["s", "n", "kw", "ty", "mc", "p"] };

/// `text` as spans classed by token, for the playground's own JSON and Rust highlighting.
export function paint(text: string, lang: "json" | "rust"): DocumentFragment {
  const f = document.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(RES[lang])) {
    const i = m.index ?? 0;
    f.append(text.slice(last, i));
    const g = m.findIndex((x, n) => n > 0 && x !== undefined);
    if (lang === "json" && g === 1 && m[2]) f.append(h("span", "k", m[1] ?? ""), h("span", "p", m[2]));
    else f.append(h("span", CLS[lang][lang === "json" && g > 2 ? g - 2 : g - 1] ?? "p", m[0]));
    last = i + m[0].length;
  }
  f.append(text.slice(last) + "\n");
  return f;
}
