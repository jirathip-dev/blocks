use crate::theme::{Axis, Finish, Rule};

pick!(
    /// How a card's surface is drawn.
    pub Surface { Glass, Dashed, Solid }
);

const DASHED: &[Rule] = &[Rule::on(Finish::Surface, "border-style:dashed")];
const SOLID: &[Rule] = &[Rule::on(Finish::Surface, "border-width:2px")];

pub(super) const AXIS: Axis = Axis {
    name: "surface",
    values: &[("glass", &[]), ("dashed", DASHED), ("solid", SOLID)],
    of: |s| match s.surface {
        Surface::Glass => &[],
        Surface::Dashed => DASHED,
        Surface::Solid => SOLID,
    },
};
