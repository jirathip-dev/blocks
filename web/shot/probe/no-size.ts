export const rule = "render/no-size";
export const shot = ({ blocks }) =>
  blocks.filter(({ n }) => n.drawn !== "hidden" && !(n.rect?.[2] > 0 && n.rect?.[3] > 0)).map(({ n, at }) => ({ at, detail: `${n.rect?.[2] ?? 0} by ${n.rect?.[3] ?? 0} px` }));
