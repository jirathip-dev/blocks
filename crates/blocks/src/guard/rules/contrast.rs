use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/contrast",
    severity: Severity::Error,
    since: 1,
    what: "text under 4.5:1 against what is drawn behind it (3:1 from 24 px, or 18.66 px bold); text over an image is skipped and counted",
    fix: "Use a token pair the scheme gate passes: `--fg` on `--bg`, or a tone's own pair.",
};
