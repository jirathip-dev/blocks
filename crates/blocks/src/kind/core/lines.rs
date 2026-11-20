use std::collections::BTreeMap;


use crate::expr::Expr;
use crate::kind::sample::field;
use crate::kind::{Block, Field, Keyboard, LineItem, PickerField, RowError, Submit, TextField};

listed! { 22: Lines(Lines) = "lines" }

kind! {
    /// Repeating rows of fields with add and remove, running totals and a balance check.
    pub struct Lines {
        id: Option<String>,
        name: String,
        label: Option<String>,
        action: Option<String>,
        columns: Vec<Field>,
        items: Vec<LineItem>,
        calc: Option<BTreeMap<String, Expr>>,
        sum: Option<Vec<String>>,
        balance: Option<[String; 2]>,
        scale: Option<u8>,
        min: Option<u32>,
        max: Option<u32>,
        #[serde(rename = "add")]
        adds: Option<String>,
        empty: Option<String>,
        errors: Option<Vec<RowError>>,
        submit: Option<Submit>,
    }
}

fn lines() -> Lines {
    let money =
        |name: &str, label: &str| -> Field { TextField::new(name).label(label).keyboard(Keyboard::Number).into() };
    let account: Field = PickerField::new("account")
        .label("Account")
        .options(vec![
            "6100 Rent".into(),
            "6200 Utilities".into(),
            "2100 Payables".into(),
        ])
        .into();
    let row = |id: &str, values: &[(&str, &str)]| LineItem {
        id: id.into(),
        values: values.iter().map(|(k, v)| ((*k).to_string(), (*v).into())).collect(),
    };
    let rows = vec![
        row(
            "l1",
            &[("account", "6100 Rent"), ("memo", "office rent"), ("debit", "2400")],
        ),
        row(
            "l2",
            &[("account", ""), ("memo", "power and water"), ("debit", "318.40")],
        ),
        row(
            "l3",
            &[
                ("account", "2100 Payables"),
                ("memo", "landlord"),
                ("credit", "2668.50"),
            ],
        ),
    ];
    let columns = vec![
        account,
        field("memo", "Description"),
        money("debit", "Debit"),
        money("credit", "Credit"),
    ];
    let error = RowError {
        row: Some("l2".into()),
        name: Some("account".into()),
        message: "pick an account for line 2".into(),
    };
    Lines::new("lines", columns, rows)
        .id("journal")
        .label("journal lines")
        .action("check-journal")
        .sum(vec!["debit".to_string(), "credit".to_string()])
        .balance(["debit".to_string(), "credit".to_string()])
        .min(2_u32)
        .adds("add line")
        .errors(vec![error])
        .submit(Submit {
            label: "post entry".into(),
            action: "post-journal".into(),
            ..Submit::default()
        })
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Lines(Box::new(lines()))]
}
