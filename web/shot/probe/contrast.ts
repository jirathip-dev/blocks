const LOW = () => {
  const rgba = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const mix = (top, under) => top.slice(0, 3).map((v, i) => v * (top[3] ?? 1) + under[i] * (1 - (top[3] ?? 1)));
  const behind = (e) => {
    const layers = [];
    for (let p = e; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if ((s.backgroundImage !== "none" && p !== document.documentElement) || p.matches("img, video, canvas, svg")) return null;
      const c = rgba(s.backgroundColor);
      if ((c[3] ?? 1) > 0) layers.push(c);
      if ((c[3] ?? 1) === 1) break;
    }
    return layers.reduceRight((under, top) => mix(top, under), [255, 255, 255]);
  };
  const texts = Array.from(document.querySelectorAll("#root *")).filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()) && e.checkVisibility() && e.getBoundingClientRect().width > 1);
  return texts.flatMap((e) => {
    const s = getComputedStyle(e), bg = behind(e);
    if (!bg) return [];
    const [a, b] = [lum(mix(rgba(s.color), bg)), lum(bg)];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    return ratio < (large ? 3 : 4.5) ? [{ at: at(e), detail: `${ratio.toFixed(2)}:1 at ${size} px` }] : [];
  });
};

export const rule = "render/contrast";
export const shot = ({ page }) => page.evaluate(LOW);
