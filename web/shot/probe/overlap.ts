const over = (a, b) => Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 0.5 && Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0.5;

export const rule = "render/overlap";
export const shot = ({ blocks }) =>
  blocks.flatMap(({ n, at }) => {
    const kids = blocks.filter((b) => n.children.includes(b.n) && b.n.drawn !== "hidden");
    return kids.flatMap((a, i) => kids.slice(i + 1).filter((b) => over(a.n.rect, b.n.rect)).map((b) => ({ at: a.at, detail: `it covers ${b.at.slice(at.length + 1)}` })));
  });
