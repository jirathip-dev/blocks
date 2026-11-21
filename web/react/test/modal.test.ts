import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { webkit } from "playwright";
import { reactJs } from "../../shot/shot.ts";

const BASE = "http://blocks.test/";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const fixture = (k) => JSON.parse(read(`../../../fixtures/blocks/${k}.json`));
const dialog = fixture("modal");
const alert = fixture("modal-delete-items");
const tool = fixture("modal-layers");
const rows = (n) => Array.from({ length: n }, (_, i) => ({ type: "text", id: `r${i}`, markdown: `Row ${i}` }));

let browser;
before(async () => (browser = await webkit.launch()));
after(() => browser.close());

const PAGE = `<!doctype html><meta charset=utf-8><link rel=stylesheet href=/blocks.css><body><button id=opener>open</button><div id=root></div>
<script src=/react.js></script><script type=module>
window.draw = async (adapter, b) => {
  document.getElementById("opener").focus();
  const root = document.getElementById("root");
  if (adapter === "react") return R.boot(root, { type: "screen", id: "s", blocks: [b] }, { sent: (a) => (window.sent.push(a), true), dropped() {}, file() {} });
  const B = await import("/blocks.js");
  const store = { get: (k) => localStorage.getItem(k), put: (k, v) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)) };
  root.append(B.render(b, { screen: "s", act: async (a) => (window.sent.push(a), true), tap() {}, open: new Set(), theme: B.plain, store }));
};
window.sent = [];
</script>`;

async function open(adapter, b, width = 1440, height = 900, ctx) {
  const c = ctx ?? (await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" }));
  const page = await c.newPage();
  await page.route("**/*", (r) => {
    const p = r.request().url().slice(BASE.length);
    if (p === "") return r.fulfill({ body: PAGE, contentType: "text/html" });
    if (p === "blocks.js" || p === "blocks.css") return r.fulfill({ body: read(`../../dist/${p}`), contentType: p.endsWith(".css") ? "text/css" : "text/javascript" });
    if (p === "react.js") return r.fulfill({ body: reactJs(), contentType: "text/javascript" });
    return r.fulfill({ status: 404 });
  });
  await page.goto(BASE);
  await page.waitForFunction(() => typeof window.draw === "function");
  await page.evaluate(([a, x]) => window.draw(a, x), [adapter, b]);
  await page.waitForFunction(() => document.querySelector("dialog.md")?.open === true);
  return { page, ctx: c, close: () => c.close() };
}

const box = (page) => page.evaluate(() => JSON.parse(JSON.stringify(document.querySelector("dialog.md").getBoundingClientRect())));
const kept = (page, id) => page.evaluate((k) => localStorage.getItem(k), `b:modal:${id}`);
const drag = async (page, sel, dx, dy) => {
  const r = await page.locator(sel).boundingBox();
  const [x, y] = [r.x + r.width / 2, r.y + r.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
};
const near = (a, b, what) => ok(Math.abs(a - b) <= 1, `${what}: ${a} vs ${b}`);

for (const adapter of ["react", "html"]) {
  test(`${adapter}: a dialog drags by its header, keeps its place per id across a reload, clamps to the viewport and moves by keys`, async () => {
    const { page, ctx, close } = await open(adapter, dialog);
    const was = await box(page);
    near(was.x + was.width / 2, 720, "opens centred");
    await drag(page, "dialog.md .mdg", 200, -100);
    const moved = await box(page);
    near(moved.x - was.x, 200, "moved right");
    near(moved.y - was.y, -100, "moved up");
    deepStrictEqual(JSON.parse(await kept(page, "edit-item")), { x: 200, y: -100 });
    await page.close();
    const again = await open(adapter, dialog, 1440, 900, ctx);
    const back = await box(again.page);
    near(back.x, moved.x, "same place after a reload");
    near(back.y, moved.y, "same place after a reload");
    await drag(again.page, "dialog.md .mdg", 2000, 2000);
    const fit = await box(again.page);
    near(fit.right, 1440 - 16, "clamped right");
    near(fit.bottom, 900 - 16, "clamped bottom");
    await again.page.dblclick("dialog.md .mdg");
    const centre = await box(again.page);
    near(centre.x, was.x, "a double-click puts it back");
    strictEqual(await kept(again.page, "edit-item"), null);
    await again.page.focus("dialog.md .mdt");
    await again.page.keyboard.press("ArrowRight");
    await again.page.keyboard.press("Shift+ArrowDown");
    const keyed = await box(again.page);
    near(keyed.x - was.x, 16, "an arrow moves 16");
    near(keyed.y - was.y, 64, "Shift moves 64");
    strictEqual(await again.page.textContent(".b-sr[aria-live]"), "moved down");
    await close();
  });

  test(`${adapter}: a confirm stays fixed in the centre, keeps nothing and opens on cancel when destructive`, async () => {
    const { page, close } = await open(adapter, alert);
    strictEqual(await page.evaluate(() => document.activeElement?.className), "mdc");
    const was = await box(page);
    await drag(page, "dialog.md .mdh", 200, -100);
    deepStrictEqual(await box(page), was);
    strictEqual(await kept(page, "delete-items"), null);
    strictEqual(await page.locator("dialog.md .mdg, dialog.md .mdz, dialog.md .mdn, dialog.md .mdx").count(), 0);
    strictEqual(await page.getAttribute("dialog.md", "role"), "alertdialog");
    await close();
  });

  test(`${adapter}: focus stays inside while open, Escape closes and focus goes back to the opener`, async () => {
    const { page, close } = await open(adapter, dialog);
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(i % 2 ? "Shift+Tab" : "Tab");
      ok(await page.evaluate(() => document.querySelector("dialog.md").contains(document.activeElement)), `tab ${i}`);
    }
    await page.keyboard.press("Escape");
    strictEqual(await page.evaluate(() => document.querySelector("dialog.md").open), false);
    strictEqual(await page.evaluate(() => document.activeElement?.id), "opener");
    await close();
  });

  test(`${adapter}: an opt-in tool window resizes by its corner, folds to a pill and the pill restores it; a dialog does neither`, async () => {
    const { page, close } = await open(adapter, tool);
    const was = await box(page);
    await drag(page, "dialog.md .mdz", 40, 20);
    const big = await box(page);
    near(big.width - was.width, 40, "wider");
    near(big.height - was.height, 20, "taller");
    near(big.x, was.x, "top left stays");
    const k = JSON.parse(await kept(page, "layers"));
    deepStrictEqual([k.w, k.h, k.min], [400, 460, false]);
    strictEqual(await page.getAttribute("dialog.md .mdz", "aria-valuetext"), "400 by 460");
    await page.click("dialog.md .mdn");
    strictEqual(await page.isVisible("dialog.md"), false);
    const pill = page.getByRole("navigation", { name: "minimised windows" }).getByRole("button", { name: "restore Layers" });
    await pill.click();
    strictEqual(await page.isVisible("dialog.md"), true);
    strictEqual(await page.evaluate(() => document.activeElement?.className), "mdt");
    strictEqual(await page.locator("nav.mdp").count(), 0);
    deepStrictEqual(await box(page), big);
    await close();
    const d = await open(adapter, dialog);
    strictEqual(await d.page.locator("dialog.md .mdz, dialog.md .mde, dialog.md .mdn").count(), 0);
    await d.close();
  });

  test(`${adapter}: at 390 a dialog is a bottom sheet, a swipe down on its handle closes it, a short one springs back, tall goes full-screen, a confirm stays centred`, async () => {
    const { page, close } = await open(adapter, dialog, 390, 844);
    const r = await box(page);
    deepStrictEqual([r.x, r.width, r.bottom], [0, 390, 844]);
    await drag(page, "dialog.md .mdt", 0, -200);
    deepStrictEqual(await box(page), r);
    await drag(page, "dialog.md .mdk", 0, 20);
    strictEqual(await page.evaluate(() => document.querySelector("dialog.md").open), true);
    deepStrictEqual(await box(page), r);
    await drag(page, "dialog.md .mdk", 0, 200);
    strictEqual(await page.evaluate(() => document.querySelector("dialog.md").open), false);
    await close();
    const tall = await open(adapter, { ...dialog, blocks: rows(80) }, 390, 844);
    const t = await box(tall.page);
    deepStrictEqual([t.y, t.height], [0, 844]);
    ok(await tall.page.evaluate(() => document.querySelector("dialog.md").classList.contains("full")));
    await tall.close();
    const c = await open(adapter, alert, 390, 844);
    const a = await box(c.page);
    deepStrictEqual([a.width, a.x + a.width / 2], [320, 195]);
    await c.close();
  });
}

test("react: the main button sends the done action with the fields inside, then closes", async () => {
  const b = { ...dialog, blocks: [{ type: "form", id: "f", fields: [{ type: "text", name: "name", value: "Launch" }] }] };
  const { page, close } = await open("react", b);
  await page.click("dialog.md .mdo");
  await page.waitForFunction(() => !document.querySelector("dialog.md").open);
  const sent = await page.evaluate(() => window.sent);
  strictEqual(sent[0].action, "save-item");
  strictEqual(sent[0].block, "edit-item");
  strictEqual(sent[0].values.name, "Launch");
  await close();
});
