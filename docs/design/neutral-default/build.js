(() => {
  const css = getComputedStyle(document.documentElement);
  const ms = (name) => parseFloat(css.getPropertyValue(name));
  const q = new URLSearchParams(location.search);
  const late = q.get("late");
  if (late !== null) {
    const row = document.querySelector("#rows .row").cloneNode(true);
    row.id = "";
    row.classList.add("late");
    row.querySelector(".t").firstChild.textContent = "Card declined, order #4822";
    row.querySelector(".m").textContent = "Arrived after the build-up";
    document.querySelector("#rows .grp").after(row);
  }
  const shown = [...document.querySelectorAll(".tile")]
    .filter((t) => !t.parentElement.closest(".tile") && !t.classList.contains("late"))
    .map((t) => ({ t, r: t.getBoundingClientRect() }))
    .filter(({ r }) => r.top < innerHeight)
    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
  const step = Math.min(ms("--stagger"), ms("--build") / Math.max(1, shown.length - 1));
  shown.forEach(({ t }, i) => t.style.setProperty("--i", i));
  document.body.style.setProperty("--step", step + "ms");
  document.body.classList.add("built");
  document.body.dataset.tiles = shown.length;
  const at = q.get("t") ?? late;
  if (at !== null) {
    const pin = () => document.getAnimations().forEach((a) => {
      a.pause();
      const isLate = a.effect.target.classList.contains("late");
      a.currentTime = late !== null && !isLate ? 10000 : Number(at);
    });
    pin();
    requestAnimationFrame(pin);
  }
})();
