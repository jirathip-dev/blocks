/* Sample OT requests and notifications for the previews. */
const OK = { text: "approved", tone: "ok" }, WAIT = { text: "pending", tone: "warn" }, NO = { text: "rejected", tone: "bad" };
const PEOPLE = ["Somchai P.", "Nattaya K.", "Arthit W.", "Pimchanok S.", "Kittipong R.", "Wanida T.", "Thanawat C.", "Supaporn L.", "Chaiwat M.", "Ratchanee B."];
const DEPTS = ["Line 2", "Warehouse", "QA", "Line 1", "Maintenance"];
function ot(i) {
  const who = PEOPLE[(i * 7) % PEOPLE.length];
  const hours = [2, 3, 1.5, 4, 2.5, 3, 2][i % 7];
  const day = 20 - Math.floor(i / 4);
  const m = day > 0 ? 11 : 10, d = day > 0 ? day : 31 + day;
  const status = i % 11 === 3 ? NO : i < 9 ? WAIT : OK;
  return { id: `OT-${String(2400 - i)}`, cells: { req: `OT-${2400 - i}`, who, dept: DEPTS[(i * 3) % DEPTS.length], date: `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, hours, status, pay: Math.round(hours * 1.5 * 81.25 * 100) / 100 }, tap: { open: `ot/${2400 - i}` } };
}
const otRows = (from, to) => Array.from({ length: to - from }, (_, k) => ot(from + k));
const otTable = (rows, o = {}) => ({
  type: "table", id: "ot", title: "OT requests", empty: "No OT requests yet.",
  select: { actions: [{ action: "approve", label: "approve" }, { action: "reject", label: "reject", bad: true }] },
  export: ["csv"],
  more: { action: "ot-more", cursor: "c:2351" },
  columns: [
    { id: "req", label: "Request", kind: "text", phone: "meta" },
    { id: "who", label: "Employee", kind: "text", phone: "title" },
    { id: "dept", label: "Team", kind: "text" },
    { id: "date", label: "Date", kind: "date" },
    { id: "status", label: "Status", kind: "tone" },
    { id: "hours", label: "Hours", kind: "number", digits: 1, total: "sum" },
    { id: "pay", label: "Pay", kind: "money", currency: "THB", total: "sum" },
  ],
  rows,
  ...o,
});
const NOTES = [
  ["Your OT request OT-2398 was approved", "by Wanida T. · Line 2"],
  ["Shift swap with Arthit W. is waiting for you", "Sat 22 Nov · night shift"],
  ["SES survey closes on Friday", "3 questions left"],
  ["Payslip for October is ready", "open it in Pay"],
  ["Leave on 28 Nov was rejected", "the line is short that day", "bad"],
  ["New safety notice for the warehouse", "read before your next shift"],
  ["Your OT request OT-2361 is pending", "with Chaiwat M."],
];
const ago = (i) => (i < 3 ? `${(i + 1) * 12} min` : i < 20 ? `${Math.floor(i / 2)} h` : `${Math.floor(i / 6)} d`);
const note = (i) => { const [t, s, tone] = NOTES[i % NOTES.length]; return { id: `n${i}`, title: t, subtitle: s, tone, value: ago(i) }; };
const settle = () => { document.body.dataset.h = Math.ceil(document.documentElement.scrollHeight); };
