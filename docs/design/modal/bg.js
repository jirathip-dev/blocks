// Preview-only: draws a generic app screen behind each modal and sets the page height for render.sh.
function bg(n) {
  const rows = ["Quarterly report", "Supplier list", "Launch checklist", "Office move", "Budget draft", "Team rota", "Onboarding notes", "Archive review"];
  const app = document.querySelector(".app");
  app.innerHTML = `<div class="top"><div class="tabh"><span class="tw">Items <small>· ${rows.length} open</small></span><button type="button"><span>filter</span></button><button type="button"><span>new item</span></button></div></div><div class="list">` +
    rows.slice(0, n ?? rows.length).map((r, i) => `<div class="row tap"><span class="rsg"><i class="gl mute">○</i></span><span class="rm"><span class="rt">${r}</span><span class="rs">due ${12 + i} Dec · ${3 + i} parts</span></span><span class="rv">#${210 + i}</span></div>`).join("") + "</div>";
}
function done() {
  const d = document.querySelector(".md.dlg[data-ghost]");
  const g = document.querySelector(".ghost");
  if (d && g) {
    const r = d.getBoundingClientRect(), s = d.closest(".stage").getBoundingClientRect();
    const mx = parseFloat(d.style.getPropertyValue("--mx")) || 0, my = parseFloat(d.style.getPropertyValue("--my")) || 0;
    Object.assign(g.style, { left: `${r.left - s.left - mx}px`, top: `${r.top - s.top - my}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
}
