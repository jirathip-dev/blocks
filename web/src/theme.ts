import { css } from "./core/look.ts";
import type { Scheme } from "./gen/schemes.ts";
import type { Figure } from "./gen/types.ts";

export type ThemeJson = { label: string; scheme: { dark: string; light: string }; sprites: boolean; moments: boolean; words: Record<string, string> };
export type Theme = { figure(f: Figure): Node | null; word(key: string, plain: string): Node; css(s: Scheme): string };

const NS = "http://www.w3.org/2000/svg";
const GLYPH: Record<string, string> = { working: "●", needs: "!", fail: "✗", done: "✓", merged: "✓", idle: "○" };
const WORD: Record<string, string> = { working: "working", needs: "needs you", fail: "failed", done: "done", merged: "merged", idle: "idle" };
const TONE: Record<string, string> = { working: "g", needs: "r", fail: "r", done: "mute", idle: "mute", merged: "g" };

export { css, tiles } from "./core/look.ts";

const tag = (name: string, cls: string, text = "") => {
  const e = document.createElement(name);
  e.className = cls;
  e.textContent = text;
  return e;
};

function shown(f: Figure, art: Node | null): Node {
  const s = String(f.state);
  const word = WORD[s] ?? s;
  const box = tag("span", `rsg ${s}`);
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", word);
  box.title = word;
  box.append(art ?? tag("i", `gl ${TONE[s] ?? "mute"}`, GLYPH[s] ?? "·"));
  return box;
}

function said(key: string, plain: string, words: Record<string, string>): Node {
  const w = Object.prototype.hasOwnProperty.call(words, key) ? words[key] : "";
  if (!w) return document.createTextNode(plain);
  const out = document.createDocumentFragment();
  out.append(tag("b", "thw", w), tag("small", "pw", ` · ${plain}`));
  return out;
}

/// The theme with no art: each state's glyph and the plain words.
export const plain: Theme = { figure: (f) => shown(f, null), word: (k, p) => said(k, p, {}), css };

/// The port over a swag pack at `base`: its `s-<state>` sprites once `sprites.svg` has loaded, else the glyphs; its words.
export function packs(look: { theme: ThemeJson; base: string }): Theme {
  const art = new Map<string, Element>();
  if (look.theme.sprites)
    fetch(`${look.base}sprites.svg`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => new DOMParser().parseFromString(t, "image/svg+xml").querySelectorAll("symbol[id]").forEach((s) => art.set(s.id, s)))
      .catch(() => undefined);
  const sprite = (f: Figure): Node | null => {
    const s = art.get(`s-${f.state === "working" ? (f.tool ?? "run") : f.state}`);
    if (!s) return null;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "rsp");
    svg.setAttribute("viewBox", s.getAttribute("viewBox") ?? "0 0 132 100");
    svg.setAttribute("aria-hidden", "true");
    svg.append(...Array.from(s.cloneNode(true).childNodes));
    return svg;
  };
  return { figure: (f) => shown(f, sprite(f)), word: (k, p) => said(k, p, look.theme.words), css };
}
