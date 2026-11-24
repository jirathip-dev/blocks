import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mock, test } from "node:test";
import { all, ctx, fixture, render } from "../kit.ts";

test("lines total in minor units as you type, work out a mul column, and turn the submit on once the entry balances", () => {
  const b = fixture("lines");
  const e = render(b, ctx({ screen: "lq1" }));
  const text = (cls) => all(e).filter((x) => x.classList.contains(cls)).map((x) => x.textContent);
  const go = () => all(e).find((x) => x.dataset.action === "post-journal");
  deepStrictEqual(text("lqb"), ["out of balance · credit short by 49.90"]);
  deepStrictEqual(text("lqw"), ["fix 1 line and balance the entry to post entry"]);
  ok(go().hasAttribute("disabled"));
  strictEqual(e.getAttribute("role"), "group");
  strictEqual(e.getAttribute("aria-label"), "journal lines");
  const credit = all(e).find((x) => x.getAttribute("aria-label") === "Credit, line 3");
  strictEqual(credit.value, "2,668.50");
  credit.value = "2,718.4";
  credit.oninput();
  deepStrictEqual(text("lqb"), ["balanced · debit = credit"]);
  deepStrictEqual(text("lqt"), ["totalDebit2,718.40Credit2,718.40"]);
  deepStrictEqual(text("lqw"), ["fix 1 line to post entry"]);
  const account = all(e).find((x) => x.getAttribute("aria-label") === "Account, line 2");
  strictEqual(account.getAttribute("aria-invalid"), "true");
  const inv = {
    type: "lines", id: "inv", name: "items", columns: [{ type: "text", name: "qty", keyboard: "number" }, { type: "text", name: "price", keyboard: "number" }, { type: "text", name: "amount" }],
    calc: { amount: { mul: [{ get: "qty" }, { get: "price" }] } }, sum: ["amount"], items: [{ id: "a", values: { qty: "2", price: "450" } }, { id: "b", values: { qty: "3", price: "0.1" } }],
  };
  const i = render(inv, ctx({ screen: "lq1" }));
  deepStrictEqual(all(i).filter((x) => x.classList.contains("lqv")).map((x) => x.textContent), ["900.00", "0.30"]);
  const qty = all(i).find((x) => x.getAttribute("aria-label") === "qty, line 2");
  qty.value = "1,000";
  qty.oninput();
  deepStrictEqual(all(i).filter((x) => x.classList.contains("lqv")).map((x) => x.textContent), ["900.00", "100.00"]);
  strictEqual(all(i).find((x) => x.classList.contains("lqt")).textContent, "totalamount1,000.00");
  strictEqual(all(i).some((x) => x.classList.contains("lqx")), false, "no add, no remove");
});

test("lines add a row at the end, remove one down to the minimum, and post the check 400ms after the last change", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const posts = [];
  const c = ctx({ screen: "lq2", act: async (a) => (posts.push(a), true) });
  const b = { ...fixture("lines"), max: 4 };
  const e = render(b, c);
  const rows = () => all(e).filter((x) => x.classList.contains("lqr")).map((x) => x.getAttribute("aria-label"));
  const add = all(e).find((x) => x.textContent === "add line" && x.tagName === "BUTTON");
  add.onclick();
  deepStrictEqual(rows(), ["line 1", "line 2", "line 3", "line 4"]);
  ok(all(e).find((x) => x.textContent === "add line" && x.tagName === "BUTTON").hasAttribute("disabled"), "at max");
  mock.timers.tick(399);
  strictEqual(posts.length, 0);
  const memo = all(e).find((x) => x.getAttribute("aria-label") === "Description, line 4");
  memo.value = "fees";
  memo.oninput();
  mock.timers.tick(400);
  strictEqual(posts.length, 1);
  strictEqual(posts[0].action, "check-journal");
  deepStrictEqual(posts[0].values.lines[3], { id: "new-4", values: { account: "", memo: "fees", debit: "", credit: "" } });
  all(e).find((x) => x.getAttribute("aria-label") === "remove line 1").onclick();
  all(e).find((x) => x.getAttribute("aria-label") === "remove line 1").onclick();
  deepStrictEqual(rows(), ["line 1", "line 2"]);
  ok(all(e).find((x) => x.getAttribute("aria-label") === "remove line 1").hasAttribute("disabled"), "at min");
  const again = render({ ...b, errors: [] }, c);
  deepStrictEqual(
    all(again).filter((x) => x.getAttribute("aria-label")?.startsWith("Description")).map((x) => x.value),
    ["landlord", "fees"],
    "a redraw with new errors keeps the draft",
  );
  mock.timers.reset();
});

test("lines with no rows say so and total zero", () => {
  const e = render({ ...fixture("lines"), items: [], errors: [] }, ctx({ screen: "lq3" }));
  strictEqual(all(e).find((x) => x.classList.contains("empty")).textContent, "no lines yet");
  strictEqual(all(e).find((x) => x.classList.contains("lqt")).textContent, "totalDebit0.00Credit0.00");
});
