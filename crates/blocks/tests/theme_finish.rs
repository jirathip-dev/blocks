use blocks::theme::{At, Finish, Rule, Variant, AXES};

#[test]
fn every_row_puts_declarations_only() {
    for axis in AXES {
        for (value, rows) in axis.values {
            for row in *rows {
                let named = row
                    .put
                    .as_bytes()
                    .windows(2)
                    .any(|w| w[0] == b'.' && w[1].is_ascii_alphabetic());
                assert!(
                    !row.put.contains(['{', '}']) && !named,
                    "{} {value}: {}",
                    axis.name,
                    row.put
                );
            }
        }
    }
}

#[test]
fn a_row_lands_on_every_selector_of_its_finish() {
    let put = |at| Rule::on(Finish::Button, "x:y").at(at).css();
    assert_eq!(put(At::Part), "button,a.btn{x:y}");
    assert_eq!(put(At::Before), "button::before,a.btn::before{x:y}");
    assert_eq!(put(At::Variant(Variant::Primary)), "button.primary,a.btn.primary{x:y}");
    assert_eq!(
        Rule::on(Finish::Surface, "x:y").at(At::After).css(),
        ":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl)::after{x:y}"
    );
}

#[test]
fn the_fourteen_finishes_have_distinct_names() {
    let mut names: Vec<&str> = Finish::ALL.map(Finish::name).to_vec();
    names.sort_unstable();
    names.dedup();
    assert_eq!(names.len(), 14);
}
