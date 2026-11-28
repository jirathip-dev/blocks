use crate::theme::{Axis, Finish, LabelRole, Rule};

pick!(
    /// How a section's header shows.
    pub Sections { Title, Quiet }
);

const QUIET: &[Rule] = &[
    Rule::on(
        Finish::Label(LabelRole::Header),
        "font-size:var(--fs-meta);font-weight:400",
    ),
    Rule::on(
        Finish::Label(LabelRole::Section),
        "font-size:var(--fs-meta);font-weight:400",
    ),
];

pub(super) const AXIS: Axis = Axis {
    name: "sections",
    values: &[("title", &[]), ("quiet", QUIET)],
    of: |s| match s.sections {
        Sections::Title => &[],
        Sections::Quiet => QUIET,
    },
};
