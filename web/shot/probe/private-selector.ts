import { hooks } from "../../src/gen/hooks.ts";
import { selectors } from "../css.ts";

const OWN = new Set(Object.entries(hooks).flatMap(([k, h]) => [`b-${k}`, ...h.parts.map((p) => `b-${k}__${p}`)]));

export const rule = "css/private-selector";
export const sheet = (text) =>
  selectors(text).flatMap(({ line, selector }) => Array.from(selector.matchAll(/\.(b-[\w-]+)/g), (m) => m[1]).filter((c) => !OWN.has(c)).map((c) => ({ line, detail: `.${c} in ${selector}` })));
