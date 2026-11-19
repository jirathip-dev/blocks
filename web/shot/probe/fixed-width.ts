import { declarations } from "../css.ts";

export const rule = "css/fixed-width";
export const sheet = (text) =>
  declarations(text)
    .filter(({ prop, value }) => (prop === "width" || prop === "min-width") && /^[\d.]+px$/.test(value) && parseFloat(value) > 390)
    .map(({ line, prop, value }) => ({ line, detail: `${prop}: ${value}` }));
