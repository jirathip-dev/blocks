/* Preview-only port of `table` with `edit`, `reorder` and `calc`, used to draw these mockups. Not product code. Needs ../table/table.js. */
function evalx(e, cells) {
  if (typeof e === "number") return e;
  if (e.get !== undefined) return blank(cells[e.get]) ? null : Number(cells[e.get]);
  const [op, args] = Object.entries(e)[0];
  const vs = args.map((a) => evalx(a, cells));
  if (vs.some((v) => v === null || Number.isNaN(v))) return null;
  if (op === "add") return vs.reduce((a, v) => a + v, 0);
  if (op === "mul") return vs.reduce((a, v) => a * v, 1);
  if (op === "sub") return vs.slice(1).reduce((a, v) => a - v, vs[0]);
  if (op === "div") return vs.slice(1).reduce((a, v) => (a === null || v === 0 ? null : a / v), vs[0]);
  return null;
}
function parse(c, text) {
  if (!numeric(c)) return { ok: true, v: text };
  const t = text.replace(/[,\s]/g, "");
  if (t === "") return { ok: true, v: null };
  const v = Number(t);
  return Number.isFinite(v) ? { ok: true, v } : { ok: false, why: c.kind === "money" ? "not an amount" : "not a number" };
}
const kindOf = (b, c) => (b.calc?.[c.id] ? "fx" : c.edit ? "ed" : numeric(c) ? "app" : "plain");
function worked(b, row, held) {
  const cells = { ...row.cells, ...held };
  if (!row.group) for (const [k, e] of Object.entries(b.calc ?? {})) cells[k] = evalx(e, cells);
  return cells;
}
function groupsOf(rows) {
  const out = [];
  for (const r of rows) {
    if (r.group || !out.length) out.push({ head: r.group ? r : null, items: [] });
    if (!r.group) out[out.length - 1].items.push(r);
  }
  return out;
}
const say = (s) => h("span", "b-sr", s);

function grid(b, st = {}) {
  const js = st.js !== false;
  const live = js && !st.off;
  const hidden = st.hidden ?? [];
  const cols = b.columns.filter((c, i) => i === 0 || !js || !hidden.includes(c.id));
  const role = roles(cols);
  const sort = js ? st.sort ?? null : null;
  const q = js ? st.q ?? "" : "";
  const sent = st.sent ?? {};
  const key = (r, c) => `${r}:${c}`;
  const held = (r) => {
    const o = {};
    for (const [k, v] of Object.entries(sent)) { const [rid, cid] = k.split(":"); if (rid === r.id) o[cid] = v; }
    if (st.edit && st.edit.row === r.id) { const p = parse(b.columns.find((c) => c.id === st.edit.col), st.edit.text); if (p.ok) o[st.edit.col] = p.v; }
    return o;
  };
  const waits = (r) => Object.keys(sent).some((k) => k.startsWith(`${r.id}:`));
  const byId = Object.fromEntries(b.rows.map((r) => [r.id, r]));
  const base = st.order ? st.order.map((id) => byId[id]) : b.rows;
  const cells = Object.fromEntries(b.rows.map((r) => [r.id, worked(b, r, held(r))]));
  const asRow = (r) => ({ ...r, cells: cells[r.id] });
  const groups = groupsOf(base).map((g) => {
    const kept = g.items.filter((r) => matches(cols, asRow(r), q));
    return { ...g, all: g.items, items: sorted(cols, kept.map(asRow), sort).map((r) => byId[r.id]) };
  }).filter((g) => g.items.length || !q);
  const items = b.rows.filter((r) => !r.group);
  const shownItems = groups.flatMap((g) => g.items);
  const handles = live && b.reorder && !sort && !q;
  const pick = js && b.select && items.length;
  const sel = pick ? (st.sel ?? []).filter((id) => shownItems.some((r) => r.id === id)) : [];
  const n = items.length;
  const max = {};
  const appWait = (rs) => rs.some(waits);

  const root = h("div", `tbl b b-table${sel.length ? " bulk" : ""}${live && (b.edit || b.reorder) ? " ed" : ""}`);
  root.dataset.block = "table";
  root.dataset.id = b.id;
  const head = h("div", "tbh");
  const all = pick && shownItems.length && sel.length === shownItems.length;
  if (pick) { const k = box(all, sel.length > 0 && !all, "Select all shown rows"); k.className = "tbk"; head.append(k); }
  if (sel.length) {
    head.append(h("b", "tbt", `${sel.length} selected`));
    for (const a of b.select.actions) head.append(btn(a.label, a.bad ? "bad" : ""));
    head.append(h("span", "tbn"));
  } else {
    const count = q ? `${shownItems.length} of ${n} rows` : `${n} ${n === 1 ? "row" : "rows"}`;
    const why = live && b.reorder && !handles ? ` · ${sort ? "sorted" : "filtered"}, so rows stay put` : st.off ? ` · ${st.off}` : "";
    head.append(b.title ? h("b", "tbt", b.title) : null, h("span", "tbn", count + why));
  }
  if (js && n && !sel.length) {
    if (sort && b.reorder && live) head.append(btn("as sent"));
    const input = h("input", "tbq");
    input.type = "search";
    input.placeholder = "filter";
    input.value = q;
    input.setAttribute("aria-label", `Filter ${b.title ?? "rows"}`);
    head.append(input);
    const s = h("select", "tbs");
    s.setAttribute("aria-label", "Sort");
    const o = h("option", "", sort ? `sort: ${cols.find((c) => c.id === sort.by).label.toLowerCase()} ${arrow(sort.dir)}` : "sort: as sent");
    s.append(o);
    head.append(s);
    head.append(btn(hidden.length ? `columns · ${hidden.length} hidden` : "columns"));
  }
  if (js && n && b.export?.length) head.append(btn(b.export.length === 1 ? `export ${FMT[b.export[0]].toLowerCase()}` : "export"));
  if (sel.length) head.append(btn("clear"));
  root.append(head);

  const t = h("table");
  if (live && (b.edit || b.reorder)) t.setAttribute("role", "grid");
  t.append(h("caption", "", b.title ?? "Table"));
  const hr = h("tr");
  if (handles) hr.append(h("th", "tbg", say("Move")));
  if (pick) { const th = h("th", "tbc"); th.append(box(all, sel.length > 0 && !all, "Select all shown rows")); hr.append(th); }
  for (const c of cols) {
    const th = h("th", `${align(c)} k-${c.kind}`);
    th.scope = "col";
    sized(th, c);
    const on = sort && sort.by === c.id;
    if (on) th.setAttribute("aria-sort", sort.dir === "asc" ? "ascending" : "descending");
    const u = unit(c);
    const label = [h("span", "", c.label), u ? h("span", "tbu", u) : null, h("i", "", on ? arrow(sort.dir) : "")];
    if (js) { const x = h("button", "tsh", ...label.filter(Boolean)); x.type = "button"; th.append(x); } else th.append(...label.filter(Boolean));
    hr.append(th);
  }
  t.append(h("thead", "", hr));

  const lifted = new Set();
  if (st.lift) {
    lifted.add(st.lift.id);
    const g = groupsOf(base).find((x) => x.head?.id === st.lift.id);
    if (g) g.items.forEach((r) => lifted.add(r.id));
  }
  const liftIds = [...lifted];
  const edge = (id) => (id === liftIds[0] ? " lt" : "") + (id === liftIds[liftIds.length - 1] ? " lb" : "");
  const body = h("tbody");
  const name = (r) => String(r.cells[cols[0].id] ?? r.id);
  const draw = (r, g) => {
    const tr = h("tr", [r.group ? "grp" : "", st.chg?.includes(r.id) ? "chg" : "", sel.includes(r.id) ? "sel" : "", lifted.has(r.id) ? `lift ${st.lift.phase}${edge(r.id)}` : ""].join(" ").replace(/\s+/g, " ").trim());
    tr.dataset.id = r.id;
    if (handles) {
      const td = h("td", "tbg");
      if (!r.fixed) {
        const hd = h("button", "b-hd", "≡");
        hd.type = "button";
        hd.setAttribute("aria-label", `Move ${name(r)}`);
        if (st.lift?.id === r.id) hd.dataset.phase = st.lift.phase;
        td.append(hd);
      }
      tr.append(td);
    }
    if (pick) { const td = h("td", "tbc"); if (!r.group) td.append(box(sel.includes(r.id), false, `Select ${name(r)}`)); tr.append(td); }
    cols.forEach((c, i) => {
      const k = kindOf(b, c);
      const td = h("td", `${align(c)} k-${c.kind} p-${r.group && role[c.id] === "meta" ? "meta" : role[c.id]}`);
      td.dataset.l = c.label;
      sized(td, c);
      if (r.group) {
        if (i === 0) td.append(String(r.cells[c.id] ?? ""), h("span", "tbgn", `${g.all.length}`));
        else if (c.total && c.total !== "count") {
          const [, v] = total(c, g.items.map(asRow));
          td.append(v);
          if (k === "app" && appWait(g.items)) td.classList.add("wait");
        } else td.classList.add("nil");
        tr.append(td);
        return;
      }
      const v = cells[r.id][c.id];
      const editing = live && b.edit && st.edit?.row === r.id && st.edit?.col === c.id;
      const isSent = sent[key(r.id, c.id)] !== undefined;
      if (editing) {
        const p = parse(c, st.edit.text);
        const input = h("input", "tbi");
        input.value = st.edit.text;
        input.setAttribute("aria-label", `${c.label}, ${name(r)}`);
        td.classList.add("cur", "ing");
        td.append(h("span", "tbf", ...cell(c, v ?? st.edit.text, max[c.id])), input);
        if (!p.ok) { td.classList.add("bad"); input.setAttribute("aria-invalid", "true"); td.append(h("span", "tbx", p.why)); }
      } else if (live && b.edit && k === "ed" && !r.fixed) {
        td.append(h("span", "tbf", ...cell(c, v, max[c.id])));
        if (isSent) { td.classList.add("sent"); td.setAttribute("aria-busy", "true"); }
      } else td.append(...cell(c, v, max[c.id]));
      if (k === "fx") td.setAttribute("aria-readonly", "true");
      if (k === "app" && waits(r)) td.classList.add("wait");
      if (st.edit?.row === r.id && k === "fx" && st.edit.col !== c.id) td.classList.add("lv");
      if (st.cursor?.row === r.id && st.cursor?.col === c.id) td.classList.add("cur");
      if (st.refused?.row === r.id && st.refused?.col === c.id) td.classList.add("no");
      if (blank(v) && !editing) td.classList.add("nil");
      tr.append(td);
    });
    return tr;
  };
  for (const g of groups) {
    if (g.head) body.append(draw(g.head, g));
    for (const r of g.items) body.append(draw(r, g));
  }
  if (!shownItems.length) {
    const td = h("td", "");
    td.colSpan = cols.length + (pick ? 1 : 0) + (handles ? 1 : 0);
    if (n) td.append(`No rows match “${q}”. `, btn("clear"));
    else td.append(b.empty ?? "No rows yet.");
    body.append(h("tr", "tbe", td));
  }
  t.append(body);

  if (shownItems.length && cols.some((c) => c.total)) {
    const fr = h("tr");
    if (handles) fr.append(h("td", "tbg"));
    if (pick) fr.append(h("td", "tbc"));
    cols.forEach((c, i) => {
      if (i === 0) { const th = h("th", "p-title", "Total"); th.scope = "row"; fr.append(th); return; }
      const td = h("td", `${align(c)} k-${c.kind} p-${role[c.id] === "title" ? "meta" : role[c.id]}`);
      td.dataset.l = c.label;
      if (c.total) {
        const [w, v] = total(c, shownItems.map(asRow));
        if (w) td.append(h("span", "agg", w), " ");
        td.append(v);
        if (kindOf(b, c) === "app" && appWait(shownItems)) td.classList.add("wait");
        if (kindOf(b, c) === "fx" && st.edit) td.classList.add("lv");
      } else td.classList.add("nil");
      fr.append(td);
    });
    t.append(h("tfoot", "", fr));
  }
  root.append(h("div", "tbw", t));
  return root;
}

function sheet(b, id, st = {}) {
  const r = b.rows.find((x) => x.id === id);
  const g = groupsOf(b.rows).find((x) => x.items.includes(r));
  const sent = st.sent ?? {};
  const heldv = {};
  for (const [k, v] of Object.entries(sent)) if (k.startsWith(`${id}:`)) heldv[k.split(":")[1]] = v;
  if (st.edit) { const p = parse(b.columns.find((c) => c.id === st.edit.col), st.edit.text); if (p.ok) heldv[st.edit.col] = p.v; }
  const cells = worked(b, r, heldv);
  const waiting = Object.keys(sent).some((k) => k.startsWith(`${id}:`));
  const card = h("div", "b-sheet__card");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", `Edit ${r.cells.name}`);
  const pos = g ? `${g.head ? g.head.cells.name + " · " : ""}${g.items.indexOf(r) + 1} of ${g.items.length}` : "";
  card.append(h("div", "b-sheet__head", h("b", "b-sheet__title", r.cells.name, h("span", "m shp", pos)), btn("done")));
  for (const c of b.columns) {
    const k = kindOf(b, c);
    const u = unit(c);
    const label = h("span", "fk", c.label, u ? h("span", "tbu", u) : null);
    const row = h("label", `fd shf ${align(c)}`, label);
    if (k === "ed" && !r.fixed) {
      const editing = st.edit?.col === c.id;
      const text = editing ? st.edit.text : sent[`${id}:${c.id}`] !== undefined ? shown(c, sent[`${id}:${c.id}`]) : shown(c, r.cells[c.id]);
      const input = h("input");
      input.value = text;
      row.append(input);
      if (editing) { row.classList.add("ing"); const p = parse(c, text); if (!p.ok) { row.classList.add("bad"); row.append(h("span", "fe", p.why)); } }
      if (sent[`${id}:${c.id}`] !== undefined) { row.classList.add("sent"); input.setAttribute("aria-busy", "true"); }
      if (st.refused?.col === c.id) row.classList.add("no");
    } else {
      const v = h("span", "shv", ...cell(c, cells[c.id], 1));
      if (k === "app" && waiting) row.classList.add("wait");
      if (k === "fx" && st.edit) row.classList.add("lv");
      row.append(v);
    }
    card.append(row);
  }
  const s = h("div", "b-sheet shb inl", card);
  return s;
}
