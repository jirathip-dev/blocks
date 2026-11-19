const UNNAMED = () => {
  const said = (e) => e.getAttribute("aria-label") || e.labels?.length || e.getAttribute("placeholder") || e.textContent.trim() || e.querySelector("img[alt]:not([alt=''])");
  const ok = (e) => (e.matches("img") ? e.hasAttribute("alt") : e.matches("svg") ? e.matches("[role=img][aria-label]") : said(e));
  return Array.from(document.querySelectorAll("#root :is(button, a[href], input, textarea, select, [role=button], [role=switch], [tabindex], img, svg)"))
    .filter((e) => !e.closest("[hidden], [aria-hidden=true]") && !ok(e))
    .map((e) => ({ at: at(e), detail: `an unnamed ${e.matches("img, svg") ? "image" : e.tagName.toLowerCase()}` }));
};

export const rule = "render/no-name";
export const shot = async ({ blocks, page }) => [
  ...blocks.filter(({ n }) => !n.role || !n.name).map(({ n, at }) => ({ at, detail: n.role ? "the block has no name" : "the block has no role" })),
  ...(await page.evaluate(UNNAMED)),
];
