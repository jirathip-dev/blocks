use crate::theme::{At, Axis, Finish, Rule, Variant};

pick!(
    /// How a button is drawn: the renderer's plain button, or a filled primary and quiet ghost buttons with no brackets.
    pub Buttons { Plain, Filled }
);

const FILLED: &[Rule] = &[
    Rule::on(Finish::Button, "content:none").at(At::Before),
    Rule::on(Finish::Button, "content:\"\"").at(At::After),
    Rule::on(
        Finish::Button,
        "background:var(--l);color:var(--bg);padding:0 var(--s3);font-weight:600",
    )
    .at(At::Variant(Variant::Primary)),
];

pub(super) const AXIS: Axis = Axis {
    name: "buttons",
    values: &[("plain", &[]), ("filled", FILLED)],
    of: |s| match s.buttons {
        Buttons::Plain => &[],
        Buttons::Filled => FILLED,
    },
};
