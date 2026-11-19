// Preview-only port of what web/src/render/diff.ts draws; not product code.
function diff(b) {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const root = el("div", "df b b-diff");
  root.dataset.block = "diff";
  if (b.id != null) root.dataset.id = b.id;
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", b.file);
  const head = el("div", "dfh");
  head.append(el("span", "dff", b.file));
  if (b.summary != null) head.append(el("span", "dfs", b.summary));
  root.append(head);
  if (b.hunks.length === 0) return root;
  const body = el("div", "dfb");
  for (const h of b.hunks) {
    body.append(el("div", "dfk", h.at));
    for (const line of h.lines) {
      const kind = line[0] === "+" ? "add" : line[0] === "-" ? "del" : "ctx";
      const row = el("div", "dfl " + kind);
      row.append(el("i", "dfm", line.slice(0, 1) || " "), line.slice(1));
      body.append(row);
    }
  }
  root.append(body);
  return root;
}
