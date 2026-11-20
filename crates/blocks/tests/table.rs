use blocks::site::{self, Head, Look, Site};
use blocks::{
    apply, diff, samples, theme, Block, Built, Cell, Child, Column, ColumnKind, Op, Screen, Table, TableRow, Total,
};

fn invoices() -> Table {
    let (_, b) = samples().into_iter().find(|(k, _)| *k == "table").unwrap();
    let Block::Table(t) = b else { unreachable!() };
    *t
}

fn screen(t: Table) -> Block {
    Block::Screen(Box::new(Screen::new().id("s").blocks(vec![Block::Table(Box::new(t))])))
}

fn page(t: Table, lang: &str) -> String {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let style = std::fs::read_to_string(root.join("fixtures/styles/still.json")).unwrap();
    let look = Look {
        schemes: theme::default().clone(),
        style: serde_json::from_str(&style).unwrap(),
    };
    let head = Head {
        title: "t",
        description: "d",
        canonical: "https://x.test/",
        image: None,
        lang,
    };
    let s = Site {
        head,
        look: &look,
        css: &[],
        action: "/act",
        live: None,
    };
    let built = Built::new(serde_json::to_value(screen(t)).unwrap());
    site::page(&built, &s)
}

#[test]
fn diff_sends_a_changed_added_and_removed_row_as_row_ops_that_apply() {
    let old = invoices();
    let mut new = old.clone();
    new.rows.retain(|r| r.id != "INV-0136");
    new.rows[0].cells.insert("amount".into(), Cell::Number(1.into()));
    new.rows.insert(
        1,
        TableRow {
            id: "INV-0150".into(),
            cells: [("inv".to_string(), Cell::Text("INV-0150".into()))].into(),
            ..TableRow::default()
        },
    );
    let (a, b) = (screen(old), screen(new));
    let ops = diff(&a, &b);
    let kinds: Vec<&str> = ops
        .iter()
        .map(|o| match o {
            Op::Remove { id } | Op::Merge { id, .. } => id.as_str(),
            Op::Insert {
                block: Child::TableRow(r),
                into,
                before,
                ..
            } => {
                assert_eq!((into.as_str(), before.as_deref()), ("invoices", Some("INV-0138")));
                r.id.as_str()
            }
            other => panic!("not a row op: {other:?}"),
        })
        .collect();
    assert_eq!(kinds, ["INV-0136", "INV-0150", "INV-0133"]);
    let wire: Vec<Op> = serde_json::from_value(serde_json::to_value(&ops).unwrap()).unwrap();
    let mut s = a.clone();
    apply(&mut s, &wire).unwrap();
    assert_eq!(s, b);
}

#[test]
fn diff_replaces_the_table_when_its_columns_or_row_order_change() {
    let old = invoices();
    let mut moved = old.clone();
    moved.rows.reverse();
    let mut renamed = old.clone();
    renamed.columns[0].label = "No.".into();
    for new in [moved, renamed] {
        let ops = diff(&screen(old.clone()), &screen(new));
        assert!(
            matches!(ops.as_slice(), [Op::Replace { id, .. }] if id == "invoices"),
            "{ops:?}"
        );
    }
}

#[test]
fn a_client_with_no_table_view_gets_its_title_rows_and_first_sum() {
    let built = Built::of(&Screen::new().id("s").blocks(vec![Block::Table(Box::new(invoices()))]));
    let f = &built.value()["blocks"][0]["fallback"];
    assert_eq!(f["title"], "Invoices");
    assert_eq!(f["subtitle"], "5 rows · total amount ฿126,750.00");
    assert_eq!(built.check(&[]), vec![]);
}

#[test]
fn the_static_table_is_sorted_with_blanks_last_totalled_and_has_no_controls() {
    let html = page(invoices(), "en");
    let order: Vec<&str> = html
        .split("<tr class=\"tap\" data-id=\"")
        .skip(1)
        .map(|s| &s[..8])
        .collect();
    assert_eq!(order, ["INV-0133", "INV-0136", "INV-0138", "INV-0139", "INV-0143"]);
    assert!(html.contains("aria-sort=\"ascending\"><span>Due</span><i>↑</i>"));
    assert!(html.contains(">18 Oct 2569<"));
    assert!(html.contains("<span class=\"tag warn\">overdue</span>"));
    assert!(html.contains("<i style=\"width:53.3%\"></i></span>32<"));
    assert!(html.contains("data-l=\"Amount\">126,750.00</td></tr></tfoot>"));
    assert!(html.contains("<span>Amount</span><span class=\"tbu\">฿</span>"));
    for control in ["<input", "<select", "<button", "tbk"] {
        assert!(!html.contains(control), "{control}");
    }
    assert!(page(invoices(), "th").contains(">18 ต.ค. 2569<"));
}

#[test]
fn averages_counts_digits_and_an_empty_table_draw_as_designed() {
    let col = |id: &str, total: Total| Column {
        id: id.into(),
        label: id.into(),
        kind: ColumnKind::Number,
        digits: Some(1),
        total: Some(total),
        ..Column::default()
    };
    let row = |id: &str, v: Option<f64>| TableRow {
        id: id.into(),
        cells: v
            .map(|v| ["a", "c"].map(|k| (k.to_string(), Cell::Number(serde_json::Number::from_f64(v).unwrap()))))
            .into_iter()
            .flatten()
            .collect(),
        ..TableRow::default()
    };
    let t = Table::new(
        vec![
            Column {
                kind: ColumnKind::Text,
                ..col("n", Total::Count)
            },
            col("a", Total::Avg),
            col("c", Total::Count),
        ],
        vec![row("x", Some(1234.56)), row("y", Some(2.0)), row("z", None)],
    )
    .id("t");
    let html = page(t.clone(), "en");
    assert!(html.contains(">1,234.6<"), "{html}");
    assert!(html.contains("<span class=\"agg\">avg</span> 618.3<"));
    assert!(html.contains("<span class=\"agg\">count</span> 2<"));
    let empty = page(Table { rows: vec![], ..t }.empty("Nothing yet."), "en");
    assert!(empty.contains("<tr class=\"tbe\"><td colspan=\"3\">Nothing yet.</td></tr></tbody></table>"));
}
