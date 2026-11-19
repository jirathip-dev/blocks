/* Preview-only port used to draw these images, not product code: builds the `editor` DOM impl writes in web/src/render/editor.ts. */
function editor(b, o = {}) {
  const first = b.first ?? 1;
  const lines = b.text.split("\n");
  const errs = new Map();
  for (const e of b.errors ?? []) if (!errs.has(e.line)) errs.set(e.line, e.message);
  const root = document.createElement("div");
  root.className = "ed b b-editor";
  root.dataset.block = "editor";
  if (b.id) root.dataset.id = b.id;
  const note = (t, cls) => Object.assign(document.createElement("p"), { className: cls, textContent: t });
  if (o.editing) {
    root.classList.add("on");
    const ta = document.createElement("textarea");
    Object.assign(ta, { name: b.name, value: o.draft ?? b.text, spellcheck: false });
    ta.setAttribute("aria-label", b.name);
    root.append(ta);
    for (const [n, m] of [...errs].sort((x, y) => x[0] - y[0])) root.append(note(`line ${n} · ${m}`, "ede"));
    return root;
  }
  root.tabIndex = 0;
  root.setAttribute("role", "button");
  root.setAttribute("aria-label", `edit ${b.name}`);
  if (o.focus) root.style.outline = "2px solid var(--l)", root.style.outlineOffset = "-2px";
  lines.forEach((t, i) => {
    const n = first + i;
    const r = document.createElement("div");
    r.className = errs.has(n) ? "edl err" : "edl";
    const num = document.createElement("i");
    num.textContent = n;
    const s = document.createElement("span");
    s.textContent = t || " ";
    r.append(num, s);
    root.append(r);
    if (errs.has(n)) root.append(note(errs.get(n), "ede"));
  });
  const last = first + lines.length - 1;
  for (const [n, m] of [...errs].sort((x, y) => x[0] - y[0])) if (n < first || n > last) root.append(note(`line ${n} · ${m}`, "ede far"));
  return root;
}
