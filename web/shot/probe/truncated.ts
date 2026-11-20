const CUT = () =>
  Array.from(document.querySelectorAll("#root *"))
    .filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()) && e.checkVisibility() && e.getBoundingClientRect().width > 1)
    .filter((e) => {
      const s = getComputedStyle(e);
      return (s.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1) || (s.webkitLineClamp !== "none" && e.scrollHeight > e.clientHeight + 1);
    })
    .map((e) => ({ at: at(e), detail: `"${e.textContent.trim().slice(0, 40)}" ends in an ellipsis` }));

export const rule = "render/truncated";
export const shot = ({ page }) => page.evaluate(CUT);
