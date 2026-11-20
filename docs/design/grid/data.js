/* The worked case for the previews: synergy's product mark-up (components/ProductPanel.tsx), trimmed to three groups. */
const G = (id, name) => ({ id, group: true, cells: { name } });
const I = (id, name, qty, price, mult, margin, final, more = {}) => ({ id, cells: { name, qty, price, mult, margin, final }, ...more });
const markup = {
  type: "table", id: "lines", title: "Mark-up · K-12 tower",
  export: ["xlsx"],
  columns: [
    { id: "name", label: "Item", kind: "text", edit: true, width: 22 },
    { id: "qty", label: "Qty", kind: "number", digits: 0, edit: true },
    { id: "price", label: "Unit cost", kind: "money", currency: "THB", edit: true, phone: "meta" },
    { id: "mult", label: "Mult", kind: "number", digits: 2, edit: true },
    { id: "cost", label: "Cost", kind: "money", currency: "THB", total: "sum" },
    { id: "margin", label: "Margin", unit: "%", kind: "number", digits: 1, edit: true },
    { id: "sell", label: "Price", kind: "money", currency: "THB", total: "sum" },
    { id: "final", label: "Final", kind: "money", currency: "THB", total: "sum" },
  ],
  calc: {
    cost: { mul: [{ get: "qty" }, { get: "price" }, { get: "mult" }] },
    sell: { div: [{ get: "cost" }, { sub: [1, { div: [{ get: "margin" }, 100] }] }] },
  },
  rows: [
    G("g-pipe", "Pipework"),
    I("p1", "Steel pipe 2in, sch 40", 40, 410, 1.05, 18, 21000),
    I("p2", "Elbow 2in 90°", 24, 95, 1.05, 22, 3100),
    I("p3", "Flange 2in", 16, 180, 1.05, 22, 3900),
    G("g-valve", "Valves"),
    I("v1", "Gate valve 3in", 4, 4200, 1.1, 15, 21800),
    I("v2", "Ball valve 2in", 6, 1650, 1.1, 15, 12800),
    I("v3", "Check valve 2in", 3, 2100, 1.1, 15, 8200),
    G("g-lab", "Labour"),
    I("l1", "Fitter, day", 6, 2400, 1, 25, 19200),
    I("l2", "Transport, by weight", 1, 5600, 1, 0, 5600, { fixed: true }),
  ],
  edit: { action: "set-cell", name: "cell" },
  reorder: { action: "order", name: "rows" },
};
const sub = (o) => ({ ...markup, ...o });
const settle = () => {
  document.querySelectorAll("main>*").forEach((t, i) => t.style.setProperty("--i", i));
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
};
