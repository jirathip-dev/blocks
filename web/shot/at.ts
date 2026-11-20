/// A node's own step in an `at`: `kind#id`, or `kind~n` among its siblings of that kind with no id.
export const step = (n, sibs) => (n.id ? `${n.kind}#${n.id}` : `${n.kind}~${sibs.filter((s) => !s.id && s.kind === n.kind).indexOf(n)}`);

/// Each node of a drawn tree with its `at`, the path of steps from the screen.
export const blocks = (n, at = "", sibs = [n]) => {
  const here = at ? `${at}/${step(n, sibs)}` : step(n, sibs);
  return [{ n, at: here }, ...n.children.flatMap((c) => blocks(c, here, n.children))];
};

/// In the page: the `at` of the block that holds element `e`, named as `blocks` names it.
export function at(e) {
  const b = e?.closest("[data-block]");
  if (!b) return "";
  const up = b.parentElement?.closest("[data-block]") ?? null;
  const sibs = Array.from((up ?? document).querySelectorAll("[data-block]")).filter((c) => (c.parentElement?.closest("[data-block]") ?? null) === up);
  const me = b.dataset.id ? `${b.dataset.block}#${b.dataset.id}` : `${b.dataset.block}~${sibs.filter((s) => !s.dataset.id && s.dataset.block === b.dataset.block).indexOf(b)}`;
  return up ? `${at(up)}/${me}` : me;
}
