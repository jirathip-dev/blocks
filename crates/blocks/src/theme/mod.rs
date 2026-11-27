macro_rules! pick {
    ($(#[$m:meta])* pub $name:ident { $first:ident $(, $v:ident)* $(,)? }) => {
        $(#[$m])*
        #[derive(Debug, Clone, Copy, Default, PartialEq, Eq, PartialOrd, Ord, serde::Serialize, serde::Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        #[serde(rename_all = "kebab-case")]
        pub enum $name {
            #[default]
            $first,
            $($v,)*
        }

        impl $name {
            /// Every value, in the order the schema lists them.
            pub const ALL: &'static [Self] = &[Self::$first, $(Self::$v),*];
        }
    };
}

mod axis;
mod code;
mod css;
mod finish;
mod gate;
mod pack;
mod scheme;
mod style;

pub use axis::{buttons::Buttons, fills::Fills, marks::Marks, sections::Sections, surface::Surface, AXES};
pub use code::{CodeError, LookCode, SchemeName};
pub use css::css;
pub use finish::{At, Axis, Finish, LabelCase, LabelRole, Rule, Variant};
pub use gate::{gate, Miss};
pub use pack::{check_pack, Theme};
pub use scheme::{default, Hex, Mode, PerMode, Scheme, Tokens, DEFAULT_STYLE};
pub use style::{Affix, Easing, Format, Scale, Style, StyleLabel, TypeDesign};
