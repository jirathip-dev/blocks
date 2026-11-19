// Preview-only port of the planned web/src/render/scene.ts, used to draw these images; not product code.
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const age = (since, now) => { const s = Math.max(0, (now - Date.parse(since)) / 1000); return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d`; };
function scene(b, now) {
  const root = h("div", "scn"); root.dataset.block = "scene"; if (b.id != null) root.dataset.id = b.id;
  if (b.label) root.append(h("div", "sh", b.label));
  const lanes = b.lanes ?? [];
  if (!lanes.length) return root;
  const ul = h("ul", "scl");
  for (const l of lanes) {
    const tap = l.tap ?? null;
    const x = h(tap?.url ? "a" : "div", `ln ${l.state}${tap ? " tap" : ""}`); x.dataset.id = l.id;
    if (tap?.url) x.href = tap.url; else if (tap) { x.setAttribute("role", "button"); x.tabIndex = 0; }
    x.setAttribute("aria-label", `${l.title}, ${l.state}`);
    const body = h("span", "lnb"), head = h("span", "lnh");
    head.append(h("span", "lnt", l.title), h("span", "lns", l.state));
    body.append(head);
    const meta = [l.stage, l.tool, l.since ? age(l.since, now) : null].filter((v) => v);
    if (meta.length) body.append(h("span", "lnx", meta.join(" · ")));
    x.append(h("i", "lnm"), body);
    const li = h("li"); li.append(x); ul.append(li);
  }
  root.append(ul);
  return root;
}
