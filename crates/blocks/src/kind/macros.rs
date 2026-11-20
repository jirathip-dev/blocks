macro_rules! wire {
    ($(#[$m:meta])* pub struct $name:ident { $($body:tt)* }) => {
        wire!(@field [$(#[$m])* pub struct $name] [] $($body)*);
    };
    (@field [$($head:tt)*] [$($out:tt)*] $(#[$fm:meta])* $f:ident: Option<$t:ty>, $($rest:tt)*) => {
        wire!(@field [$($head)*] [$($out)* $(#[$fm])*
            #[serde(default, skip_serializing_if = "Option::is_none")] pub $f: Option<$t>,] $($rest)*);
    };
    (@field [$($head:tt)*] [$($out:tt)*] $(#[$fm:meta])* $f:ident: $t:ty, $($rest:tt)*) => {
        wire!(@field [$($head)*] [$($out)* $(#[$fm])* pub $f: $t,] $($rest)*);
    };
    (@field [$($head:tt)*] [$($out:tt)*]) => {
        #[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        $($head)* { $($out)* }
    };
}

macro_rules! words {
    ($(#[$m:meta])* $name:ident { $first:ident $(, $(#[$vm:meta])* $v:ident)* $(,)? }) => {
        $(#[$m])*
        #[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        #[serde(rename_all = "kebab-case")]
        pub enum $name {
            #[default]
            $first,
            $($(#[$vm])* $v,)*
            #[serde(untagged)]
            Other(String),
        }
    };
}

macro_rules! kind {
    ($(#[$m:meta])* pub struct $name:ident { $($body:tt)* }) => {
        kind!(@field [$(#[$m])* $name] [] [] [] $($body)*);
    };
    (@field $head:tt [$($out:tt)*] [$($req:tt)*] [$($opt:tt)*]
        $(#[$fm:meta])* $f:ident: Option<$t:ty>, $($rest:tt)*) => {
        kind!(@field $head [$($out)* $(#[$fm])*
            #[serde(default, skip_serializing_if = "Option::is_none")] pub $f: Option<$t>,]
            [$($req)*] [$($opt)* ($f $t)] $($rest)*);
    };
    (@field $head:tt [$($out:tt)*] [$($req:tt)*] [$($opt:tt)*] $(#[$fm:meta])* $f:ident: $t:ty, $($rest:tt)*) => {
        kind!(@field $head [$($out)* $(#[$fm])* pub $f: $t,] [$($req)* ($f $t)] [$($opt)*] $($rest)*);
    };
    (@field [$(#[$m:meta])* $name:ident] [$($out:tt)*] [$(($rf:ident $rt:ty))*] [$(($of:ident $ot:ty))*]) => {
        #[derive(Clone, Debug, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        $(#[$m])*
        pub struct $name {
            $($out)*
            #[serde(default, skip_serializing_if = "Option::is_none")]
            pub show: Option<$crate::expr::Expr>,
            #[serde(flatten)]
            pub more: $crate::kind::Fields,
        }

        impl $name {
            /// The kind with its required fields; a setter adds each optional one.
            #[must_use]
            pub fn new($($rf: impl Into<$rt>),*) -> Self {
                Self { $($rf: $rf.into(),)* ..<Self as Default>::default() }
            }

            $(
                #[must_use]
                pub fn $of(mut self, v: impl Into<$ot>) -> Self {
                    self.$of = Some(v.into());
                    self
                }
            )*

            #[must_use]
            pub fn show(mut self, e: $crate::expr::Expr) -> Self {
                self.show = Some(e);
                self
            }
        }
    };
}

macro_rules! field {
    ($(#[$m:meta])* pub struct $name:ident { $($body:tt)* }) => {
        kind! {
            $(#[$m])*
            pub struct $name {
                name: String,
                label: Option<String>,
                $($body)*
                doc: Option<String>,
                was: Option<String>,
                error: Option<String>,
                open: Option<bool>,
                enabled: Option<Expr>,
                checks: Option<Vec<Check>>,
            }
        }
    };
}

macro_rules! fields {
    ($($v:ident($t:ty) = $name:literal,)*) => {
        /// A form's field: an object whose `type` names its type; any other `type` is kept whole and drawn as text.
        #[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        #[serde(tag = "type")]
        pub enum Field {
            $(#[serde(rename = $name)] $v($t),)*
            #[serde(untagged)]
            Other(OtherField),
        }

        impl Field {
            /// The known types' names.
            pub const TYPES: &[&str] = &[$($name),*];

            /// Every word a field draws itself: the row's, then each type's.
            pub const WORDS: &[&[Word]] = &[ROW_WORDS, $(<$t>::WORDS),*];

            /// Each known type's role in the drawn tree, in `TYPES`' order.
            pub const ROLES: &[&str] = &[$(<$t>::ROLE),*];

            #[cfg(feature = "schema")]
            pub(crate) fn samples() -> Vec<Self> {
                vec![$(Self::$v(<$t>::sample())),*]
            }

            /// The field's name: its key in local state and in the values sent.
            pub fn name(&self) -> &str {
                match self {
                    $(Self::$v(f) => &f.name,)*
                    Self::Other(f) => &f.name,
                }
            }
        }

        $(impl From<$t> for Field {
            fn from(f: $t) -> Self {
                Self::$v(f)
            }
        })*
    };
}

macro_rules! kinds {
    ($($m:ident { $($v:ident($t:ty) = $name:literal),+ })*) => {
        $(mod $m; pub use $m::*;)*

        pub(super) fn samples() -> Vec<Block> {
            [$($m::sample()),*].concat()
        }

        kinds!(@list $($($v($t) = $name,)+)*);
    };
    (@list $($v:ident($t:ty) = $name:literal,)*) => {
        /// A block: an object whose `type` names its kind; any other `type` is an app's own.
        #[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        #[serde(tag = "type")]
        pub enum Block {
            $(#[serde(rename = $name)] $v(Box<$t>),)*
            #[serde(untagged)]
            App(Box<AppBlock>),
        }

        impl Block {
            /// The core kinds' `type` names.
            pub const KINDS: &[&str] = &[$($name),*];

            /// The block's `type`: a core kind's name, or an app's own.
            pub fn kind(&self) -> &str {
                match self {
                    $(Self::$v(_) => $name,)*
                    Self::App(b) => &b.kind,
                }
            }

            /// The block's id, when it has one.
            pub fn id(&self) -> Option<&str> {
                match self {
                    $(Self::$v(b) => b.id.as_deref(),)*
                    Self::App(b) => b.id.as_deref(),
                }
            }

            /// The fields of a core kind its type lacks: kept on the wire, a fault in a server's own screen.
            pub fn more(&self) -> Option<&Fields> {
                match self {
                    $(Self::$v(b) => Some(&b.more),)*
                    Self::App(_) => None,
                }
            }
        }
    };
}

macro_rules! listed {
    ($($at:literal: $v:ident($t:ty) = $name:literal),+ $(,)?) => {};
}
