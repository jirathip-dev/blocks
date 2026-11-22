/// Picks a file in an upload field's input, with the harness's handler set to answer, fail or wait; a field with no file input is dropped.
export async function pick(page, f, dropped) {
  const input = page.locator(`[data-field="${f.field}"] input[type=file]`).first();
  if (!(await input.count())) return dropped.push(`file ${f.field}`);
  await page.evaluate((m) => (window.h.handler = m), f.handler);
  await input.setInputFiles({ name: f.name, mimeType: f.mime, buffer: Buffer.alloc(f.size) });
  if (f.handler !== "waits") await page.locator(`[data-field="${f.field}"] .fui.uploading`).filter({ hasText: f.name }).first().waitFor({ state: "detached" });
}

/// A fault for each sent action that carries a `data:` URL: files leave through the handler, never inside an action.
export const leaks = (sent) => sent.filter((a) => JSON.stringify(a).includes("data:")).map((a) => `sent: a data: URL in ${a.action}`);
