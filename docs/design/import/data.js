// Preview-only fixtures: a shop's product list. The screen declares its columns; the file brings its own headers.
const COLUMNS = [
  { key: "sku", label: "SKU", type: "text", required: true, unique: true, also: ["item code", "code"] },
  { key: "name", label: "Name", type: "text", required: true, also: ["description", "product"] },
  { key: "cat", label: "Category", type: "choice", values: ["Bakery", "Dairy", "Produce", "Pantry"], also: ["group"] },
  { key: "price", label: "Price ฿", type: "money", required: true, also: ["unit price"] },
  { key: "stock", label: "Stock", type: "number", also: ["qty on hand"] },
  { key: "exp", label: "Best before", type: "date", also: ["expires"] },
];
const HEADERS = ["Item code", "Description", "Group", "Unit price", "Qty on hand", "Best before", "Supplier"];
const MAP = { sku: "Item code", name: "Description", cat: "Group", price: "Unit price", stock: "Qty on hand", exp: "Best before" };
const SAMPLE = { sku: "BK-0101, BK-0102", name: "Sourdough loaf, Butter croissant", cat: "Bakery, Dairy", price: "85.00, 45.00", stock: "24, 60", exp: "21 Nov 2026, 22 Nov 2026" };
const r = (n, sku, name, cat, price, stock, exp, bad) => ({ n, cells: { sku, name, cat, price, stock, exp }, bad });
const CLEAN = [
  r(2, "BK-0101", "Sourdough loaf", "Bakery", 85, 24, "2026-11-21"),
  r(3, "BK-0102", "Butter croissant", "Bakery", 45, 60, "2026-11-22"),
  r(4, "DA-0310", "Fresh milk 1 L", "Dairy", 52, 140, "2026-11-28"),
  r(5, "DA-0311", "Greek yoghurt 450 g", "Dairy", 119, 36, "2026-12-04"),
  r(6, "PR-0042", "Hom Mali rice 5 kg", "Pantry", 245, 80, ""),
  r(7, "PR-0043", "Fish sauce 700 ml", "Pantry", 38, 210, "2027-08-30"),
  r(8, "VG-0007", "Morning glory, bunch", "Produce", 15, 90, "2026-11-23"),
];
const ERRS = [
  r(14, "BK-0114", "Pandan chiffon cake", "Bakery", "?12,5O", 12, "2026-11-24", { price: "“12,5O” is not a number" }),
  r(87, "PR-0187", "Dried shrimp 100 g", "?Dry goods", 89, 40, "2027-02-10", { cat: "“Dry goods” is not one of Bakery, Dairy, Produce, Pantry" }),
  r(203, "", "Coconut milk 400 ml", "Pantry", 32, 300, "2027-05-01", { sku: "required" }),
  r(251, "BK-0102", "Butter croissant ×6", "Bakery", 250, 10, "2026-11-22", { sku: "BK-0102 is also on row 3" }),
];
const PRODUCTS = {
  title: "Import products", into: "Products", columns: COLUMNS, headers: HEADERS, map: MAP, sample: SAMPLE, extra: ["Supplier"], max: 5000,
  file: { name: "price-list-nov.xlsx", size: "84 KB", rows: 48, sheet: "Sheet1" }, rows: CLEAN, phase: "review",
};
const WITH_ERRS = Object.assign({}, PRODUCTS, {
  file: { name: "price-list-dec.xlsx", size: "212 KB", rows: 312, sheet: "Prices" },
  rows: [...CLEAN.slice(0, 3), ...ERRS], errs: 4,
});
const BASES = { PRODUCTS, WITH_ERRS };
const TH = Object.assign({}, PRODUCTS, {
  lang: "th", title: "นำเข้าสินค้า", into: "สินค้า",
  columns: [
    { key: "sku", label: "รหัส", type: "text", required: true },
    { key: "name", label: "ชื่อสินค้า", type: "text", required: true },
    { key: "cat", label: "หมวด", type: "choice", values: ["เบเกอรี่", "นม", "ผักผลไม้", "ของแห้ง"] },
    { key: "price", label: "ราคา ฿", type: "money", required: true },
  ],
  headers: ["รหัสสินค้า", "ชื่อสินค้า", "หมวด", "ราคาขาย"], map: { sku: "รหัสสินค้า", name: "ชื่อสินค้า", cat: "หมวด", price: "ราคาขาย" },
  sample: { sku: "BK-0101, BK-0102", name: "ขนมปังโฮลวีต, ครัวซองต์เนย", cat: "เบเกอรี่, นม", price: "85.00, 45.00" }, extra: [],
  file: { name: "รายการราคา.csv", size: "9 KB", rows: 120, sheet: "" }, errs: 1,
  rows: [
    { n: 2, cells: { sku: "BK-0101", name: "ขนมปังโฮลวีต", cat: "เบเกอรี่", price: 85 } },
    { n: 3, cells: { sku: "BK-0102", name: "ครัวซองต์เนย", cat: "เบเกอรี่", price: 45 } },
    { n: 4, cells: { sku: "DA-0310", name: "นมสด 1 ลิตร", cat: "?นมสด", price: 52 }, bad: { cat: "“นมสด” ไม่อยู่ในรายการ เบเกอรี่, นม, ผักผลไม้, ของแห้ง" } },
  ],
});
const WRONG = Object.assign({}, PRODUCTS, {
  file: { name: "stock-count.csv", size: "6 KB", rows: 96, sheet: "" },
  headers: ["Code", "Product", "Shelf", "Counted"], map: { sku: "Code", name: "Product", stock: "Counted" },
  sample: { sku: "BK-0101, BK-0102", name: "Sourdough loaf, Butter croissant", stock: "24, 60" }, extra: ["Shelf"],
  rows: CLEAN.slice(0, 3).map(r => ({ n: r.n, cells: r.cells })),
});
const SHEETS = Object.assign({}, PRODUCTS, { file: { name: "supplier-catalogue-2026.xlsx", size: "1.4 MB", rows: 48, sheet: "Nov prices", sheets: ["Cover", "Nov prices", "Dec prices"] }, rows: CLEAN.slice(0, 2) });
Object.assign(BASES, { TH, WRONG, SHEETS });
