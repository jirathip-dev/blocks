use blocks::site;
use blocks::Built;

fn chart(v: serde_json::Value) -> String {
    site::fragment(&Built::new(v), "/act")
}

#[test]
fn a_chart_writes_its_format_months_era_and_axis_and_posts_a_tapped_month_with_no_js() {
    let combo = chart(serde_json::json!({
        "type": "chart", "id": "rev", "title": "Revenue", "chart": "combo", "x": ["2024-02", "2024-03"],
        "era": "be", "format": "thb_m", "selected": "2024-03", "tap": {"action": "sales.month"},
        "series": [{"name": "Revenue", "values": [845_000, 12_345_678]}, {"name": "Target", "as": "line", "values": [1, 2]}]
    }));
    for want in [
        ">Mar 2567<",
        ">Feb 67<",
        "<b>฿12.3M</b>",
        "Feb 2567: Revenue ฿845K, Target ฿1",
        "aria-pressed=\"true\"",
        ">฿0</span>",
        "name=\"_action\" value=\"sales.month\"",
        "name=\"x\" value=\"2024-03\"",
        "class=\"chk chkl\"",
    ] {
        assert!(combo.contains(want), "{want} in {combo}");
    }
    let line = chart(serde_json::json!({
        "type": "chart", "title": "Margin", "chart": "line", "x": ["2023-10", "2023-11"], "lang": "th", "format": "percent",
        "series": [{"name": "FY", "values": [28.14, 33.5]}, {"name": "Last", "tone": "mute", "dash": true, "values": [30, 31]}]
    }));
    for want in [
        ">25%</span>",
        ">30%</span>",
        ">35%</span>",
        ">ต.ค. 2023<",
        "<b>33.5%</b>",
        "class=\"s dash\"",
        "var(--mute)",
        ">ตาราง<",
    ] {
        assert!(line.contains(want), "{want} in {line}");
    }
    assert!(!line.contains(">0%</span>"), "a line chart fits its axis to the data");
    let empty = chart(
        serde_json::json!({"type": "chart", "title": "Orders", "chart": "bar", "x": [], "series": [], "empty": "None yet"}),
    );
    assert!(empty.contains(">None yet<") && !empty.contains("chc"), "{empty}");
}

#[test]
fn a_donut_folds_all_but_its_four_biggest_slices_into_other_and_reads_a_picked_one() {
    let x = ["Payroll", "Stock", "Rent", "Ads", "Delivery", "Software", "Power"];
    let d = chart(serde_json::json!({
        "type": "chart", "title": "Spend", "chart": "donut", "x": x, "format": "thb", "selected": "Stock",
        "series": [{"name": "Spend", "values": [3_820_000, 2_950_000, 1_200_000, 640_000, 410_000, 180_000, 150_000]}]
    }));
    for want in [
        ">Other (3)<",
        ">฿740,000<",
        "class=\"chr sel\"",
        "<b>฿2,950,000</b><span>Stock</span>",
        "Payroll: ฿3,820,000, 41%",
    ] {
        assert!(d.contains(want), "{want} in {d}");
    }
    assert!(!d.contains(">Delivery<"), "a folded slice is in Other");
}
