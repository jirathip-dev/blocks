use blocks::{site, Block, Built};
use serde_json::Value;

fn answer(name: &str) -> Value {
    let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("../../fixtures/import/{name}.json"));
    serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap()
}

#[test]
fn the_server_answer_fixtures_are_import_blocks_that_round_trip_and_check_clean() {
    for name in ["good", "bad-rows", "wrong-columns", "refused"] {
        let v = answer(name);
        let b: Block = serde_json::from_value(v.clone()).unwrap();
        assert!(matches!(b, Block::Import(_)), "{name}");
        assert_eq!(serde_json::to_value(&b).unwrap(), v, "{name}");
        assert_eq!(Built::new(v).check(&[]), vec![], "{name}");
    }
}

#[test]
fn the_static_page_names_the_columns_keeps_the_template_and_shows_the_servers_refusal() {
    let h = site::fragment(&Built::new(answer("refused")), "/act");
    assert!(
        h.contains("<p class=\"fe\">An old .xls file: save it as .xlsx or .csv</p>"),
        "{h}"
    );
    assert!(
        h.contains("download=\"products.xlsx\" href=\"https://example.com/files/template-products.xlsx\""),
        "{h}"
    );
    assert!(
        h.contains("<b>SKU</b>, <span>Name</span>, <span>Category</span>, <b>Price ฿</b>"),
        "{h}"
    );
    assert!(!h.contains("<button") && !h.contains("<input"), "{h}");
}
