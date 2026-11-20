// Preview-only port used to draw these images; not product code.
// Preview fields (not wire): at (page at the top, 1-based), zoom (1 = fit), scrollX (0..1 of the overflow), focus ("well" or a button's name),
// pinch ({s, x, y}: mid-pinch scale and finger point, size not yet written), state (page index -> "loading" | "failed"), static, crop (px).
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, name, off, focus) { const b = el("button"); b.type = "button"; b.append(el("span", "", label)); b.setAttribute("aria-label", name); if (off) b.disabled = true; if (focus === name) b.classList.add("fv"); return b; }
const ZMAX = 4;
function pages(b) {
  const list = b.pages || [], n = list.length, at = Math.min(Math.max(b.at || 1, 1), Math.max(n, 1)), z = b.zoom || 1, title = b.title || "Document";
  const s = el("section", "dcs" + (b.static ? " stc" : ""));
  s.setAttribute("role", "group"); s.setAttribute("aria-label", title);
  const hd = el("div", "dch");
  const cnt = el("span", "dcc", !n ? "no pages" : b.static ? n + (n === 1 ? " page" : " pages") : "page " + at + " of " + n);
  if (!b.static) cnt.setAttribute("aria-live", "polite");
  hd.append(el("b", "dct", title), cnt);
  const bar = el("div", "dcb");
  if (n && !b.static) {
    const zr = el("span", "dcz", z === 1 ? "fit" : Math.round(z * 100) + "%");
    zr.setAttribute("aria-label", z === 1 ? "zoom: fit to width" : "zoom: " + Math.round(z * 100) + " percent of fit");
    bar.append(btn("‹", "previous page", at === 1, b.focus), btn("›", "next page", at === n, b.focus), el("i"),
      btn("−", "zoom out", z === 1, b.focus), zr, btn("+", "zoom in", z >= ZMAX, b.focus), btn("fit", "fit to width", z === 1, b.focus));
  }
  if (b.file) {
    const a = el("a", "btn"); a.href = "#"; a.append(el("span", "", "pdf")); a.setAttribute("aria-label", "download " + title + " as PDF");
    if (b.focus === "pdf") a.classList.add("fv");
    if (bar.childNodes.length) bar.append(el("i"));
    bar.append(a);
  }
  if (bar.childNodes.length) hd.append(bar);
  s.append(hd);
  if (b.note) s.append(el("p", "dcn", b.note));
  if (!n) { s.append(el("div", "dce", b.empty || "No pages yet")); return s; }
  const w = el("div", "dcw" + (b.focus === "well" ? " fv" : ""));
  w.setAttribute("role", "region"); w.setAttribute("aria-label", title + ", " + n + " pages"); if (!b.static) w.tabIndex = 0;
  const k = el("div", "dck"); k.style.setProperty("--z", z);
  if (b.pinch) { k.style.transform = "scale(" + b.pinch.s + ")"; k.style.setProperty("--ox", b.pinch.x); k.style.setProperty("--oy", b.pinch.y); }
  const wide = Math.max(...list.map(p => p.width));
  list.forEach((p, i) => {
    const f = el("figure", "dc");
    f.style.setProperty("--pw", p.width / wide); f.style.setProperty("--a", p.width + " / " + p.height);
    const st = (b.state || {})[i];
    if (st) {
      const x = el("div", "dcx" + (st === "failed" ? " bad" : ""), st === "failed" ? "Page " + (i + 1) + " didn't load. " + p.alt : "loading page " + (i + 1));
      x.setAttribute("role", "img"); x.setAttribute("aria-label", "Page " + (i + 1) + " of " + n + ". " + (st === "failed" ? "Not loaded. " : "") + p.alt);
      f.append(x);
    } else {
      const im = el("img"); Object.assign(im, { src: sheet(p.src, p.width, p.height), alt: "Page " + (i + 1) + " of " + n + ". " + p.alt, width: p.width, height: p.height, loading: "lazy" });
      f.append(im);
    }
    const c = el("figcaption", "", (i + 1) + " / " + n); c.setAttribute("aria-hidden", "true"); f.append(c);
    k.append(f);
  });
  w.append(k); s.append(w);
  return s;
}
function draw() {
  document.querySelectorAll("[data-b]").forEach(nd => {
    const b = JSON.parse(nd.dataset.b), blk = pages(b);
    let box = blk;
    if (b.crop) { box = el("div", "crop"); box.style.maxHeight = (innerWidth < 600 && b.cropPhone ? b.cropPhone : b.crop) + "px"; box.style.overflow = "hidden"; box.append(blk); }
    nd.replaceWith(box);
    const w = blk.querySelector(".dcw");
    if (w && b.scrollX) w.scrollLeft = (w.scrollWidth - w.clientWidth) * b.scrollX;
    if (b.crop && b.at > 1) { const f = blk.querySelectorAll(".dc")[b.at - 1]; const pad = innerWidth < 600 ? 8 : 16; box.scrollTop = f.getBoundingClientRect().top - box.getBoundingClientRect().top - blk.querySelector(".dch").offsetHeight - pad; }
  });
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}

// The page pictures the app's server would make; drawn here as SVG so the previews need no files.
const INK = "#222", SOFT = "#c9c9c9", RULE = "#9a9a9a";
function bars(x, y, w, rows, gap, h) { let o = ""; for (let i = 0; i < rows; i++) { const ww = i === rows - 1 ? w * 0.55 : w * (0.86 + 0.14 * ((i * 37) % 7) / 7); o += `<rect x="${x}" y="${y + i * gap}" width="${ww}" height="${h || 12}" fill="${SOFT}"/>`; } return o; }
function t(x, y, s, size, wgt, anchor) { return `<text x="${x}" y="${y}" font-size="${size || 22}" font-weight="${wgt || 400}" fill="${INK}" text-anchor="${anchor || "start"}">${s}</text>`; }
function table(x, y, w, rows, cols, total) {
  let o = `<rect x="${x}" y="${y}" width="${w}" height="44" fill="#ececec"/>`;
  const cw = [0.08, 0.5, 0.12, 0.15, 0.15];
  let cx = x; cols.forEach((c, i) => { o += t(cx + 12 + (i > 1 ? w * cw[i] - 24 : 0), y + 29, c, 18, 700, i > 1 ? "end" : "start"); cx += w * cw[i]; });
  rows.forEach((r, j) => { const ry = y + 44 + j * 52; o += `<line x1="${x}" x2="${x + w}" y1="${ry + 52}" y2="${ry + 52}" stroke="#ddd" stroke-width="2"/>`; let rx = x; r.forEach((c, i) => { o += t(rx + 12 + (i > 1 ? w * cw[i] - 24 : 0), ry + 33, c, 19, 400, i > 1 ? "end" : "start"); rx += w * cw[i]; }); });
  if (total) { const ty = y + 44 + rows.length * 52 + 20; total.forEach(([k, v, b], i) => { o += t(x + w * 0.7, ty + 30 + i * 40, k, 20, b ? 700 : 400) + t(x + w - 12, ty + 30 + i * 40, v, 20, b ? 700 : 400, "end"); }); }
  return o;
}
const SHEETS = {
  "quote-1": () => `${t(100, 150, "COASTLINE FABRICATION", 40, 800)}${t(100, 190, "12 Harbour Road · Unit 4 · Port Ellery", 20)}${t(1140, 150, "QUOTATION", 44, 300, "end")}${t(1140, 195, "Q-2026-0418 · rev 3", 22, 400, "end")}
    <line x1="100" x2="1140" y1="240" y2="240" stroke="${INK}" stroke-width="3"/>
    ${t(100, 300, "Prepared for", 18, 700)}${t(100, 335, "Marlow Water Board", 22)}${t(100, 365, "Attn. R. Okafor, Asset Engineer", 20)}${bars(100, 385, 300, 2, 30)}
    ${t(700, 300, "Date", 18, 700)}${t(700, 335, "19 Nov 2026", 22)}${t(900, 300, "Valid until", 18, 700)}${t(900, 335, "19 Dec 2026", 22)}
    ${t(100, 520, "Water tower refurbishment: shell, ladder and access platform", 26, 700)}${bars(100, 550, 1040, 3, 30)}
    ${table(100, 680, 1040, [["1", "Abrasive blast, shell exterior (420 m²)", "420", "18.50", "7,770.00"], ["2", "Zinc primer + 2 coats epoxy", "420", "24.00", "10,080.00"], ["3", "Replace caged ladder, 14 m", "1", "6,400.00", "6,400.00"], ["4", "Access platform, galvanised", "1", "9,250.00", "9,250.00"], ["5", "Scaffold hire, 6 weeks", "6", "1,150.00", "6,900.00"], ["6", "Crane, 2 days with operator", "2", "2,300.00", "4,600.00"], ["7", "Site set-up and waste removal", "1", "1,800.00", "1,800.00"], ["8", "Inspection and test report", "1", "950.00", "950.00"]], ["#", "Item", "Qty", "Rate", "Amount"], [["Subtotal", "47,750.00"], ["VAT 7%", "3,342.50"], ["Total", "51,092.50", 1]])}
    ${bars(100, 1420, 1040, 4, 30)}${t(620, 1690, "Page 1 of 3", 18, 400, "middle")}`,
  "quote-2": () => `${t(100, 150, "Terms and conditions", 32, 700)}<line x1="100" x2="1140" y1="180" y2="180" stroke="${INK}" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5].map(i => t(100, 250 + i * 230, (i + 1) + ".", 22, 700) + bars(140, 232 + i * 230, 1000, 5, 30)).join("")}${t(620, 1690, "Page 2 of 3", 18, 400, "middle")}`,
  "quote-3": () => `${t(100, 150, "Programme and acceptance", 32, 700)}<line x1="100" x2="1140" y1="180" y2="180" stroke="${INK}" stroke-width="2"/>${bars(100, 220, 1040, 4, 30)}
    ${["Mobilise", "Blast", "Coat", "Ladder", "Platform", "Handover"].map((s, i) => t(100, 420 + i * 50, s, 20) + `<rect x="${300 + i * 120}" y="${402 + i * 50}" width="${i === 1 || i === 2 ? 240 : 120}" height="26" fill="${RULE}"/>`).join("")}
    ${t(100, 860, "Accepted for Marlow Water Board", 22, 700)}<line x1="100" x2="560" y1="1000" y2="1000" stroke="${INK}" stroke-width="2"/>${t(100, 1030, "Signature", 18)}
    <line x1="680" x2="1140" y1="1000" y2="1000" stroke="${INK}" stroke-width="2"/>${t(680, 1030, "Date", 18)}${bars(100, 1150, 1040, 3, 30)}${t(620, 1690, "Page 3 of 3", 18, 400, "middle")}`,
  "report-cover": () => `<rect x="0" y="0" width="1240" height="520" fill="#5d6b74"/>${t(100, 360, "Site inspection report", 56, 800).replace(INK, "#fff")}${t(100, 420, "Pump station 7 · 18 Nov 2026", 26).replace(INK, "#fff")}
    ${t(100, 640, "Summary", 28, 700)}${bars(100, 680, 1040, 6, 30)}${t(100, 940, "Findings", 28, 700)}${bars(100, 980, 1040, 8, 30)}`,
  "report-photo": () => `${t(100, 140, "Photos", 30, 700)}${[0, 1, 2, 3].map(i => `<rect x="${100 + (i % 2) * 530}" y="${180 + Math.floor(i / 2) * 640}" width="510" height="510" fill="#a9b4ba"/><path d="M${120 + (i % 2) * 530} ${640 + Math.floor(i / 2) * 640}l140-170 110 120 80-70 160 120z" fill="#7e8b92"/>${t(100 + (i % 2) * 530, 730 + Math.floor(i / 2) * 640, "Photo " + (i + 1) + ": valve chamber, east wall", 19)}`).join("")}`,
  "landscape": () => `${t(90, 120, "Appendix A · bill of quantities", 30, 700)}${table(90, 170, 1574, [["A1", "Shell blast and coat", "420 m²", "42.50", "17,850.00"], ["A2", "Ladder and cage", "14 m", "457.14", "6,400.00"], ["A3", "Platform", "1", "9,250.00", "9,250.00"], ["A4", "Scaffold", "6 wk", "1,150.00", "6,900.00"], ["A5", "Crane", "2 d", "2,300.00", "4,600.00"]], ["Ref", "Work", "Qty", "Rate", "Amount"])}${bars(90, 700, 1574, 6, 34)}`,
};
function sheet(src, w, h) {
  const f = SHEETS[src.replace(/^.*\/|\.png$/g, "")] || (() => bars(100, 140, w - 200, Math.floor((h - 280) / 40), 40));
  const body = f().replace(/\n\s*/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="Helvetica, Arial, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
