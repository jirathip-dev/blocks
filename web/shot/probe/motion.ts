import { declarations } from "../css.ts";

const CHEAP = ["transform", "opacity"];

export const rule = "css/motion";
export const sheet = (text) =>
  declarations(text)
    .flatMap(({ line, prop, value, under }) => {
      if (under.some((u) => u.startsWith("@keyframes"))) return CHEAP.includes(prop) ? [] : [{ line, detail: `${prop} in ${under.at(-2)}` }];
      if (prop !== "transition" && prop !== "transition-property") return [];
      return value.split(",").map((p) => p.trim().split(/\s+/)[0]).filter((p) => !CHEAP.includes(p) && !/^[\d.]+m?s$/.test(p) && p !== "none").map((p) => ({ line, detail: `${prop}: ${p}` }));
    });
