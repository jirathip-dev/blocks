/* Preview-only port of `more` on table and list, over ../table/table.js. Its `wait`, `fresh`, `focus`, `said` and `grip` fields fake runtime state for the images; they are not wire fields. Not product code. */
const live = (text) => { const p = h("p", "b-sr"); p.setAttribute("aria-live", "polite"); p.textContent = text ?? ""; return p; };
const heard = (text) => h("p", "said", h("span", "", "screen reader hears "), `“${text}”`);
function moreRow(wait, span, tr = "tr", cell = "td") {
  const t = h(tr, `${tr === "tr" ? "tbmo" : "lsm"}${wait === "failed" ? " no" : ""}`);
  const kids = wait === "failed" ? [h("span", "", "Couldn’t load more."), btn("load more")] : wait === "paused" ? [h("span", "", "more below · loads once the row is placed")] : [h("span", "tbmw", "Loading more")];
  if (tr !== "tr") { t.append(...kids); return t; }
  const td = h(cell); td.colSpan = span; td.append(...kids); t.append(td); return t;
}
function moreTable(b, st = {}) {
  const root = table(b, st);
  const body = root.querySelector("tbody"), n = b.rows.length;
  const shownRows = body.querySelectorAll("tr:not(.tbe)").length;
  const sel = (st.sel ?? []).length;
  const tbn = root.querySelector(".tbh .tbn");
  for (const id of st.fresh ?? []) body.querySelector(`tr[data-id="${id}"]`)?.classList.add("chg");
  if (st.focus) body.querySelector(`tr[data-id="${st.focus}"]`)?.classList.add("fx");
  if (st.grip) {
    root.classList.add("ed");
    root.querySelector("thead tr").prepend(h("th", "tbg"));
    root.querySelector("tfoot tr")?.prepend(h("td", "tbg"));
    for (const tr of body.querySelectorAll("tr")) { const g = h("td", "tbg"); const hd = btn("≡", "b-hd"); hd.textContent = "≡"; if (tr.dataset.id === st.grip) { hd.dataset.phase = "dragging"; tr.classList.add("lift"); } g.append(hd); tr.prepend(g); }
  }
  if (b.more && st.js !== false) {
    root.querySelector("table").setAttribute("aria-busy", String(st.wait !== "failed" && st.wait !== "paused"));
    body.append(moreRow(st.wait, root.querySelector("thead tr").children.length));
    if (sel) tbn.textContent = `of ${n} loaded`;
    else if (st.q) tbn.textContent = `${shownRows} of ${n} loaded`;
    else if (st.sort) tbn.textContent = `${n} loaded, more below · sorted among these`;
    else tbn.textContent = `${n} loaded, more below`;
    const tot = root.querySelector("tfoot th");
    if (tot) tot.append(h("span", "tbml", st.q ? `of ${shownRows} shown` : `of ${n} loaded`));
  }
  root.append(live(st.said));
  return root;
}
function row(r) {
  const e = h("div", `row b b-row${r.tap !== false ? " tap" : ""}`, h("span", "rm", h("span", "rt", r.title), r.subtitle ? h("span", `rs${r.tone ? " " + r.tone : ""}`, r.subtitle) : null), r.value ? h("span", "rv", r.value) : null);
  e.dataset.id = r.id;
  return e;
}
function moreList(rows, st = {}) {
  const l = h("div", "list b b-list");
  l.dataset.block = "list";
  l.append(...rows.map(row));
  for (const id of st.fresh ?? []) l.querySelector(`[data-id="${id}"]`)?.classList.add("chg");
  if (st.focus) l.querySelector(`[data-id="${st.focus}"]`)?.classList.add("fx");
  if (st.more !== false) { l.setAttribute("aria-busy", String(st.wait !== "failed")); l.append(moreRow(st.wait, 0, "div")); }
  l.append(live(st.said));
  return l;
}
function failToast(text, fixed) {
  const g = h("i", "tsg", "×"); g.setAttribute("aria-hidden", "true");
  const x = btn("×", "tsc"); x.setAttribute("aria-label", "dismiss");
  const t = h("div", "tst bad", g, h("span", "tsx", text), x);
  t.setAttribute("role", "alert");
  return fixed ? h("div", "tsts", t) : t;
}
function scrolled(vp, height) {
  vp.style.height = `${height}px`;
  vp.scrollTop = vp.scrollHeight;
  document.body.dataset.h = height;
}
