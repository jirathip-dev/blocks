use super::Style;

pick!(
    /// The case a label is set in.
    pub LabelCase { AsIs, Lower, Upper }
);

impl LabelCase {
    /// The `text-transform` this case draws with.
    #[must_use]
    pub const fn css(self) -> &'static str {
        match self {
            Self::AsIs => "none",
            Self::Lower => "lowercase",
            Self::Upper => "uppercase",
        }
    }
}

pick!(
    /// A label a style may decorate.
    pub LabelRole { Kind, Header, Group, Section, Title, Button, Chip, Back, Said, Picked }
);

/// A named way the look draws a part.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Finish {
    Surface,
    Tint,
    Button,
    Mark,
    Label(LabelRole),
}

impl Finish {
    /// Every finish: the four parts, then a label for each `LabelRole`.
    pub const ALL: [Self; 14] = [
        Self::Surface,
        Self::Tint,
        Self::Button,
        Self::Mark,
        Self::Label(LabelRole::Kind),
        Self::Label(LabelRole::Header),
        Self::Label(LabelRole::Group),
        Self::Label(LabelRole::Section),
        Self::Label(LabelRole::Title),
        Self::Label(LabelRole::Button),
        Self::Label(LabelRole::Chip),
        Self::Label(LabelRole::Back),
        Self::Label(LabelRole::Said),
        Self::Label(LabelRole::Picked),
    ];

    /// The finish's name: `surface`, `tint`, `button`, `mark` or `<role>-label`.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Surface => "surface",
            Self::Tint => "tint",
            Self::Button => "button",
            Self::Mark => "mark",
            Self::Label(LabelRole::Kind) => "kind-label",
            Self::Label(LabelRole::Header) => "header-label",
            Self::Label(LabelRole::Group) => "group-label",
            Self::Label(LabelRole::Section) => "section-label",
            Self::Label(LabelRole::Title) => "title-label",
            Self::Label(LabelRole::Button) => "button-label",
            Self::Label(LabelRole::Chip) => "chip-label",
            Self::Label(LabelRole::Back) => "back-label",
            Self::Label(LabelRole::Said) => "said-label",
            Self::Label(LabelRole::Picked) => "picked-label",
        }
    }

    /// The selector the web draws this finish on; `None` for a finish no part wears yet.
    #[must_use]
    pub const fn selector(self) -> Option<&'static str> {
        match self {
            Self::Surface => Some(":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl)"),
            Self::Tint => Some(".chips button.on,.spi.done .spm"),
            Self::Button => Some("button,a.btn"),
            Self::Mark => Some(".spi.done .spm"),
            Self::Label(LabelRole::Header) => Some(".sec>.sh"),
            Self::Label(LabelRole::Section) => Some(".sh"),
            Self::Label(LabelRole::Title) => Some(":is(.ch>b,.rt)"),
            Self::Label(LabelRole::Button) => Some(".b-button>span"),
            Self::Label(LabelRole::Chip) => Some(".chips button>span"),
            Self::Label(LabelRole::Picked) => Some(".dgn.picked .dgl"),
            Self::Label(LabelRole::Kind | LabelRole::Group | LabelRole::Back | LabelRole::Said) => None,
        }
    }
}

/// The one variant a finish has today.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Variant {
    Primary,
}

/// Where on the part a row lands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum At {
    Part,
    Before,
    After,
    Variant(Variant),
}

impl At {
    const fn suffix(self) -> &'static str {
        match self {
            Self::Part => "",
            Self::Before => "::before",
            Self::After => "::after",
            Self::Variant(Variant::Primary) => ".primary",
        }
    }
}

/// One row of a style value: declarations on a finish.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rule {
    pub on: Finish,
    pub at: At,
    pub put: &'static str,
}

impl Rule {
    /// A row on the part itself.
    #[must_use]
    pub const fn on(on: Finish, put: &'static str) -> Self {
        Self { on, at: At::Part, put }
    }

    /// The same row at `at`.
    #[must_use]
    pub const fn at(self, at: At) -> Self {
        Self { at, ..self }
    }

    /// The CSS this row writes; empty on a finish no part wears.
    #[must_use]
    pub fn css(self) -> String {
        write(self.on, self.at, self.put)
    }
}

pub(super) fn write(on: Finish, at: At, put: &str) -> String {
    let Some(selector) = on.selector() else {
        return String::new();
    };
    let mut out = String::new();
    let mut depth = 0u8;
    for c in selector.chars() {
        match c {
            '(' => depth = depth.saturating_add(1),
            ')' => depth = depth.saturating_sub(1),
            ',' if depth == 0 => out.push_str(at.suffix()),
            _ => {}
        }
        out.push(c);
    }
    format!("{out}{}{{{put}}}", at.suffix())
}

/// One axis, as `css` and the codegen read it.
pub struct Axis {
    pub name: &'static str,
    pub values: &'static [(&'static str, &'static [Rule])],
    pub of: fn(&Style) -> &'static [Rule],
}
