/* A port used only to draw these previews; `state`, `focus`, `hover` and `pull` fake runtime state and are not wire fields. */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}
function cap(n) { return n > 99 ? "99+" : String(n); }
function badge(b) {
  if (!b) return null;
  const said = b.tone === "bad" ? `${b.count} need attention` : `${b.count} new`;
  return h("span", { class: "tag" + (b.tone === "bad" ? " bad" : ""), "aria-label": said }, cap(b.count));
}
function icon(l) {
  if (!l.icon) return h("i", { class: "sdi", "aria-hidden": "true" }, (l.label || "·").slice(0, 1).toUpperCase());
  return h("i", { class: "sdi" + (l.icon.length > 1 && /^[A-Z]{2}$/.test(l.icon) ? " av" : ""), "aria-hidden": "true" }, l.icon);
}
function label(l) {
  return h("span", { class: "sdl", title: l.label }, l.label || "", l.sub ? h("small", {}, l.sub) : null);
}
function link(l, s, sub) {
  const cls = "sdk" + (s.focus === l.href ? " fv" : "") + (s.hover === l.href ? " hv" : "");
  return h("a", { class: cls, href: l.href || "#", "aria-current": l.current ? "page" : null, title: s.state === "rail" ? l.label : null }, sub ? null : icon(l), label(l), badge(l.badge));
}
function parent(l, s, gi, li) {
  const id = `${s.id}-g${gi}-${li}`;
  const open = !!l.open;
  const inner = l.children.some(c => c.current);
  const btn = h("button", { type: "button", class: "sdk" + (inner ? " in" : "") + (s.focus === l.label ? " fv" : ""), "aria-expanded": String(open), "aria-controls": id }, icon(l), label(l), badge(l.badge), h("i", { class: "sdc", "aria-hidden": "true" }, open ? "▾" : "▸"));
  const kids = h("ul", { class: "sdsub", id, hidden: !open }, l.children.map(c => h("li", {}, link(c, s, true))));
  return h("li", {}, btn, kids);
}
function sidebar(s) {
  const st = s.state || "rail";
  const brand = s.brand ? h("a", { class: "sdk sdb", href: s.brand.href || "#" }, icon(s.brand), label(s.brand)) : null;
  const pin = h("button", { type: "button", class: "sdpin" + (s.focus === "pin" ? " fv" : ""), "aria-pressed": String(st === "pinned"), "aria-label": st === "pinned" ? "unpin sidebar" : "pin sidebar" }, h("span", {}, st === "pinned" ? "unpin" : "pin"));
  const close = h("button", { type: "button", class: "sdx", "aria-label": "close menu" }, h("span", {}, "×"));
  const groups = (s.groups || []).map((g, gi) => h("section", { class: "sdgr", "aria-labelledby": g.title ? `${s.id}-t${gi}` : null },
    g.title ? h("h3", { class: "sdgt", id: `${s.id}-t${gi}` }, g.title) : null,
    h("ul", {}, g.links.map((l, li) => l.children ? parent(l, s, gi, li) : h("li", {}, link(l, s))))));
  const empty = (s.groups || []).every(g => !g.links.length) ? h("p", { class: "sdgt", style: "padding:var(--s3)" }, s.empty || "No pages yet") : null;
  const foot = (s.footer || []).length ? h("div", { class: "sdf" }, h("ul", {}, s.footer.map(l => h("li", {}, link(l, s))))) : null;
  const nav = h("nav", { class: "b-side", id: s.id, "aria-label": s.label || "main", "data-side": st, style: s.pull !== undefined ? `--pull:${s.pull}` : null },
    h("div", { class: "sdh" }, brand, pin, close), h("div", { class: "sdg" }, groups, empty), foot);
  return nav;
}
function draw() {
  for (const el of document.querySelectorAll("[data-side-spec]")) {
    const s = JSON.parse(el.getAttribute("data-side-spec"));
    const hash = location.hash.slice(1);
    const phone = { closed: 0, swipe: 0.6, drawer: 1 };
    if (hash && el.hasAttribute("data-live")) {
      s.state = hash in phone ? "drawer" : hash;
      if (hash in phone) s.pull = phone[hash];
    }
    el.replaceWith(sidebar(s));
  }
  const main = document.querySelector(".b-sidemain");
  if (main && location.hash === "#pinned") main.classList.add("pinned");
  const scrim = document.querySelector(".b-sidescrim");
  if (scrim) {
    const p = location.hash === "#drawer" ? 1 : location.hash === "#swipe" ? 0.6 : 0;
    scrim.style.setProperty("--pull", String(p));
    scrim.classList.toggle("on", p > 0);
  }
  const menu = document.querySelector(".b-sidebar button");
  if (menu) menu.setAttribute("aria-expanded", String(location.hash === "#drawer"));
  for (const n of document.querySelectorAll(".fv")) n.style.outline = "var(--ring) solid var(--l)", n.style.outlineOffset = "calc(-1 * var(--ring))";
  for (const n of document.querySelectorAll(".hv")) n.style.background = "var(--bg)";
  document.body.dataset.h = String(Math.ceil(document.documentElement.scrollHeight));
}
