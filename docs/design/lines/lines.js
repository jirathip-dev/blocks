/* Preview-only port used to draw these images, not product code: builds the `lines` DOM impl writes in web/src/render/lines.ts. */
function lines(b, o = {}) {
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const scale = b.scale ?? 2;
  const sums = new Set(b.sum ?? []);
  const num = (c) => sums.has(c.name) || c.keyboard === "number";
  const minor = (v) => Math.round(Number(String(v ?? "").replace(/,/g, "")) * 10 ** scale) || 0;
  const money = (m) => (m / 10 ** scale).toLocaleString("en-US", { minimumFractionDigits: scale, maximumFractionDigits: scale });
  const rows = b.rows ?? [];
  const min = b.min ?? 0;
  const fixed = b.add === undefined;
  const cols = ["3ch", ...b.columns.map((c) => (sums.has(c.name) ? "14ch" : num(c) ? "10ch" : c.type === "picker" ? "minmax(0,1.4fr)" : "minmax(0,2fr)"))];
  if (!fixed) cols.push("32px");
  const root = el("div", "lq b b-lines");
  root.dataset.block = "lines";
  if (b.id) root.dataset.id = b.id;
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", b.label ?? b.name);
  root.style.setProperty("--lq-cols", cols.join(" "));
  const head = el("div", "lqh");
  head.setAttribute("aria-hidden", "true");
  head.append(el("span"));
  for (const c of b.columns) head.append(el("span", num(c) ? "num" : "", c.label ?? c.name));
  if (!fixed) head.append(el("span"));
  root.append(head);
  const errs = b.errors ?? [];
  if (!rows.length) root.append(el("p", "lqz", b.empty ?? "no lines yet"));
  rows.forEach((r, i) => {
    const n = i + 1;
    const mine = errs.filter((e) => e.row === r.id);
    const row = el("div", mine.length ? "lqr err" : "lqr");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", `line ${n}`);
    row.append(el("i", "lqn", String(n)));
    for (const c of b.columns) {
      const v = r.values?.[c.name];
      const cell = el("label", "lqc" + (num(c) ? " num" : "") + (c.enabled === false ? " ro" : "") + (mine.some((e) => e.name === c.name) ? " err" : ""));
      cell.append(el("span", "lqk", c.label ?? c.name));
      if (c.enabled === false) {
        cell.append(el("span", "lqv", v === undefined || v === "" ? "—" : sums.has(c.name) ? money(minor(v)) : String(v)));
      } else if (c.type === "picker") {
        const s = el("select");
        s.name = `${b.name}.${i}.${c.name}`;
        s.setAttribute("aria-label", `${c.label ?? c.name}, line ${n}`);
        const blank = el("option", "", c.placeholder ?? "choose…");
        blank.value = "";
        s.append(blank, ...(c.options ?? []).map((t) => Object.assign(el("option", "", t), { value: t })));
        s.value = v ?? "";
        if (o.focus === `${r.id}.${c.name}`) s.style.outline = "2px solid var(--l)", s.style.outlineOffset = "-1px";
        cell.append(s);
      } else {
        const inp = el("input");
        Object.assign(inp, { name: `${b.name}.${i}.${c.name}`, value: v === undefined || v === "" ? "" : sums.has(c.name) ? money(minor(v)) : String(v), placeholder: c.placeholder ?? "" });
        if (num(c)) inp.inputMode = "decimal";
        inp.setAttribute("aria-label", `${c.label ?? c.name}, line ${n}`);
        if (o.focus === `${r.id}.${c.name}`) inp.style.outline = "2px solid var(--l)", inp.style.outlineOffset = "-1px";
        cell.append(inp);
      }
      row.append(cell);
    }
    if (!fixed) {
      const x = el("button", "lqx");
      x.type = "button";
      x.append(el("span", "", "×"));
      x.setAttribute("aria-label", `remove line ${n}`);
      x.disabled = rows.length <= min;
      row.append(x);
    }
    root.append(row);
    for (const e of mine) root.append(el("p", "lqe", e.message));
  });
  for (const e of errs.filter((e) => !e.row)) root.append(el("p", "lqe", e.message));
  if (!fixed) {
    const a = el("div", "lqa");
    const add = el("button");
    add.type = "button";
    add.append(el("span", "", b.add));
    add.disabled = b.max !== undefined && rows.length >= b.max;
    a.append(add);
    root.append(a);
  }
  const total = {};
  for (const s of sums) total[s] = rows.reduce((t, r) => t + minor(r.values?.[s]), 0);
  let off = false;
  if (sums.size) {
    const t = el("div", "lqt");
    t.append(el("span"));
    let label = false;
    for (const c of b.columns) {
      if (sums.has(c.name)) {
        const s = el("span", "num");
        s.append(el("span", "tk", c.label ?? c.name), el("b", "", money(total[c.name])));
        t.append(s);
      } else if (!label) {
        t.append(el("span", "tl", "total")), (label = true);
      } else t.append(el("span"));
    }
    if (!fixed) t.append(el("span"));
    root.append(t);
  }
  if (b.balance) {
    const [d, c] = b.balance;
    const gap = total[d] - total[c];
    off = gap !== 0;
    const lab = (k) => (b.columns.find((x) => x.name === k)?.label ?? k).toLowerCase();
    const p = el("p", off ? "lqb off" : "lqb ok", off ? `out of balance · ${gap > 0 ? lab(c) : lab(d)} short by ${money(Math.abs(gap))}` : `balanced · ${lab(d)} = ${lab(c)}`);
    p.setAttribute("role", "status");
    root.append(p);
  }
  if (b.submit) {
    const ra = el("div", "ra");
    const rowErrs = new Set(errs.filter((e) => e.row).map((e) => e.row)).size;
    const why = rowErrs ? `fix ${rowErrs === 1 ? "1 line" : `${rowErrs} lines`}` : errs.length ? "fix the error" : "";
    const why2 = off ? "balance the entry" : "";
    const note = [why, why2].filter(Boolean).join(" and ");
    if (note) ra.append(el("p", "m lqw", `${note} to ${b.submit.label}`));
    const s = el("button");
    s.type = "button";
    s.append(el("span", "", b.submit.label));
    s.disabled = Boolean(note) || b.submit.off === true;
    if (o.busy) s.setAttribute("aria-busy", "true");
    ra.append(s);
    root.append(ra);
  }
  return root;
}
