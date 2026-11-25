// Preview-only: draws each screen with the real renderer, then splits it as impl would; not product code.
import { plain, render } from "../../../web/dist/blocks.js";

const ctx = { screen: "side", act: async () => false, tap: () => {}, open: new Set(), theme: plain, store: { get: () => null, put: () => {} }, held: new Map(), view: new Map() };

function split(s, b) {
  const side = new Set((b.blocks ?? []).filter((x) => x.type === "section" && x.side === true).map((x) => String(x.id)));
  const kids = Array.from(s.children).filter((e) => !e.matches(".tabh"));
  const aside = kids.filter((e) => e.matches("section.sec") && side.has(e.dataset.id));
  const rest = kids.filter((e) => !aside.includes(e));
  if (!aside.length || !rest.length) return s;
  const main = document.createElement("div");
  main.className = "scr-main";
  main.append(...rest);
  const col = document.createElement("aside");
  col.className = "scr-side";
  col.setAttribute("aria-label", aside.map((e) => e.getAttribute("aria-label")).join(", "));
  col.append(...aside);
  const cols = document.createElement("div");
  cols.className = "scr-cols";
  cols.append(main, col);
  s.classList.add("split");
  s.append(cols);
  return s;
}

for (const t of document.querySelectorAll("script[type='application/json'][data-screen]")) {
  const b = JSON.parse(t.textContent);
  const e = render(b, ctx);
  if (e) t.replaceWith(split(e, b));
}
document.body.dataset.h = String(document.documentElement.scrollHeight);
