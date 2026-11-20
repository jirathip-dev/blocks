// Preview-only: the kind page's sample tile with its Rust | JSON tabs and the playground link.
import { editor, h, samples, seg } from "./play.js";

const s = samples.find((x) => x.name === "stat");
const rust = s.rust.map((r) => {
  const ed = editor({ text: r.code, lang: "rust", readonly: true, rows: 30 });
  ed.first(r.from);
  const a = h("a", null, `${r.file}:${r.from}–${r.to}`);
  a.href = `https://github.com/jirathip-dev/blocks/blob/main/${r.file}#L${r.from}-L${r.to}`;
  return h("div", "pg-src", h("p", "pg-path", a), ed.el);
});
const json = editor({ text: s.json, lang: "json", readonly: true, rows: 30 });
const rustBox = h("div", "pg-rust", ...rust);
json.el.hidden = true;
const tabs = seg("", [["rust", "Rust"], ["json", "JSON"]], "rust", (t) => {
  rustBox.hidden = t !== "rust";
  json.el.hidden = t !== "json";
});
const open = h("a", "pg-open", "edit in the playground →");
open.href = "playground.html?k=stat";
const tile = h(
  "div",
  "pg-tabbed",
  h("div", "pg-head", tabs, h("span", "pg-gap"), open),
  rustBox,
  json.el,
  h("p", "pg-from", "Both cut at build time: the Rust from the source, the JSON from what that Rust makes."),
);
document.getElementById("tabbed").replaceWith(tile);
document.body.dataset.h = String(document.documentElement.scrollHeight);
