const SMALL = () =>
  Array.from(document.querySelectorAll("#root :is(button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=checkbox], [role=tab])"))
    .filter((e) => !e.closest("[hidden], [aria-hidden=true]") && !(e.matches("a") && e.closest("p, li, td")))
    .map((e) => [e, (e.closest("label") ?? e).getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44))
    .map(([e, r]) => ({ at: at(e), detail: `the ${e.tagName.toLowerCase()} is ${Math.round(r.width)} by ${Math.round(r.height)} px` }));

export const rule = "render/tap-target";
export const shot = ({ page }) => page.evaluate(SMALL);
