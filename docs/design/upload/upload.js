// Preview-only port used to draw these images; not product code.
const WORDS = {
  en: { add1: "choose file", addN: "add files", photo1: "choose photo", photoN: "add photos", camera: "take photo", replace: "replace", remove: "remove", retry: "retry", dismiss: "dismiss",
    up: "up to {mb} MB", each: "up to {mb} MB each", image: "images", pdf: "PDF", or: " or ", uploading: "uploading {p} %", failed: "upload failed",
    type: "refused: only {types}", size: "refused: {size} is over {mb} MB", off: "uploads are off here", wait: "waiting for {n} upload", waitN: "waiting for {n} uploads", fail: "an upload failed: retry or remove it", group: "{label}, {n} files" },
  th: { add1: "เลือกไฟล์", addN: "เพิ่มไฟล์", photo1: "เลือกรูป", photoN: "เพิ่มรูป", camera: "ถ่ายรูป", replace: "เปลี่ยน", remove: "ลบ", retry: "ลองอีกครั้ง", dismiss: "ปิด",
    up: "ไม่เกิน {mb} MB", each: "ไม่เกิน {mb} MB ต่อไฟล์", image: "รูปภาพ", pdf: "PDF", or: " หรือ ", uploading: "กำลังอัปโหลด {p} %", failed: "อัปโหลดไม่สำเร็จ",
    type: "ไม่รับ: รับเฉพาะ{types}", size: "ไม่รับ: {size} เกิน {mb} MB", off: "อัปโหลดไม่ได้ที่นี่", wait: "รออัปโหลด {n} ไฟล์", waitN: "รออัปโหลด {n} ไฟล์", fail: "อัปโหลดไม่สำเร็จ: ลองอีกครั้งหรือลบ", group: "{label}, {n} ไฟล์" },
};
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function say(w, key, v) { return (w[key] || key).replace(/\{(\w+)\}/g, (_, k) => v[k]); }
function btn(label, cls, name, off) { const b = el("button", cls || ""); b.type = "button"; b.append(el("span", "", label)); if (name) b.setAttribute("aria-label", name); if (off) b.disabled = true; return b; }
function mb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
function types(w, accept) { return (accept || []).map(a => w[a] || a).join(w.or); }
function item(f, x, w) {
  const st = f.state || "done";
  const li = el("li", "fui " + st);
  const ext = (f.name.split(".").pop() || "").slice(0, 4);
  let head;
  if (f.src && st !== "refused") { head = el("img", "fut"); head.src = f.src; head.alt = ""; head.setAttribute("aria-hidden", "true"); }
  else { head = el("span", "fux", st === "refused" ? "!" : ext); head.setAttribute("aria-hidden", "true"); }
  const m = el("span", "fum");
  m.append(el("span", "fun", f.name));
  let line, acts = [];
  if (st === "uploading") {
    const p = Math.round((f.part || 0) * 100);
    line = say(w, "uploading", { p });
    const t = el("span", "pgt"); t.style.setProperty("--v", p); t.append(el("b"));
    t.setAttribute("role", "progressbar"); t.setAttribute("aria-valuenow", String(p)); t.setAttribute("aria-valuemin", "0"); t.setAttribute("aria-valuemax", "100"); t.setAttribute("aria-label", f.name);
    m.append(t);
    acts = [btn(w.remove, "", `${w.remove} ${f.name}`)];
  } else if (st === "failed") {
    line = w.failed + " · " + mb(f.size);
    acts = [btn(w.retry, "", `${w.retry} ${f.name}`), btn(w.remove, "bad", `${w.remove} ${f.name}`)];
  } else if (st === "refused") {
    line = f.why === "size" ? say(w, "size", { size: mb(f.size), mb: x.mb }) : say(w, "type", { types: types(w, x.accept) });
    acts = [btn(w.dismiss, "", `${w.dismiss} ${f.name}`)];
  } else {
    line = mb(f.size);
    acts = [btn(w.remove, "", `${w.remove} ${f.name}`)];
  }
  m.append(el("span", "fus", line));
  li.setAttribute("aria-label", `${f.name}, ${line}`);
  const a = el("span", "fua"); a.append(...acts);
  li.append(head, m, a);
  return li;
}
function upload(x, w) {
  const box = el("div", "fu"); box.setAttribute("role", "group");
  const files = x.files || [];
  if (x.error) box.append(el("span", "fe", x.error));
  box.setAttribute("aria-label", say(w, "group", { label: x.label, n: files.filter(f => f.state !== "refused").length }));
  if (files.length) { const ul = el("ul", "fuf"); files.forEach(f => ul.append(item(f, x, w))); box.append(ul); }
  const image = (x.accept || []).every(a => a === "image") && (x.accept || []).length;
  const held = files.some(f => f.state !== "refused");
  const bar = el("div", "fub");
  const pick = !x.many && held ? w.replace : image ? (x.many ? w.photoN : w.photo1) : (x.many ? w.addN : w.add1);
  if (x.capture) bar.append(btn(w.camera, "fuc", null, x.off));
  bar.append(btn(pick, "", `${pick}: ${x.label}`, x.off));
  const hint = x.off ? w.off : [x.accept ? types(w, x.accept) : null, x.mb ? say(w, x.many ? "each" : "up", { mb: x.mb }) : null].filter(Boolean).join(" · ");
  if (hint) bar.append(el("span", "fuh", hint));
  const input = el("input"); input.type = "file"; input.tabIndex = -1; input.setAttribute("aria-hidden", "true");
  bar.append(input);
  box.append(bar);
  return box;
}
function row(x, w) {
  const l = el(x.type === "upload" ? "div" : "label", "fd" + (x.type === "upload" ? " up" : x.type === "toggle" ? " tg" : "") + (x.error ? " err" : ""));
  const fl = el("span", "fl"); fl.append(el("span", "fk", x.label), el("span", "fn", x.doc || ""));
  l.append(fl);
  if (x.type === "upload") l.append(upload(x, w));
  else if (x.type === "toggle") { const i = el("input"); i.type = "checkbox"; i.checked = !!x.value; i.setAttribute("role", "switch"); l.append(i); }
  else if (x.type === "static") { const i = el("input", "sf"); i.type = "file"; i.name = x.name; i.multiple = !!x.many; l.append(i); }
  else { const i = el("input"); i.value = x.value || ""; i.placeholder = x.placeholder || ""; l.append(i); }
  return l;
}
function form(b) {
  const w = WORDS[b.lang || "en"];
  const f = el("div", "form"); f.dataset.id = b.id || "";
  b.fields.forEach(x => f.append(row(x, w)));
  if (b.submit) {
    const all = b.fields.flatMap(x => x.files || []);
    const busy = all.filter(x => x.state === "uploading").length, bad = all.some(x => x.state === "failed");
    const r = el("div", "acts");
    if (bad) r.append(el("span", "say-busy bad", w.fail));
    else if (busy) r.append(el("span", "say-busy", say(w, busy > 1 ? "waitN" : "wait", { n: busy })));
    r.append(btn(b.submit, "", null, busy || bad));
    f.append(r);
  }
  return f;
}
function draw() {
  document.querySelectorAll("[data-f]").forEach(n => n.replaceWith(form(JSON.parse(n.dataset.f))));
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
