// Preview only: draws a row and its rounds the way these pages propose; impl writes web/src/render/row.ts itself.
function h(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
function line(row, open) {
  const main = h("span", "rm", h("span", "rt b-row__title", row.title));
  if (row.badge) main.append(" ", h("span", `tag b-row__badge ${row.badge.tone ?? ""}`, row.badge.text));
  const sub = typeof row.subtitle === "string" ? { text: row.subtitle } : row.subtitle;
  if (sub && !open) main.append(h("span", `rs b-row__subtitle ${sub.tone ?? ""}`, sub.text));
  const r = h("div", "row", main, row.value != null ? h("span", "rv b-row__value", row.value) : null);
  return r;
}
function round(rd, now) {
  const li = h("li", `rd ${rd.state}${now ? " now" : ""}`);
  const mark = h("i", "rdm");
  mark.setAttribute("aria-label", rd.state);
  const tap = !now && rd.tap;
  const l = h(tap && rd.tap.url ? "a" : "div", `rdl${tap ? " tap" : ""}`, h("span", "rdn", rd.name),
    h("span", "rdu", rd.summary ?? ""), rd.since ? h("span", "rdt", rd.since) : null, tap ? h("span", "rc", "›") : null);
  if (tap && !rd.tap.url) { l.tabIndex = 0; l.setAttribute("role", "button"); }
  const body = h("div", "rdx", l);
  if (now && (rd.lane || rd.blocks?.length || rd.links?.length)) {
    const b = h("div", "rdb");
    if (rd.lane) {
      const head = ["name", "harness", "model", "host"].map((k) => rd.lane[k]).filter(Boolean).join(" · ");
      const lines = rd.lane.lines ?? [];
      b.append(h("div", "rdh", head), h("div", "rdo", ...lines.map((t, i) =>
        rd.state === "working" && i === lines.length - 1 ? h("div", "live", `▍ ${t}`) : h("div", null, t))));
    }
    for (const k of rd.blocks ?? []) b.append(h("p", "txt", k.text));
    if (rd.links?.length) b.append(h("div", "rdk", ...rd.links.map((k) => h("button", null, h("span", null, k.label)))));
    body.append(b);
  }
  li.append(mark, body);
  return li;
}
function row(b, flipped = false) {
  const rounds = b.rounds ?? [];
  if (!rounds.length) return line(b, false);
  const open = (rounds[rounds.length - 1].state === "needs") !== flipped;
  const r = line(b, open);
  r.classList.add("tap");
  r.tabIndex = 0;
  r.setAttribute("role", "button");
  r.setAttribute("aria-expanded", String(open));
  r.append(h("span", "rc", "›"));
  const w = h("div", `rr${open ? " open" : ""}`, r);
  w.dataset.id = b.id ?? "";
  if (open) w.append(h("ol", "rds", ...rounds.map((rd, i) => round(rd, i === rounds.length - 1))));
  return w;
}
