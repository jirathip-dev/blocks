// Preview-only port used to draw these images; not product code.
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function said(n, x) { const t = String(Number(n.toFixed(6))); return x.unit ? t + " " + x.unit : t; }
function slider(x) {
  const step = x.step ?? 1, now = x.value ?? x.min;
  const box = el("div", "fs" + (x.look ? " " + x.look : ""));
  const v = el("output", "fsv"), t = el("span", "fst"), b = el("span", "fsb"), ends = el("span", "fse");
  t.append(el("b")); ends.append(el("span", "", said(x.min, x)), el("span", "", said(x.max, x)));
  [v, t, b, ends].forEach(n => n.setAttribute("aria-hidden", "true"));
  const i = el("input");
  Object.assign(i, { type: "range", name: x.name, min: x.min, max: x.max, step, value: now, disabled: x.enabled === false });
  i.setAttribute("aria-label", x.label);
  const paint = () => {
    const n = Number(i.value);
    box.style.setProperty("--v", (n - x.min) / (x.max - x.min));
    v.textContent = said(n, x);
    i.setAttribute("aria-valuetext", v.textContent);
  };
  i.oninput = paint;
  i.onchange = () => { const s = document.getElementById("sent"); if (s && x.live) s.textContent = `${x.live} { ${x.name}: ${i.value} }`; };
  paint();
  box.append(i, v, t, b, ends);
  if (x.error) box.append(el("span", "fe", x.error));
  return box;
}
function row(x) {
  const kind = x.type === "slider" ? " sl" : x.type === "toggle" ? " tg" : "";
  const l = el(x.type === "slider" ? "div" : "label", "fd" + kind + (x.error ? " err" : ""));
  const fl = el("span", "fl"); fl.append(el("span", "fk", x.label), el("span", "fn", x.doc || ""));
  l.append(fl);
  if (x.type === "slider") l.append(slider(x));
  else if (x.type === "toggle") { const i = el("input"); i.type = "checkbox"; i.checked = !!x.value; i.setAttribute("role", "switch"); l.append(i); }
  else if (x.type === "picker") { const s = el("select"); (x.options || []).forEach(o => { const p = el("option", "", o); p.selected = o === x.value; s.append(p); }); l.append(s); }
  else { const i = el("input"); i.value = x.value || ""; i.placeholder = x.placeholder || ""; l.append(i); }
  return l;
}
function form(b) {
  const f = el("div", "form"); f.dataset.id = b.id || "";
  b.fields.forEach(x => f.append(row({ ...x, live: b.action })));
  if (b.submit) { const r = el("div", "acts"); const s = el("button"); s.type = "button"; s.append(el("span", "", b.submit)); r.append(s); f.append(r); }
  return f;
}
function draw() {
  document.querySelectorAll("[data-f]").forEach(n => n.replaceWith(form(JSON.parse(n.dataset.f))));
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
