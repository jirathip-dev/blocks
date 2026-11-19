export const rule = "render/dropped";
export const shot = async ({ page, blocks }) =>
  (await page.evaluate(() => window.h.dropped))
    .filter((d) => d.startsWith("event "))
    .map((d) => ({ at: blocks.find(({ n }) => n.id === d.split(" ")[1])?.at ?? "", detail: `the island sent ${d.split(" ")[2]}` }));
