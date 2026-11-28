use crate::theme::{At, Axis, Finish, Rule};

pick!(
    /// Whether a mark is a symbol or its text.
    pub Marks { Symbols, Text }
);

const TEXT: &[Rule] = &[
    Rule::on(Finish::Mark, "width:auto;font-size:0"),
    Rule::on(Finish::Mark, "content:attr(data-mark);font-size:var(--fs-meta)").at(At::After),
];

pub(super) const AXIS: Axis = Axis {
    name: "marks",
    values: &[("symbols", &[]), ("text", TEXT)],
    of: |s| match s.marks {
        Marks::Symbols => &[],
        Marks::Text => TEXT,
    },
};
