// Preview-only port used to draw these images; not product code.
const WORDS = {
  en: { template: "download template", drop: "Drop a spreadsheet here", or: "or", pick: "choose file", hint: ".xlsx or .csv · up to {mb} MB", needs: "The file needs", may: "and may have", req: "required", another: "choose another file",
    rows: "{n} rows", sheet: "sheet", cols: "Columns", none: "— not in the file", skip: "Not imported: {list}", matched: "e.g. {s}", pickfor: "required: pick a column",
    preview: "Rows", sum: "Columns: {n} of {m} matched", change: "change", all: "all {n}", errs: "{n} with errors", more: "{n} more rows, all checked by the server", go: "import {n} rows", gonone: "nothing to import",
    left: "{n} rows with errors are left out", fix: "pick a column for {c}", ask: "Import {n} rows into {t}?", askm: "{left} rows with errors are left out. Your file is not changed.", back: "back", sending: "importing",
    done: "rows imported into {t}", leftout: "{n} rows were left out", leftdl: "download left-out rows", again: "import another file", row: "row",
    off: "import is off here", nojs: "Importing a file needs JavaScript. The template above works without it. The file needs these columns:", group: "{t}, import", up: "uploading {p} %", cancel: "cancel", reading: "reading the file on the server", checking: "checking the rows again with these columns", failed: "upload failed", retry: "retry", wait: "waiting for the server" },
  th: { template: "ดาวน์โหลดแม่แบบ", drop: "วางไฟล์สเปรดชีตที่นี่", or: "หรือ", pick: "เลือกไฟล์", hint: ".xlsx หรือ .csv · ไม่เกิน {mb} MB", needs: "ไฟล์ต้องมี", may: "และอาจมี", req: "ต้องมี", another: "เลือกไฟล์อื่น",
    rows: "{n} แถว", sheet: "ชีต", cols: "คอลัมน์", none: "— ไม่มีในไฟล์", skip: "ไม่นำเข้า: {list}", matched: "เช่น {s}", pickfor: "ต้องมี: เลือกคอลัมน์",
    preview: "แถว", sum: "คอลัมน์: ตรงกัน {n} จาก {m}", change: "เปลี่ยน", all: "ทั้งหมด {n}", errs: "มีข้อผิดพลาด {n}", more: "อีก {n} แถว เซิร์ฟเวอร์ตรวจแล้วทั้งหมด", go: "นำเข้า {n} แถว", gonone: "ไม่มีแถวให้นำเข้า",
    left: "ไม่นำเข้า {n} แถวที่มีข้อผิดพลาด", fix: "เลือกคอลัมน์สำหรับ {c}", ask: "นำเข้า {n} แถวไปที่ {t}?", askm: "ไม่นำเข้า {left} แถวที่มีข้อผิดพลาด ไฟล์ของคุณไม่เปลี่ยน", back: "ย้อนกลับ", sending: "กำลังนำเข้า",
    done: "แถวนำเข้าไปที่ {t} แล้ว", leftout: "ไม่ได้นำเข้า {n} แถว", leftdl: "ดาวน์โหลดแถวที่ไม่ได้นำเข้า", again: "นำเข้าไฟล์อื่น", row: "แถว",
    off: "นำเข้าไม่ได้ที่นี่", nojs: "การนำเข้าไฟล์ต้องใช้ JavaScript แม่แบบด้านบนใช้ได้โดยไม่ต้องใช้ ไฟล์ต้องมีคอลัมน์เหล่านี้:", group: "{t}, นำเข้า", up: "กำลังอัปโหลด {p} %", cancel: "ยกเลิก", reading: "เซิร์ฟเวอร์กำลังอ่านไฟล์", checking: "กำลังตรวจแถวอีกครั้งตามคอลัมน์นี้", failed: "อัปโหลดไม่สำเร็จ", retry: "ลองอีกครั้ง", wait: "รอเซิร์ฟเวอร์" },
};
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function say(w, key, v) { return (w[key] || key).replace(/\{(\w+)\}/g, (_, k) => v[k]); }
function btn(label, cls, name, off, busy) { const b = el("button", cls || ""); b.type = "button"; b.append(el("span", "", label)); if (name) b.setAttribute("aria-label", name); if (off) b.disabled = true; if (busy) b.setAttribute("aria-busy", "true"); return b; }
function link(label, href, name) { const a = el("a", "btn"); a.href = href || "#"; a.setAttribute("download", ""); a.append(el("span", "", label)); if (name) a.setAttribute("aria-label", name); return a; }
function n(v) { return Number(v).toLocaleString("en-US"); }
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function cell(c, v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && v.startsWith("?")) return v.slice(1);
  if (c.type === "money") return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c.type === "number") return n(v);
  if (c.type === "date") { const [y, m, d] = v.split("-").map(Number); return `${d} ${MON[m - 1]} ${y}`; }
  return String(v);
}
function phone(x, c) {
  const firstText = x.columns.find(k => k.type === "text" && k.key !== x.columns[0].key) || x.columns[0];
  if (c.key === firstText.key) return "p-title";
  if (c.type === "money") return "p-value";
  if (c.type === "choice") return "p-tag";
  return "p-meta";
}
function head(x, w) {
  const h = el("div", "imh");
  h.append(el("h3", "sh", x.title));
  if (x.phase !== "done" && !x.off) h.append(link(w.template, "/files/template-products.xlsx", `${w.template}: ${x.title}`));
  return h;
}
function needs(x, w) {
  const p = el("p", "imn");
  const req = x.columns.filter(c => c.required), opt = x.columns.filter(c => !c.required);
  p.append(w.needs + " ");
  req.forEach((c, i) => { if (i) p.append(", "); p.append(el("b", "", c.label)); });
  if (opt.length) p.append(` ${w.may} ` + opt.map(c => c.values ? `${c.label} (${c.values.join(", ")})` : c.label).join(", "));
  return p;
}
function empty(x, w) {
  const d = el("div", "imd" + (x.over ? " over" : ""));
  d.append(el("span", "", w.drop), el("span", "m", w.or), btn(w.pick, "", `${w.pick}: ${x.title}`, x.off));
  d.append(el("span", "m", x.off ? w.off : say(w, "hint", { mb: x.mb || 10 })));
  const input = el("input"); input.type = "file"; input.hidden = true; input.accept = ".xlsx,.csv"; d.append(input);
  return [d, needs(x, w)];
}
function fileLine(x, w) {
  const f = el("div", "imf" + (x.phase === "failed" ? " bad" : ""));
  const ext = el("span", "fux", x.file.name.split(".").pop()); ext.setAttribute("aria-hidden", "true");
  const m = el("span", "fum");
  m.append(el("span", "fun", x.file.name));
  const live = x.phase === "review";
  if (x.phase === "uploading") {
    const p = el("span", "pgt"); p.setAttribute("role", "progressbar"); p.setAttribute("aria-valuenow", String(x.p)); p.setAttribute("aria-label", say(w, "up", { p: x.p }));
    p.style.setProperty("--v", x.p); p.append(el("b")); m.append(p, el("span", "fus", `${x.file.size} · ` + say(w, "up", { p: x.p })));
    f.append(ext, m, btn(w.cancel, "", `${w.cancel}: ${x.file.name}`));
    return f;
  }
  if (x.phase === "reading") {
    m.append(el("span", "fus spin", `${x.file.size} · ${w.reading}`));
    f.append(ext, m, btn(w.cancel, "", `${w.cancel}: ${x.file.name}`));
    f.setAttribute("aria-busy", "true");
    return f;
  }
  if (x.phase === "failed") {
    m.append(el("span", "fus", `${x.file.size} · ${x.why || w.failed}`));
    const bar = el("span", "bar"); bar.append(btn(w.retry, "", `${w.retry}: ${x.file.name}`), btn(w.another));
    f.append(ext, m, bar);
    return f;
  }
  if (x.file.sheets) {
    const s = el("select"); s.setAttribute("aria-label", w.sheet); s.disabled = !live;
    x.file.sheets.forEach(t => s.append(Object.assign(el("option"), { textContent: `${w.sheet}: ${t}`, selected: t === x.file.sheet })));
    m.append(s);
  }
  m.append(el("span", "fus", say(w, "rows", { n: n(x.file.rows) }) + (x.file.sheets || !x.file.sheet ? "" : ` · ${w.sheet} ${x.file.sheet}`)));
  f.append(ext, m, btn(w.another, "", null, !live));
  return f;
}
function mapping(x, w) {
  const all = x.columns.every(c => !c.required || x.map[c.key]);
  const box = el("div", "imm" + (all ? " ok" : "") + (x.changed ? " open" : ""));
  box.append(el("h4", "sh", w.cols));
  const got = x.columns.filter(c => x.map[c.key]).length;
  const sum = el("p", "imc", say(w, "sum", { n: got, m: x.columns.length }) + (x.extra && x.extra.length ? " · " + say(w, "skip", { list: x.extra.join(", ") }) : ""));
  sum.append(btn(w.change, "", null, x.phase !== "review"));
  box.append(sum);
  const ul = el("ul", "iml");
  x.columns.forEach(c => {
    const got = x.map[c.key];
    const li = el("li", "imr" + (!got && c.required ? " no" : ""));
    const k = el("span", "imk", c.label + " ");
    if (c.required) k.append(el("i", "", w.req));
    const s = el("select"); s.setAttribute("aria-label", `${c.label}: column in the file`); s.disabled = x.phase !== "review";
    if (x.changed === c.key) li.classList.add("chg");
    [w.none, ...x.headers].forEach(hd => s.append(Object.assign(el("option"), { textContent: hd, selected: hd === (got || w.none) })));
    li.append(k, s, el("span", "ims", got ? say(w, "matched", { s: x.sample[c.key] }) : c.required ? w.pickfor : ""));
    ul.append(li);
  });
  box.append(ul);
  if (x.extra && x.extra.length) box.append(el("span", "m", say(w, "skip", { list: x.extra.join(", ") })));
  return box;
}
function preview(x, w) {
  const box = el("div", "imp");
  const t = el("div", "imt");
  t.append(el("h4", "sh", w.preview));
  if (x.errs) {
    const a = btn(say(w, "all", { n: n(x.file.rows) }), "", null, x.phase !== "review"); a.setAttribute("aria-pressed", String(x.show !== "errors"));
    const e = btn(say(w, "errs", { n: x.errs }), "bad", null, x.phase !== "review"); e.setAttribute("aria-pressed", String(x.show === "errors"));
    t.append(a, e);
  }
  box.append(t);
  const tbl = el("div", "tbl"), wrap = el("div", "tbw"), table = el("table");
  const cap = el("caption", "", `${x.title}: ${w.preview}`); table.append(cap);
  const thead = el("thead"), hr = el("tr");
  hr.append(el("th", "imn0", "#"));
  x.columns.forEach(c => hr.append(el("th", ["money", "number"].includes(c.type) ? "end" : "", c.label)));
  thead.append(hr); table.append(thead);
  const body = el("tbody");
  const rows = x.show === "errors" ? x.rows.filter(r => r.bad) : x.rows;
  rows.forEach(r => {
    const tr = el("tr", r.bad ? "imo" : "");
    const nc = el("td", "imn0 p-meta", String(r.n)); nc.dataset.l = w.row; tr.append(nc);
    x.columns.forEach(c => {
      const v = (x.was || x.map)[c.key] ? cell(c, r.cells[c.key]) : null;
      const bad = r.bad && r.bad[c.key];
      const td = el("td", [phone(x, c), ["money", "number"].includes(c.type) ? "end" : "", bad ? "bad" : "", v == null && !bad ? "nil" : ""].filter(Boolean).join(" "), v == null ? (bad ? "(empty)" : "—") : v);
      if (phone(x, c) === "p-meta") td.dataset.l = c.label;
      tr.append(td);
    });
    body.append(tr);
    if (r.bad) {
      const ex = el("tr", "imx"), td = el("td", "", Object.entries(r.bad).map(([k, m]) => `${x.columns.find(c => c.key === k).label}: ${m}`).join(" · "));
      td.colSpan = x.columns.length + 1; ex.append(td); body.append(ex);
      tr.setAttribute("aria-describedby", "");
    }
  });
  const hidden = x.show === "errors" ? 0 : x.file.rows - x.rows.length;
  if (hidden > 0) { const q = el("tr", "imq"), td = el("td", "", say(w, "more", { n: n(hidden) })); td.colSpan = x.columns.length + 1; q.append(td); body.append(q); }
  table.append(body); wrap.append(table); tbl.append(wrap); box.append(tbl);
  return box;
}
function actions(x, w) {
  const bar = el("div", "ima" + (x.phase === "ask" ? " ask" : ""));
  const missing = x.columns.find(c => c.required && !x.map[c.key]);
  const good = x.file.rows - (x.errs || 0);
  if (x.phase === "ask") {
    const p = el("p", "", say(w, "ask", { n: n(good), t: x.into }));
    if (x.errs) p.append(el("span", "m", say(w, "askm", { left: x.errs })));
    bar.append(p, btn(w.back), btn(say(w, "go", { n: n(good) })));
    return bar;
  }
  if (missing) bar.append(el("span", "say-busy bad", say(w, "fix", { c: missing.label })));
  else if (x.errs) bar.append(el("span", "say-busy", say(w, "left", { n: x.errs })));
  if (x.phase === "checking") { bar.textContent = ""; bar.append(el("span", "say-busy", w.checking), btn(w.wait, "", null, true, true)); return bar; }
  if (x.phase === "sending") bar.append(btn(w.sending, "", null, true, true));
  else bar.append(btn(!good ? w.gonone : say(w, "go", { n: n(good) }), "", null, !!missing || !good));
  return bar;
}
function done(x, w) {
  const z = el("div", "imz");
  z.append(el("b", "ok", n(x.done.n)), el("span", "", say(w, "done", { t: x.into })));
  if (x.done.left) z.append(el("span", "m", say(w, "leftout", { n: x.done.left })));
  const bar = el("div", "bar");
  if (x.done.left) bar.append(link(w.leftdl, "/files/left-out-rows.xlsx"));
  bar.append(btn(w.again));
  z.append(bar);
  return z;
}
function imp(x) {
  const w = WORDS[x.lang || "en"];
  const busy = ["sending", "checking"].includes(x.phase);
  const s = el("section", "im" + (busy ? " busy" : ""));
  s.setAttribute("aria-label", say(w, "group", { t: x.title }));
  if (busy) s.setAttribute("aria-busy", "true");
  s.append(head(x, w));
  if (x.error) s.append(el("p", "fe", x.error));
  if (x.phase === "static") {
    const p = el("p", "imn", w.nojs); p.style.marginTop = "var(--s3)";
    const req = el("p", "imn"); req.append(...x.columns.flatMap((c, i) => [i ? ", " : "", el(c.required ? "b" : "span", "", c.label)]));
    s.append(p, req);
  } else if (x.phase === "empty") s.append(...empty(x, w));
  else if (["uploading", "reading", "failed"].includes(x.phase)) { s.append(fileLine(x, w), needs(x, w)); s.lastChild.style.marginTop = "var(--s3)"; }
  else if (x.phase === "done") s.append(fileLine(x, w), done(x, w));
  else {
    s.append(fileLine(x, w));
    const b = el("div", "imb"); b.append(mapping(x, w), preview(x, w)); s.append(b);
    s.append(actions(x, w));
  }
  return s;
}
function draw() {
  document.querySelectorAll("[data-i]").forEach(node => {
    const x = Object.assign({}, BASES[node.dataset.base || "PRODUCTS"], JSON.parse(node.dataset.i || "{}"));
    node.replaceWith(imp(x));
  });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
