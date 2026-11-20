use blocks::site;
use blocks::{Built, Screen};

fn invoice(qty: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "lines", "id": "inv", "name": "items", "label": "invoice lines", "add": "add item",
        "columns": [
            {"type": "text", "name": "qty", "label": "Qty", "keyboard": "number"},
            {"type": "text", "name": "price", "label": "Price", "keyboard": "number"},
            {"type": "text", "name": "amount", "label": "Amount", "keyboard": "number"},
            {"type": "text", "name": "paid", "label": "Paid", "keyboard": "number"}
        ],
        "calc": {"amount": {"mul": [{"get": "qty"}, {"get": "price"}]}},
        "sum": ["amount", "paid"], "balance": ["amount", "paid"],
        "items": [
            {"id": "a", "values": {"qty": qty, "price": "1,450.005", "paid": "2900.01"}},
            {"id": "b", "values": {"qty": "x", "price": "3", "paid": "0"}}
        ],
        "submit": {"label": "save", "action": "save-invoice"}
    })
}

#[test]
fn lines_work_out_calc_cells_and_totals_in_minor_units_and_check_the_balance() {
    let html = site::fragment(&Built::new(invoice("2")), "/act");
    assert!(
        html.contains(r#"<span class="lqv" data-row="a" data-cell="amount">2,900.01</span>"#),
        "{html}"
    );
    assert!(
        html.contains(r#"<span class="lqv" data-row="b" data-cell="amount">—</span>"#),
        "{html}"
    );
    assert!(html.contains("<b>2,900.01</b>"), "{html}");
    assert!(
        html.contains(r#"<p class="lqb ok" role="status">balanced · amount = paid</p>"#),
        "{html}"
    );
    assert!(
        html.contains(r#"value="1,450.005""#),
        "a field keeps what was typed: {html}"
    );
    assert!(
        !html.contains("lqw") && html.contains(r#"<button type="submit" form="b-f1" data-action="save-invoice">"#),
        "{html}"
    );
    let off = site::fragment(&Built::new(invoice("3")), "/act");
    assert!(off.contains("out of balance · paid short by 1,450.01"), "{off}");
    assert!(
        off.contains(r#"<p class="m lqw">balance the entry to save</p>"#),
        "{off}"
    );
    assert!(
        off.contains(r#"<button disabled="" type="submit" form="b-f1" data-action="save-invoice">"#),
        "{off}"
    );
}

#[test]
fn lines_mark_a_row_error_and_turn_remove_off_at_the_minimum() {
    let mut b = invoice("2");
    b["min"] = 2.into();
    b["errors"] =
        serde_json::json!([{"row": "b", "name": "qty", "message": "a number"}, {"row": "gone", "message": "old"}]);
    let html = site::fragment(&Built::new(b), "/act");
    assert!(
        html.contains(r#"<div class="lqr err" role="group" aria-label="line 2">"#),
        "{html}"
    );
    assert!(html.contains(r#"<label class="lqc num err"><span class="lqk">Qty</span><input name="items.1.qty" aria-label="Qty, line 2""#), "{html}");
    assert!(
        html.contains(r#"<p class="lqe">a number</p>"#) && !html.contains(">old<"),
        "{html}"
    );
    assert!(html.contains(r#"<p class="m lqw">fix 1 line to save</p>"#), "{html}");
    assert_eq!(
        html.matches(r#"aria-label="remove line 1" disabled"#).count(),
        1,
        "{html}"
    );
}

#[test]
fn a_lines_block_gets_a_fallback_named_by_its_label() {
    let lines = blocks::samples().into_iter().find(|(k, _)| *k == "lines").unwrap().1;
    let v = Built::of(&Screen::new().id("s").blocks(vec![lines])).value().clone();
    assert_eq!(v["blocks"][0]["fallback"]["title"], "journal lines");
}
