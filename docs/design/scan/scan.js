// Preview-only port used to draw these images; not product code.
const WORDS = {
  en: { cancel: "cancel", pick: "pick images", title: "{label}", page: "page {n}", of: "page {n} of {of}", seek: "looking for the page's edges", found: "page found: hold still and take it",
    none: "no page edge found: fill the frame with the page, or take it and set the corners by hand", take: "take page {n}", done1: "done · 1 page", doneN: "done · {n} pages",
    retake: "retake", use: "use page", reset: "reset corners", drag: "drag a corner onto the page's edge; arrow keys move the focused one",
    tl: "top-left corner", tr: "top-right corner", br: "bottom-right corner", bl: "bottom-left corner", corners: "corners", rotate: "rotate", del: "delete",
    earlier: "move earlier", later: "move later", add: "add page", making: "making the PDF · page {n} of {of}", sizing: "about {kb} KB",
    nocam: "no camera here", nocamWhy: "pick photos of the pages instead: each one gets its corners found the same way", limit: "{n} of {n} pages: the most one scan takes",
    review: "review", strip: "pages, in order", denied: "the camera is blocked for this site", deniedWhy: "allow it in the browser's settings, or pick photos of the pages" },
  th: { cancel: "ยกเลิก", pick: "เลือกรูป", title: "{label}", page: "หน้า {n}", of: "หน้า {n} จาก {of}", seek: "กำลังหาขอบกระดาษ", found: "พบหน้ากระดาษ: ถือนิ่งๆ แล้วถ่าย",
    none: "ไม่พบขอบกระดาษ: ให้กระดาษเต็มกรอบ หรือถ่ายแล้วตั้งมุมเอง", take: "ถ่ายหน้า {n}", done1: "เสร็จ · 1 หน้า", doneN: "เสร็จ · {n} หน้า",
    retake: "ถ่ายใหม่", use: "ใช้หน้านี้", reset: "คืนมุมเดิม", drag: "ลากมุมไปที่ขอบกระดาษ",
    tl: "มุมบนซ้าย", tr: "มุมบนขวา", br: "มุมล่างขวา", bl: "มุมล่างซ้าย", corners: "มุม", rotate: "หมุน", del: "ลบ",
    earlier: "เลื่อนขึ้น", later: "เลื่อนลง", add: "เพิ่มหน้า", making: "กำลังทำ PDF · หน้า {n} จาก {of}", sizing: "ประมาณ {kb} KB",
    nocam: "ไม่มีกล้อง", nocamWhy: "เลือกรูปของแต่ละหน้าแทน", limit: "{n} จาก {n} หน้า: สแกนได้มากที่สุดเท่านี้", review: "ตรวจ", strip: "หน้าตามลำดับ",
    denied: "กล้องถูกปิดสำหรับเว็บนี้", deniedWhy: "เปิดได้ในการตั้งค่าเบราว์เซอร์ หรือเลือกรูปของแต่ละหน้า" },
};
const QUAD = { note: [[64, 58], [252, 84], [274, 350], [34, 334]], form: [[48, 70], [238, 52], [262, 330], [58, 356]], slip: [[90, 40], [230, 60], [250, 372], [60, 360]] };
const NS = "http://www.w3.org/2000/svg";
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function sv(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function say(w, key, v = {}) { return (w[key] || key).replace(/\{(\w+)\}/g, (_, k) => v[k]); }
function btn(label, cls, name, off) { const b = el("button", cls || ""); b.type = "button"; if (label != null) b.append(el("span", "", label)); if (name) b.setAttribute("aria-label", name); if (off) b.disabled = true; return b; }
function viewport(x, w) {
  const v = el("div", "snv " + (x.step === "adjust" ? "adjust" : x.found === false ? "seek" : "found"));
  v.setAttribute("role", "img");
  const img = el("img"); img.src = `cam-${x.cam}.svg`; img.alt = ""; img.setAttribute("aria-hidden", "true"); v.append(img);
  const q = x.quad || QUAD[x.cam];
  const s = sv("svg", { viewBox: "0 0 300 400", preserveAspectRatio: "none", "aria-hidden": "true" });
  if (x.step === "adjust") s.append(sv("path", { class: "snm", d: `M0 0H300V400H0Z M${q.map(p => p.join(" ")).join("L")}Z` }));
  if (x.found !== false || x.step === "adjust") s.append(sv("polygon", { class: "snq", points: (x.found === false && x.step !== "adjust" ? [[30, 40], [270, 40], [270, 360], [30, 360]] : q).map(p => p.join(",")).join(" ") }));
  else s.append(sv("polygon", { class: "snq", points: "24,32 276,32 276,368 24,368" }));
  v.append(s);
  v.setAttribute("aria-label", x.step === "adjust" ? say(w, "drag") : x.found === false ? w.none : w.found);
  if (x.step === "adjust") {
    ["tl", "tr", "br", "bl"].forEach((k, i) => {
      const c = btn(null, "snc" + (x.drag === i ? " drag" : ""), w[k]);
      c.setAttribute("role", "slider"); c.setAttribute("aria-valuetext", `${Math.round(q[i][0] / 3)} %, ${Math.round(q[i][1] / 4)} %`);
      c.style.left = (q[i][0] / 3) + "%"; c.style.top = (q[i][1] / 4) + "%"; c.append(el("i")); v.append(c);
    });
    if (x.drag != null) {
      const l = el("div", "snl"); l.setAttribute("aria-hidden", "true");
      const z = el("img"); z.src = `cam-${x.cam}.svg`; z.alt = "";
      const [cx, cy] = q[x.drag]; const k = 3;
      l.style.left = `clamp(calc(var(--hit) * 1.25 + var(--s1)), ${cx / 3}%, calc(100% - var(--hit) * 1.25 - var(--s1)))`;
      l.style.top = cy > 200 ? `calc(${cy / 4}% - var(--hit) * 3.5)` : `calc(${cy / 4}% + var(--hit))`;
      z.dataset.cx = cx; z.dataset.cy = cy; z.dataset.k = k;
      l.append(z); v.append(l);
    }
  }
  return v;
}
function strip(x, w) {
  const ol = el("ol", "snr"); ol.setAttribute("aria-label", w.strip);
  const order = x.pages || [];
  order.forEach((p, i) => {
    if (x.gap === i) { const g = el("li", "gap"); g.setAttribute("aria-hidden", "true"); ol.append(g); }
    const li = el("li", (x.sel === i ? "sel" : "") + (x.lift === i ? " lift" : ""));
    const b = btn(null, "pg", `${say(w, "page", { n: i + 1 })}${x.sel === i ? ", " + w.review : ""}`); const im = el("img"); im.src = `page-${p}.svg`; im.alt = ""; im.setAttribute("aria-hidden", "true"); b.append(im);
    if (x.sel === i) b.setAttribute("aria-current", "true");
    li.append(b, el("span", "", String(i + 1))); ol.append(li);
  });
  if (!x.full) { const li = el("li", "add"); const b = btn(w.add, "pg", w.add); li.append(b, el("span", "", "+")); ol.append(li); }
  return ol;
}
function scanner(x) {
  const w = WORDS[x.lang || "en"];
  const n = (x.pages || []).length;
  const box = el("div", "scn" + (x.step === "review" || x.step === "pdf" ? " review" : ""));
  box.setAttribute("role", "dialog"); box.setAttribute("aria-label", x.label);
  const h = el("div", "snh");
  h.append(btn(w.cancel));
  const t = el("span", "tw", x.label + " "); const sm = el("small", "", "· " + (x.step === "review" || x.step === "pdf" ? say(w, "of", { n: (x.sel ?? 0) + 1, of: n }) : say(w, "page", { n: x.step === "adjust" ? n + 1 : n + 1 }))); t.append(sm); h.append(t);
  if (x.step === "capture" || x.step === "nocam") h.append(btn(w.pick, "", null, x.full));
  if (x.step === "adjust") h.append(btn(w.reset));
  box.append(h);
  const s = el("div", "sns");
  if (x.step === "nocam") {
    const e = el("div", "sne"); e.append(el("b", "", x.denied ? w.denied : w.nocam), el("span", "", x.denied ? w.deniedWhy : w.nocamWhy), btn(w.pick)); s.append(e);
  } else if (x.step === "review" || x.step === "pdf") {
    const p = el("img", "snp"); p.src = `page-${x.pages[x.sel ?? 0]}.svg`; p.alt = say(w, "page", { n: (x.sel ?? 0) + 1 }); s.append(p);
    const a = el("div", "sna"); a.append(btn(w.retake, "", null, x.step === "pdf"), btn(w.corners, "", null, x.step === "pdf"), btn(w.rotate, "", null, x.step === "pdf"), btn(w.earlier, "", null, x.step === "pdf" || !x.sel), btn(w.later, "", null, x.step === "pdf" || x.sel === n - 1), btn(w.del, "bad", null, x.step === "pdf")); s.append(a);
  } else {
    s.append(viewport(x, w));
    const st = el("div", "snt" + (x.step === "adjust" ? "" : x.full ? " warn" : x.found === false ? " warn" : " ok"), x.step === "adjust" ? w.drag : x.full ? say(w, "limit", { n }) : x.found === false ? w.none : x.found === "seek" ? w.seek : w.found);
    st.setAttribute("role", "status"); s.append(st);
  }
  box.append(s);
  box.append(strip(x, w));
  const b = el("div", "snb");
  const last = x.pages && x.pages.length ? x.pages[x.pages.length - 1] : null;
  if (x.step === "capture") {
    if (last) { const k = btn(null, "snk", `${w.review}: ${say(w, n > 1 ? "doneN" : "done1", { n })}`); const im = el("img"); im.src = `page-${last}.svg`; im.alt = ""; im.setAttribute("aria-hidden", "true"); k.append(im, el("b", "", String(n))); b.append(k); } else b.append(el("span"));
    const o = btn(null, "sno", say(w, "take", { n: n + 1 }), x.full); o.append(el("i")); b.append(o);
    b.append(btn(say(w, n > 1 ? "doneN" : "done1", { n }), "", null, !n));
  } else if (x.step === "adjust") {
    b.append(btn(w.retake), el("span"), btn(w.use));
  } else if (x.step === "pdf") {
    b.append(el("span"), el("span"));
    const m = el("div", "snx"); const d = btn(say(w, "doneN", { n }), "", null); d.setAttribute("aria-busy", "true"); d.disabled = true;
    const pg = el("span", "pgt"); pg.style.setProperty("--v", Math.round(x.pdf / n * 100)); pg.append(el("b")); pg.setAttribute("role", "progressbar"); pg.setAttribute("aria-valuenow", String(x.pdf)); pg.setAttribute("aria-valuemax", String(n)); pg.setAttribute("aria-label", say(w, "making", { n: x.pdf, of: n }));
    m.append(d, pg, el("span", "", say(w, "making", { n: x.pdf, of: n }))); b.append(m);
  } else if (x.step === "review") {
    b.append(btn(w.add), el("span"), btn(say(w, n > 1 ? "doneN" : "done1", { n })));
  } else {
    b.append(el("span"), el("span"), btn(say(w, "done1", { n: 0 }), "", null, true));
  }
  box.append(b);
  const wrap = el("div", "scw"); wrap.append(box);
  return wrap;
}
const FW = {
  en: { scan: "scan pages", rescan: "scan again", hint: "makes one A4 PDF · up to {max} pages", edit: "edit pages", remove: "remove", retry: "retry", making: "making the PDF · page {n} of {of}",
    uploading: "uploading {p} %", failed: "upload failed", pages: "{n} pages · A4 · {kb} KB", off: "scanning is off here", wait: "waiting for 1 upload", stuck: "an upload failed: retry or remove it" },
  th: { scan: "สแกนเอกสาร", rescan: "สแกนใหม่", hint: "ได้ PDF ขนาด A4 หนึ่งไฟล์ · ไม่เกิน {max} หน้า", edit: "แก้หน้า", remove: "ลบ", retry: "ลองอีกครั้ง", making: "กำลังทำ PDF · หน้า {n} จาก {of}",
    uploading: "กำลังอัปโหลด {p} %", failed: "อัปโหลดไม่สำเร็จ", pages: "{n} หน้า · A4 · {kb} KB", off: "สแกนไม่ได้ที่นี่", wait: "รออัปโหลด 1 ไฟล์", stuck: "อัปโหลดไม่สำเร็จ: ลองอีกครั้งหรือลบ" },
};
function field(x, w) {
  const l = el("div", "fd up" + (x.error ? " err" : ""));
  const fl = el("span", "fl"); fl.append(el("span", "fk", x.label), el("span", "fn", x.doc || "")); l.append(fl);
  const box = el("div", "fu"); box.setAttribute("role", "group"); box.setAttribute("aria-label", x.label);
  if (x.error) box.append(el("span", "fe", x.error));
  if (x.file) {
    const f = x.file, st = f.state || "done";
    const ul = el("ul", "fuf"), li = el("li", "fui " + st);
    const im = el("img", "fut"); im.src = `page-${f.first}.svg`; im.alt = ""; im.setAttribute("aria-hidden", "true"); im.style.objectFit = "contain"; im.style.background = "var(--card)";
    const m = el("span", "fum"); m.append(el("span", "fun", f.name));
    if (st === "uploading") { const t = el("span", "pgt"); t.style.setProperty("--v", f.p); t.append(el("b")); t.setAttribute("role", "progressbar"); t.setAttribute("aria-valuenow", String(f.p)); t.setAttribute("aria-label", f.name); m.append(t); }
    const pages = say(w, "pages", { n: f.n, kb: f.kb });
    m.append(el("span", "fus", st === "uploading" ? say(w, "uploading", { p: f.p }) + " · " + pages : st === "failed" ? w.failed + " · " + pages : pages));
    const a = el("span", "fua");
    if (st === "failed") a.append(btn(w.retry, "", `${w.retry} ${f.name}`));
    if (f.held !== false) a.append(btn(w.edit, "", `${w.edit}: ${f.name}`));
    a.append(btn(w.remove, st === "failed" ? "bad" : "", `${w.remove} ${f.name}`));
    li.append(im, m, a); ul.append(li); box.append(ul);
  }
  const bar = el("div", "fub");
  bar.append(btn(x.file ? w.rescan : w.scan, "", `${x.file ? w.rescan : w.scan}: ${x.label}`, x.off));
  bar.append(el("span", "fuh", x.off ? w.off : say(w, "hint", { max: x.max || 20 })));
  box.append(bar); l.append(box);
  return l;
}
function form(b) {
  const w = FW[b.lang || "en"];
  const f = el("div", "form");
  b.fields.forEach(x => {
    if (x.type === "scan") f.append(field(x, w));
    else { const l = el("label", "fd"); const fl = el("span", "fl"); fl.append(el("span", "fk", x.label), el("span", "fn", x.doc || "")); const i = el("input"); i.value = x.value || ""; i.placeholder = x.placeholder || ""; l.append(fl, i); f.append(l); }
  });
  const st = b.fields.find(x => x.file)?.file?.state;
  const r = el("div", "acts");
  if (st === "failed") r.append(el("span", "say-busy bad", w.stuck));
  else if (st === "uploading") r.append(el("span", "say-busy", w.wait));
  r.append(btn(b.submit, "", null, st === "uploading" || st === "failed"));
  f.append(r);
  return f;
}
function draw() {
  document.querySelectorAll("[data-s]").forEach(n => n.replaceWith(scanner(JSON.parse(n.dataset.s))));
  document.querySelectorAll("[data-f]").forEach(n => n.replaceWith(form(JSON.parse(n.dataset.f))));
  document.querySelectorAll(".snl>img").forEach(z => { const v = z.closest(".snv").getBoundingClientRect(), l = z.parentElement.getBoundingClientRect(), k = +z.dataset.k; z.style.width = v.width * k + "px"; z.style.height = v.height * k + "px"; z.style.left = l.width / 2 - z.dataset.cx / 300 * v.width * k + "px"; z.style.top = l.height / 2 - z.dataset.cy / 400 * v.height * k + "px"; });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
