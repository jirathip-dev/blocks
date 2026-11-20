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
        #[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        $(#[$m])*
        pub struct $name {
            $($out)*
            #[serde(default, skip_serializing_if = "Option::is_none")]
            pub show: Option<Expr>,
            #[serde(flatten)]
            pub more: Fields,
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
            pub fn show(mut self, e: Expr) -> Self {
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
