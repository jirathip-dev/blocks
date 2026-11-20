import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { all, ctx, fixture, part, render } from "../kit.ts";

const S = await import("../../src/sheet/index.ts");
const file = (name) => new Uint8Array(readFileSync(new URL(`../../../fixtures/import/${name}`, import.meta.url)));
const say = (k, v = {}) => `${k}${Object.values(v).length ? ` ${Object.values(v).join("|")}` : ""}`;
const cols = fixture("import").columns;
const picked = (name) => ({ name, arrayBuffer: async () => file(name).buffer.slice(0) });
const text = (e) => e.textContent;
const buttons = (e) => all(e).filter((x) => x.tagName === "BUTTON");

test("an .xlsx is read from its zip: the sheet the workbook names, shared and rich strings, entities, dates by their format, row numbers kept", async () => {
  const b = await S.read("good.xlsx", file("good.xlsx"), 1);
  deepStrictEqual([b.sheets, b.sheet, b.head], [["Cover", "Nov prices"], 1, ["Item code", "Name", "Category", "Price", "Best before", "Supplier"]]);
  deepStrictEqual(b.rows, [
    { n: 2, cells: ["BK-0101", "Sourdough loaf", "Bakery", "85", "2026-11-21"] },
    { n: 3, cells: ["BK-0102", "Butter croissant & jam", "Bakery", "45.5", "2026-11-22"] },
    { n: 5, cells: ["DA-0310", "Fresh milk 1 L", "Dairy", "52", "", "Farm <A>"] },
  ]);
  deepStrictEqual((await S.read("good.xlsx", file("good.xlsx"))).head, ["Cover sheet"]);
});

test("a good file maps by label, key or an also name and types its values; the extra header is not imported", async () => {
  const b = await S.read("good.xlsx", file("good.xlsx"), 1), map = S.match(cols, b.head);
  deepStrictEqual(map, { sku: 0, name: 1, cat: 2, price: 3 });
  const rows = S.check(cols, map, b.rows, say);
  deepStrictEqual(rows.map((r) => [r.n, r.values, r.bad]), [
    [2, { sku: "BK-0101", name: "Sourdough loaf", cat: "Bakery", price: 85 }, {}],
    [3, { sku: "BK-0102", name: "Butter croissant & jam", cat: "Bakery", price: 45.5 }, {}],
    [5, { sku: "DA-0310", name: "Fresh milk 1 L", cat: "Dairy", price: 52 }, {}],
  ]);
});

test("bad rows: a .csv with ; quotes and a BOM gives each row's reasons: not a number, not allowed, required, a repeated unique key", async () => {
  const b = await S.read("bad-rows.csv", file("bad-rows.csv"));
  deepStrictEqual([b.enc, b.head, b.rows[1].cells[1], b.rows[4].cells[1]], ["UTF-8", ["SKU", "Name", "Category", "Price"], 'Pandan "chiffon" cake', "Loaf; sliced"]);
  const rows = S.check(cols, S.match(cols, b.head), b.rows, say);
  deepStrictEqual(rows.map((r) => [r.n, r.bad]), [
    [2, {}],
    [3, { price: "imNotNum 12,5O" }],
    [4, { cat: "imNotOne Dry goods|Bakery, Dairy" }],
    [5, { sku: "imReq" }],
    [6, { sku: "imTwice BK-0101|2" }],
  ]);
  deepStrictEqual([rows[3].values.cat, rows[4].values.price], ["Dairy", 1250]);
  deepStrictEqual(S.check(cols, S.match(cols, b.head), b.rows.slice(0, 1), say, [{ row: 2, key: "price", text: "below cost" }])[0].bad, { price: "below cost" });
});

test("wrong columns: the required Price matches no header; a Thai .csv in Windows-874 is decoded; an old .xls and a stray file are refused", async () => {
  const w = await S.read("wrong-columns.csv", file("wrong-columns.csv"));
  deepStrictEqual(S.match(cols, w.head), { sku: -1, name: -1, cat: -1, price: -1 });
  deepStrictEqual(S.check(cols, S.match(cols, w.head), w.rows, say)[0].bad, { sku: "imReq", price: "imReq" });
  const th = await S.read("thai.csv", file("thai.csv"));
  deepStrictEqual([th.enc, th.head[1], th.rows[0].cells[1]], ["Windows-874", "ชื่อสินค้า", "ขนมปังโฮลวีต"]);
  deepStrictEqual([await S.read("old.xls", file("old.xls")), await S.read("notes.pdf", file("thai.csv"))], ["old", "not"]);
});

test("the template is an .xlsx this reader reads back: the declared columns, then the allowed values on their own sheet", async () => {
  const t = S.template("Import products", cols, say);
  const a = await S.read("t.xlsx", t), v = await S.read("t.xlsx", t, 1);
  deepStrictEqual([a.sheets, a.head, a.rows], [["Import products", "imValues"], ["SKU", "Name", "Category", "Price"], []]);
  deepStrictEqual([v.head, v.rows.map((r) => r.cells)], [["Category"], [["Bakery"], ["Dairy"]]]);
  ok(new TextDecoder().decode(t).includes('<c r="A1" s="1" t="inlineStr">'), "a required column's header is bold");
});

test("empty, the import is its drop area, its limits and the columns the file needs; with no action it is off", () => {
  const e = render(fixture("import"), ctx());
  deepStrictEqual([e.tagName, e.getAttribute("aria-label"), text(part(e, "imh"))], ["SECTION", "Import products", "Import productsdownload template"]);
  deepStrictEqual([text(part(e, "imd")), text(part(e, "imn"))], ["Drop a spreadsheet hereorchoose file.xlsx or .csv · up to 5,000 rows", "The file needs SKU, Price and may have Name, Category (Bakery, Dairy)"]);
  const off = render({ ...fixture("import"), id: "off", action: null }, ctx());
  deepStrictEqual(buttons(off).map((b) => b.disabled), [true, true]);
  ok(text(part(off, "imd")).includes("import is off here"));
  const th = render({ ...fixture("import"), id: "th" }, ctx({ locale: { lang: "th" } }));
  ok(text(part(th, "imd")).startsWith("วางไฟล์สเปรดชีตที่นี่"));
});

test("a picked file shows its columns, rows and errors; confirm asks, then sends the good rows typed as one action", async () => {
  const sent = [];
  const c = ctx({ act: async (a) => (sent.push(a), true) });
  const e = render({ ...fixture("import"), id: "pick" }, c);
  const input = all(e).find((x) => x.tagName === "INPUT");
  input.files = [picked("bad-rows.csv")];
  await input.onchange();
  deepStrictEqual(text(part(e, "fum")), "bad-rows.csv5 rows · UTF-8");
  deepStrictEqual(all(e).filter((x) => x.classList.contains("imx")).map(text), ["Price: “12,5O” is not a number", "Category: “Dry goods” is not one of Bakery, Dairy", "SKU: required", "SKU: BK-0101 is also on row 2"]);
  deepStrictEqual(text(part(e, "ima")), "4 rows with errors are left outimport 1 rows");
  buttons(part(e, "ima"))[0].onclick();
  ok(text(part(e, "ima")).startsWith("Import 1 rows into Products?"));
  buttons(part(e, "ima"))[1].onclick();
  ok(part(e, "im").classList.contains("busy"));
  await new Promise((r) => setTimeout(r, 0));
  deepStrictEqual(sent, [{ action: "import", block: "pick", values: { rows: [{ sku: "BK-0101", name: "Sourdough loaf", cat: "Bakery", price: 85 }], file: "bad-rows.csv", left: 4 } }]);
  const answered = render({ ...fixture("import"), id: "pick", done: 1 }, c);
  deepStrictEqual(text(part(answered, "imz")), "1rows imported into Products4 rows were left outdownload left-out rowsimport another file");
  buttons(part(answered, "imz"))[1].onclick();
  ok(part(answered, "imd"), "import another file goes back to the drop area");
});

test("wrong columns hold the import back until a column is picked; the app's refused rows become row errors", async () => {
  const e = render({ ...fixture("import"), id: "wrong" }, ctx());
  const input = all(e).find((x) => x.tagName === "INPUT");
  input.files = [picked("wrong-columns.csv")];
  await input.onchange();
  deepStrictEqual(all(e).filter((x) => x.classList.contains("no")).map((x) => text(part(x, "imk"))), ["SKU required", "Price required"]);
  const bar = part(e, "ima");
  deepStrictEqual([text(bar), buttons(bar)[0].disabled], ["pick a column for SKUnothing to import", true]);
  const pickAt = (i, value) => Object.assign(all(e).filter((x) => x.tagName === "SELECT")[i], { value }).onchange();
  pickAt(0, "0");
  pickAt(3, "-1");
  deepStrictEqual(text(part(e, "ima")), "pick a column for Pricenothing to import");
  pickAt(1, "1");
  pickAt(3, "1");
  deepStrictEqual(text(part(e, "ima")), "2 rows with errors are left outnothing to import");
  const refused = render({ ...fixture("import"), id: "wrong", refused: [{ row: 2, key: "sku", text: "already in Products" }] }, ctx());
  deepStrictEqual(all(refused).filter((x) => x.classList.contains("imx")).map(text)[0], "Price: “Sourdough loaf” is not a number · SKU: already in Products");
});
