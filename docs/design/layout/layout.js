const q = new URLSearchParams(location.search);
if (q.get("look") === "paper") document.documentElement.classList.add("paper");
const body = document.body, app = document.querySelector(".app"), stage = document.querySelector(".stage");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fit = () => {
  app.style.zoom = "";
  const w = body.dataset.size === "wide" ? 1024 : 372;
  app.style.zoom = String(Math.min(1, (stage.clientWidth - 24) / w));
};
const set = (size) => {
  const before = new Map([...app.querySelectorAll("[data-screen]")].map((e) => [e, e.getBoundingClientRect()]));
  body.dataset.size = size;
  for (const b of document.querySelectorAll(".sw button")) b.setAttribute("aria-pressed", String(b.dataset.size === size));
  fit();
  if (still.matches) return;
  const z = Number(app.style.zoom) || 1;
  for (const [e, a] of before) {
    const b = e.getBoundingClientRect();
    if (!b.width) continue;
    if (!a.width) { e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" }); continue; }
    const dx = (a.left - b.left) / z, dy = (a.top - b.top) / z;
    e.animate([{ transform: `translate(${dx}px,${dy}px) scale(${a.width / b.width},${a.height / b.height})`, transformOrigin: "0 0", opacity: .6 },
      { transform: "none", transformOrigin: "0 0", opacity: 1 }], { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" });
  }
};
for (const b of document.querySelectorAll(".sw button")) b.onclick = () => set(b.dataset.size);
set(q.get("size") ?? (matchMedia("(min-width: 1000px)").matches ? "wide" : "compact"));
addEventListener("resize", fit);
addEventListener("load", () => (body.dataset.h = document.documentElement.scrollHeight));
