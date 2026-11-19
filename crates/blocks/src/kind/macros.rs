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
