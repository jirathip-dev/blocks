/* Sample invoices for the previews. */
const C = (t, tone) => ({ text: t, tone });
const PAID = C("paid", "ok"), SENT = C("sent", "done"), LATE = C("overdue", "warn"), DRAFT = C("draft", "mute"), DISPUTED = C("disputed", "bad");
const inv = (id, client, status, issued, due, hours, amount) => ({ id, cells: { inv: id, client, status, issued, due, hours, amount }, tap: { open: `invoice/${id}` } });
const invoices = {
  type: "table", id: "invoices", title: "Invoices", empty: "No invoices yet.",
  sort: { by: "due", dir: "asc" },
  columns: [
    { id: "inv", label: "Invoice", kind: "text", phone: "meta" },
    { id: "client", label: "Client", kind: "text", phone: "title" },
    { id: "status", label: "Status", kind: "tone" },
    { id: "issued", label: "Issued", kind: "date", phone: "hide" },
    { id: "due", label: "Due", kind: "date" },
    { id: "hours", label: "Hours", kind: "number", digits: 1, total: "sum" },
    { id: "amount", label: "Amount", unit: "฿", kind: "number", total: "sum" },
  ],
  rows: [
    inv("INV-0131", "Tidewater Bakery", PAID, "2026-09-02", "2026-10-02", 14, 21000),
    inv("INV-0133", "Orchard Lane Clinic", LATE, "2026-09-18", "2026-10-18", 32.5, 48750),
    inv("INV-0134", "Kestrel Studio", PAID, "2026-09-30", "2026-10-30", 8, 12000),
    inv("INV-0136", "Bluepeak Logistics", DISPUTED, "2026-10-06", "2026-11-05", 21, 31500),
    inv("INV-0137", "Moss Hill School", LATE, "2026-10-12", "2026-11-11", 6.5, 9750),
    inv("INV-0138", "Saffron & Salt", SENT, "2026-10-20", "2026-11-19", 12, 18000),
    inv("INV-0139", "Tidewater Bakery", PAID, "2026-10-27", "2026-11-26", 10, 15000),
    inv("INV-0140", "Orchard Lane Clinic", SENT, "2026-11-03", "2026-12-03", 40, 60000),
    inv("INV-0141", "Kestrel Studio", SENT, "2026-11-10", "2026-12-10", 4, 6000),
    inv("INV-0142", "Bluepeak Logistics", SENT, "2026-11-16", "2026-12-16", 18, 27000),
    inv("INV-0143", "Moss Hill School", DRAFT, null, null, 9, 13500),
    inv("INV-0144", "Saffron & Salt", DRAFT, null, null, null, null),
  ],
};
const prevInvoices = { "INV-0139": { ...invoices.rows[6].cells, status: SENT } };
const settle = () => {
  document.querySelectorAll("main>*").forEach((t, i) => t.style.setProperty("--i", i));
  document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight);
};
