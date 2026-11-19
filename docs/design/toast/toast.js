// Preview-only port used to draw these images; not product code.
// Preview fields (not wire): left (time left, 0..1), waiting (queued count), focus ("undo"|"close"), busy, held, inline.
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const GLYPH = { ok: "✓", warn: "!", bad: "×" };
function btn(label, cls, name) { const b = el("button", cls || ""); b.type = "button"; b.append(el("span", "", label)); if (name) b.setAttribute("aria-label", name); return b; }
function toast(b) {
  const tone = GLYPH[b.tone] ? b.tone : "";
  const t = el("div", "tst " + tone + (b.inline ? " inl" : "") + (b.held ? " held" : ""));
  t.setAttribute("role", tone === "bad" ? "alert" : "status");
  t.setAttribute("aria-label", b.text || b.fallback || "");
  const g = el("i", "tsg", GLYPH[tone] || ""); g.setAttribute("aria-hidden", "true");
  t.append(g, el("span", "tsx", b.text || b.fallback || ""));
  const n = el("span", "tsn", b.waiting ? "+" + b.waiting : ""); if (b.waiting) n.setAttribute("aria-label", b.waiting + " more"); t.append(n);
  if (b.undo && !b.inline) {
    const u = btn((b.undo.label || "undo") + (b.busy ? "…" : ""));
    if (b.busy) u.setAttribute("aria-busy", "true");
    if (b.focus === "undo") u.classList.add("fv");
    t.append(u);
  } else t.append(el("span"));
  if (!b.inline) {
    const c = btn("×", "tsc", "dismiss"); if (b.focus === "close") c.classList.add("fv"); t.append(c);
    if (tone !== "bad") { const k = el("span", "tsk"); k.setAttribute("aria-hidden", "true"); const f = el("b"); f.style.setProperty("--left", b.left == null ? 1 : b.left); k.append(f); t.append(k); }
  } else t.append(el("span"));
  return t;
}
function draw() {
  document.querySelectorAll("[data-b]").forEach(n => n.replaceWith(toast(JSON.parse(n.dataset.b))));
  document.querySelectorAll("[data-float]").forEach(n => { const host = el("div", "tsts"); host.setAttribute("aria-live", "polite"); host.append(toast(JSON.parse(n.dataset.float))); n.replaceWith(host); });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
