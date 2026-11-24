use crate::theme::{Axis, Finish, Rule};

pick!(
    /// How a tinted part is filled.
    pub Fills { Tint, Outline, Solid }
);

const OUTLINE: &[Rule] = &[Rule::on(
    Finish::Tint,
    "background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)",
)];

pub(super) const AXIS: Axis = Axis {
    name: "fills",
    values: &[("tint", &[]), ("outline", OUTLINE), ("solid", &[])],
    of: |s| match s.fills {
        Fills::Tint | Fills::Solid => &[],
        Fills::Outline => OUTLINE,
    },
};
