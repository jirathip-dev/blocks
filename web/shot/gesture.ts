const KEY = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" };

/// Runs a `gesture` step, a pointer drag by `[dx, dy]` px, key nudges or named actions, with its action held for the next `answer` or `refuse`; or a `refuse`.
export async function gesture(page, s) {
  if (s.refuse) return page.evaluate(() => window.h.wait?.(false));
  const g = s.gesture;
  if (g.grab?.column) return typed(page, g);
  const grip = page.locator(`[data-block][data-id="${g.id}"] [data-grab="${JSON.stringify(g.grab).replace(/"/g, '\\"')}"]`).first();
  await page.evaluate(() => (window.h.hold = true));
  if (g.via === "pointer") {
    const b = await grip.boundingBox();
    const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (const [dx, dy] of g.reach) await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();
  } else if (g.via === "keys") {
    await grip.focus();
    await page.keyboard.press("Space");
    for (const n of g.reach) await page.keyboard.press(`${n.big ? "Shift+" : ""}${KEY[n.dir]}`);
    await page.keyboard.press("Enter");
  } else for (const name of g.reach) await grip.locator("xpath=..").locator("button.b-sr", { hasText: name }).first().dispatchEvent("click");
  await page.evaluate(() => (window.h.hold = false));
}

async function typed(page, g) {
  const td = page.locator(`[data-block][data-id="${g.id}"] tr[data-id="${g.grab.row}"] > td[data-c="${g.grab.column}"]`).first();
  await page.evaluate(() => (window.h.hold = true));
  if (g.via === "pointer") await td.click();
  else (await td.focus(), await page.keyboard.press("Enter"));
  const input = td.locator("input");
  await input.fill(String(g.reach[0] ?? ""));
  if (g.via === "action") await input.evaluate((e) => e.blur());
  else await page.keyboard.press(g.via === "keys" ? "Tab" : "Enter");
  await page.evaluate(() => (window.h.hold = false));
}
