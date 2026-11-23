/// Moves a slider field's thumb to `to` and lets it go; a field with no slider, or one hidden or off, is dropped.
export async function slide(page, s, dropped) {
  const input = page.locator(`[data-field="${s.field}"] input[type=range]`).first();
  if (!(await input.count()) || !(await input.isVisible()) || !(await input.isEnabled())) return dropped.push(`slide ${s.field}`);
  await input.evaluate((i, to) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(i, String(to));
    for (const e of ["input", "change"]) i.dispatchEvent(new Event(e, { bubbles: true }));
  }, s.to);
}
