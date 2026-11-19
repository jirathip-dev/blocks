// Preview-only port of the `config` view, to draw these images; not product code. `show` pins a transient state: { saving: name, unsaved: name, sending: true }.
function config(b, show = {}) {
  const el = (t, cls, text) => { const e = document.createElement(t); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const root = el("div", "b b-config form cfg");
  root.dataset.id = b.id ?? "";
  for (const x of b.fields) {
    const row = el("label", `fd${x.type === "toggle" ? " tg" : ""}${x.error ? " err" : ""}${x.open ? " open" : ""}`);
    const left = el("span", "fl");
    left.append(el("span", "fk", x.label ?? x.name));
    const note = show.saving === x.name ? ["saving…", ""] : show.unsaved === x.name ? ["not saved", "err"]
      : x.error ? [x.error, "err"] : x.was != null ? [`was ${x.was}`, "was"] : x.doc ? [x.doc, ""] : null;
    if (note) left.append(el("span", `fn ${note[1]}`, note[0]));
    row.append(left);
    let i;
    if (x.type === "toggle") {
      i = el("input"); Object.assign(i, { type: "checkbox", checked: !!x.value }); i.setAttribute("role", "switch");
    } else if (x.type === "picker") {
      i = el("select");
      const opts = [...new Set([x.value, ...(x.options ?? [])].filter((o) => o != null && o !== ""))];
      for (const o of opts) i.append(Object.assign(el("option"), { value: o, textContent: o, selected: o === x.value }));
    } else {
      i = el("input");
      const kb = x.keyboard ?? "default";
      Object.assign(i, {
        type: x.type === "secret" ? "password" : kb === "url" ? "url" : "text",
        value: x.type === "secret" ? "" : String(x.value ?? ""),
        placeholder: x.type === "secret" && x.set ? "set ✓ · type to replace" : x.placeholder ?? (x.type === "secret" ? "not set" : ""),
        autocomplete: "off",
      });
      if (kb !== "default") i.inputMode = kb === "number" ? "decimal" : "url";
    }
    i.name = x.name;
    if (x.error) i.setAttribute("aria-invalid", "true");
    row.append(i);
    root.append(row);
  }
  const s = b.submit;
  if (s) {
    const bar = el("div", "bar");
    const go = el("button"); go.type = "button"; go.append(el("span", null, s.label));
    if (s.off) go.disabled = true;
    if (show.sending) go.setAttribute("aria-busy", "true");
    bar.append(go);
    root.append(bar);
  }
  return root;
}
