import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { all, ctx, fixture, part, render } from "../kit.ts";

const answer = (n) => JSON.parse(readFileSync(new URL(`../../../fixtures/import/${n}.json`, import.meta.url), "utf8"));
const settle = async () => {
  await import("../../src/lazy/import.ts");
  for (let i = 0; i < 5; i++) await null;
};
const text = (e) => e.textContent.replace(/\s+/g, " ").trim();
const button = (e, label) => all(e).find((x) => x.tagName === "BUTTON" && text(x) === label);
const has = (e, s) => ok(text(e).includes(s), `${s} in: ${text(e)}`);

function app(id = "f-7") {
  const sent = [];
  const box = { e: null, block: fixture("import"), next: [] };
  const c = ctx({
    screen: `s-${Math.random()}`,
    file: async (blob, about) => (about.progress(0.5), sent.push({ file: blob.name, about: about.field }), { id }),
    act: async (a) => {
      sent.push(a);
      const b = box.next.shift();
      if (b === false) return false;
      if (b === "hang") return new Promise(() => {});
      if (b) box.e = render((box.block = b), c);
      return true;
    },
  });
  box.e = render(box.block, c);
  return { box, c, sent };
}
const pick = async (x, name = "price-list-nov.xlsx", size = 86016) => {
  const input = all(x.box.e).find((e) => e.tagName === "INPUT");
  input.files = [{ name, size, type: "" }];
  input.onchange();
  await settle();
};

test("the view is its own chunk: the first draw is an empty card that fills once the chunk loads, and later draws are whole at once", async () => {
  const c = ctx({ screen: "t1", file: async () => ({ id: "x" }) });
  const first = render(fixture("import"), c);
  strictEqual(first.childElementCount, 0);
  await settle();
  has(first, "Drop a spreadsheet here");
  const again = render(fixture("import"), c);
  has(again, "The file needs SKU, Price ฿ and may have Name, Category (Bakery, Dairy)");
  strictEqual(part(again, "btn").href, "https://example.com/files/template-products.xlsx");
  has(again, ".xlsx or .csv · up to 10 MB");
});

test("a picked file uploads through the file handler, the server reads it, and import sends one action with the file, sheet and match", async () => {
  const x = app();
  await settle();
  x.box.next = [answer("good")];
  await pick(x);
  deepStrictEqual(x.sent.slice(0, 2), [{ file: "price-list-nov.xlsx", about: "file" }, { action: "read", block: "products", values: { file: "f-7", sheet: null, map: {} } }]);
  const e = x.box.e;
  has(e, "48 rows · sheet Sheet1");
  has(e, "Columns: 4 of 4 matched · Not imported: Supplier");
  has(e, "e.g. BK-0101, BK-0102");
  has(e, "45 more rows, all checked by the server");
  deepStrictEqual(all(e).filter((r) => r.tagName === "TD" && r.classList.contains("imn0")).map(text), ["2", "3", "4"]);
  button(e, "import 48 rows").onclick();
  has(x.box.e, "Import 48 rows into Products?");
  has(x.box.e, "Your file is not changed.");
  x.box.next = [{ ...answer("good"), done: { count: 48 } }];
  button(x.box.e, "import 48 rows").onclick();
  await settle();
  deepStrictEqual(x.sent.at(-1), { action: "import", block: "products", values: { file: "f-7", sheet: "Sheet1", map: { cat: "Group", name: "Description", price: "Unit price", sku: "Item code" } } });
  has(x.box.e, "48rows imported into Products");
  ok(button(x.box.e, "import another file"));
});

test("bad rows: the server's reasons under each row, a filter to them, and the count left out of the import", async () => {
  const x = app();
  await settle();
  x.box.next = [answer("bad-rows")];
  await pick(x);
  const e = x.box.e;
  has(e, "3 rows with errors are left out");
  ok(button(e, "import 309 rows"));
  const cell = all(e).find((td) => td.tagName === "TD" && td.classList.contains("bad"));
  strictEqual(text(cell), "12,5O");
  ok(all(e).some((r) => r.classList.contains("imx") && text(r) === "Price ฿: “12,5O” is not a number"));
  button(e, "3 with errors").onclick();
  deepStrictEqual(all(x.box.e).filter((r) => r.tagName === "TD" && r.classList.contains("imn0")).map(text), ["14", "87", "203"]);
  const sheet = all(x.box.e).find((s) => s.tagName === "SELECT" && s.getAttribute("aria-label") === "sheet");
  sheet.value = "Cover";
  x.box.next = [answer("bad-rows")];
  sheet.onchange();
  deepStrictEqual(x.sent.at(-1).values, { file: "f-7", sheet: "Cover", map: answer("bad-rows").sheet.map });
});

test("wrong columns: a required column with no match is red, import is off, and picking one asks the server again", async () => {
  const x = app();
  await settle();
  x.box.next = [answer("wrong-columns")];
  await pick(x, "stock-count.csv", 6000);
  const e = x.box.e;
  has(e, "pick a column for Price ฿");
  strictEqual(button(e, "import 96 rows").disabled, true);
  ok(all(e).some((li) => li.classList.contains("imr") && li.classList.contains("no") && text(li).startsWith("Price ฿")));
  const price = all(e).find((s) => s.tagName === "SELECT" && s.getAttribute("aria-label") === "Price ฿: Columns");
  price.value = "Counted";
  x.box.next = ["hang"];
  price.onchange();
  deepStrictEqual(x.sent.at(-1).values, { file: "f-7", sheet: null, map: { name: "Product", price: "Counted", sku: "Code" } });
  has(x.box.e, "checking the rows again with these columns");
  ok(x.box.e.classList.contains("busy"));
});

test("the server refusing the file puts its message over the drop area; a failed upload or read offers retry", async () => {
  const x = app();
  await settle();
  x.box.next = [answer("refused")];
  await pick(x, "old.xls", 512);
  strictEqual(text(part(x.box.e, "fe")), "An old .xls file: save it as .xlsx or .csv");
  has(x.box.e, "Drop a spreadsheet here");
  x.box.next = [false];
  await pick(x);
  has(x.box.e, "the server didn't answer");
  x.box.next = [answer("good")];
  button(x.box.e, "retry").onclick();
  await settle();
  strictEqual(x.sent.at(-1).action, "read");
  has(x.box.e, "Columns: 4 of 4 matched");
  const failing = ctx({ screen: "t5", file: async () => Promise.reject(new Error("no")) });
  const e = render(fixture("import"), failing);
  const input = all(e).find((i) => i.tagName === "INPUT");
  input.files = [{ name: "a.csv", size: 99, type: "text/csv" }];
  input.onchange();
  await settle();
  has(e, "upload failed");
  ok(button(e, "retry"));
  input.files = [{ name: "big.xlsx", size: 11 * 1048576, type: "" }];
  input.onchange();
  has(e, "refused: 11.0 MB is over 10 MB");
});

test("with no file handler, or no read or import action, the import is off and says so, with no template link", async () => {
  for (const [b, more] of [[fixture("import"), {}], [{ ...fixture("import"), read: null }, { file: async () => ({ id: "x" }) }]]) {
    render(b, ctx({ screen: "t6", ...more }));
    await settle();
    const e = render(b, ctx({ screen: "t6", ...more }));
    has(e, "import is off here");
    strictEqual(button(e, "choose file").disabled, true);
    strictEqual(part(e, "btn"), undefined);
  }
});
