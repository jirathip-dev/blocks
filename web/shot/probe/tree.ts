import { step } from "../at.ts";

const who = (n) => `${n.kind}${n.id ? `#${n.id}` : ""} ${n.drawn}`;

function diff(got, want, at, out) {
  if (got?.kind === want.kind && (got.drawn === "hidden" ? want.drawn === "native" : want.kind === "island" && got.drawn !== want.drawn)) return;
  if (!got || want.kind !== got.kind || (want.id ?? null) !== (got.id ?? null) || want.drawn !== got.drawn) return out.push({ at, detail: `drew ${got ? who(got) : "nothing"}, expected ${who(want)}` });
  if (want.role !== got.role || want.name !== got.name) out.push({ at, detail: `drew ${got.role} "${got.name}", expected ${want.role} "${want.name}"` });
  if (want.children.length !== got.children.length) out.push({ at, detail: `${got.children.length} children, expected ${want.children.length}` });
  want.children.forEach((c, i) => diff(got.children[i], c, `${at}/${step(c, want.children)}`, out));
}

export const rule = "render/tree";
export const shot = ({ tree, want }) => {
  const out = [];
  if (!want) return out;
  if (tree) diff(tree, want, step(want, [want]), out);
  else out.push({ at: "", detail: "drew nothing" });
  return out;
};
