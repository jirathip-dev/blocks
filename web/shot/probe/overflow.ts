export const rule = "render/overflow";
export const shot = async ({ blocks, width, page }) => {
  const out = blocks
    .filter(({ n: { rect: [x, , w] = [0, 0, 0] } }) => x < -0.5 || x + w > width + 0.5)
    .map(({ n: { rect: [x, , w] }, at }) => ({ at, detail: `the block spans ${Math.round(x)} to ${Math.round(x + w)} px in a ${width} px screen` }));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > width) out.push({ at: "", detail: `the page is ${wide} px wide in a ${width} px screen` });
  return out;
};
