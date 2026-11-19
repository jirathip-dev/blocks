const CUT = () =>
  Array.from(document.querySelectorAll("#root *"))
    .filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()) && e.checkVisibility() && e.getBoundingClientRect().width > 1)
    .filter((e) => {
      const s = getComputedStyle(e), hides = (o) => o === "hidden" || o === "clip";
      const wide = hides(s.overflowX) && e.scrollWidth > e.clientWidth + 1 && s.textOverflow !== "ellipsis";
      const tall = hides(s.overflowY) && e.scrollHeight > e.clientHeight + 1 && s.webkitLineClamp === "none";
      return wide || tall;
    })
    .map((e) => ({ at: at(e), detail: `the text needs ${e.scrollWidth} by ${e.scrollHeight} px in a ${e.clientWidth} by ${e.clientHeight} px box` }));

export const rule = "render/clipped-text";
export const shot = ({ page }) => page.evaluate(CUT);
