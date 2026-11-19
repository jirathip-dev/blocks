use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Number, Value};

/// A plain value, written bare: null, a switch, a number or a string.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Lit {
    #[default]
    Null,
    Bool(bool),
    Num(Number),
    Str(String),
}

/// A screen's local state: a value by key.
pub type State = BTreeMap<String, Lit>;

/// A named test of a value; never a regex.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "kebab-case")]
pub enum Pattern {
    Filled,
    Email,
    Url,
    Number,
    #[serde(untagged)]
    Other(String),
}

/// A value and the pattern it is tested against.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Match {
    pub value: Expr,
    pub pattern: Pattern,
}

/// The behaviour language: a tree sent like any field, `{"get":"email"}` or a bare value.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum Expr {
    Get(String),
    Not(Box<Expr>),
    All(Vec<Expr>),
    Any(Vec<Expr>),
    Eq(Box<[Expr; 2]>),
    Lt(Box<[Expr; 2]>),
    Len(Box<Expr>),
    Has(Box<[Expr; 2]>),
    Is(Box<Match>),
    Add(Box<[Expr; 2]>),
    Sub(Box<[Expr; 2]>),
    Mul(Box<[Expr; 2]>),
    Div(Box<[Expr; 2]>),
    Cat(Vec<Expr>),
    Pick(Box<[Expr; 3]>),
    #[serde(untagged)]
    Lit(Lit),
    #[serde(untagged)]
    #[cfg_attr(feature = "schema", schemars(skip))]
    Unknown(Map<String, Value>),
}

impl Default for Expr {
    fn default() -> Self {
        Self::Lit(Lit::Null)
    }
}

impl Expr {
    /// Whether every operation and pattern in the tree is one this version knows; an unknown one counts as absent.
    pub fn known(&self) -> bool {
        let all = |xs: &[Expr]| xs.iter().all(Expr::known);
        match self {
            Self::Lit(_) | Self::Get(_) => true,
            Self::Not(x) | Self::Len(x) => x.known(),
            Self::All(xs) | Self::Any(xs) | Self::Cat(xs) => all(xs),
            Self::Eq(p) | Self::Lt(p) | Self::Has(p) | Self::Add(p) | Self::Sub(p) | Self::Mul(p) | Self::Div(p) => {
                all(&**p)
            }
            Self::Is(m) => !matches!(m.pattern, Pattern::Other(_)) && m.value.known(),
            Self::Pick(p) => all(&**p),
            Self::Unknown(_) => false,
        }
    }
}

fn flag(l: &Lit) -> Option<bool> {
    match l {
        Lit::Null => Some(false),
        Lit::Bool(b) => Some(*b),
        _ => None,
    }
}

fn num(f: f64) -> Lit {
    if !f.is_finite() {
        return Lit::Null;
    }
    match format!("{f}").parse::<i64>() {
        Ok(i) => Lit::Num(i.into()),
        Err(_) => Number::from_f64(f).map_or(Lit::Null, Lit::Num),
    }
}

fn shown(f: f64) -> String {
    let sci = format!("{:e}", f.abs());
    let (m, x) = sci.split_once('e').unwrap_or((&sci, "0"));
    let digits: String = m.chars().filter(char::is_ascii_digit).collect();
    let k = i64::try_from(digits.len()).unwrap_or(0);
    let n = x.parse::<i64>().unwrap_or(0) + 1;
    let zeros = |c: i64| "0".repeat(usize::try_from(c).unwrap_or(0));
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", zeros(n - k))
    } else if 0 < n && n <= 21 {
        let (a, b) = digits
            .split_at_checked(usize::try_from(n).unwrap_or(0))
            .unwrap_or((&digits, ""));
        format!("{a}.{b}")
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", zeros(-n))
    } else {
        let (a, b) = digits.split_at_checked(1).unwrap_or((&digits, ""));
        let dot = if b.is_empty() { "" } else { "." };
        format!("{a}{dot}{b}e{}{}", if n > 0 { "+" } else { "-" }, (n - 1).abs())
    };
    format!("{}{body}", if f < 0.0 { "-" } else { "" })
}

pub(crate) fn text(l: &Lit) -> String {
    match l {
        Lit::Null => String::new(),
        Lit::Bool(b) => b.to_string(),
        Lit::Num(n) => n.as_f64().map(shown).unwrap_or_default(),
        Lit::Str(s) => s.clone(),
    }
}

fn email(s: &str) -> bool {
    let Some((user, host)) = s.split_once('@') else {
        return false;
    };
    let dot = host.find('.').is_some_and(|i| i > 0 && i + 1 < host.len()) && !host.ends_with('.');
    !user.is_empty() && dot && !host.contains('@') && !s.chars().any(char::is_whitespace)
}

fn url(s: &str) -> bool {
    let rest = s.strip_prefix("https://").or_else(|| s.strip_prefix("http://"));
    rest.is_some_and(|r| !r.is_empty() && !r.starts_with('/') && !s.chars().any(char::is_whitespace))
}

fn is(l: &Lit, p: &Pattern) -> Lit {
    Lit::Bool(match (p, l) {
        (Pattern::Filled, Lit::Null) => false,
        (Pattern::Filled, Lit::Str(s)) => !s.trim().is_empty(),
        (Pattern::Filled, _) | (Pattern::Number, Lit::Num(_)) => true,
        (Pattern::Number, Lit::Str(s)) => !s.trim().is_empty() && s.trim().parse::<f64>().is_ok_and(f64::is_finite),
        (Pattern::Email, Lit::Str(s)) => email(s),
        (Pattern::Url, Lit::Str(s)) => url(s),
        _ => return Lit::Null,
    })
}

/// The value of `e` in `state`; total: a wrong type gives null, null is false, it never panics.
pub fn eval(e: &Expr, state: &State) -> Lit {
    let of = |x: &Expr| eval(x, state);
    let both = |[a, b]: &[Expr; 2]| (of(a), of(b));
    let nums = |p: &[Expr; 2]| match both(p) {
        (Lit::Num(a), Lit::Num(b)) => a.as_f64().zip(b.as_f64()),
        _ => None,
    };
    let flags = |xs: &[Expr]| xs.iter().map(|x| flag(&of(x))).collect::<Option<Vec<bool>>>();
    let bool_or_null = |b: Option<bool>| b.map_or(Lit::Null, Lit::Bool);
    match e {
        Expr::Lit(l) => l.clone(),
        Expr::Get(k) => state.get(k).cloned().unwrap_or_default(),
        Expr::Not(x) => bool_or_null(flag(&of(x)).map(|b| !b)),
        Expr::All(xs) => bool_or_null(flags(xs).map(|v| v.into_iter().all(|b| b))),
        Expr::Any(xs) => bool_or_null(flags(xs).map(|v| v.into_iter().any(|b| b))),
        Expr::Eq(p) => Lit::Bool(match both(p) {
            (Lit::Num(a), Lit::Num(b)) => a.as_f64() == b.as_f64(),
            (a, b) => a == b,
        }),
        Expr::Lt(p) => match both(p) {
            (Lit::Num(a), Lit::Num(b)) => bool_or_null(a.as_f64().zip(b.as_f64()).map(|(a, b)| a < b)),
            (Lit::Str(a), Lit::Str(b)) => Lit::Bool(a < b),
            _ => Lit::Null,
        },
        Expr::Len(x) => match of(x) {
            Lit::Str(s) => Lit::Num(s.chars().count().into()),
            _ => Lit::Null,
        },
        Expr::Has(p) => match both(p) {
            (Lit::Str(a), Lit::Str(b)) => Lit::Bool(a.contains(&b)),
            _ => Lit::Null,
        },
        Expr::Is(m) => is(&of(&m.value), &m.pattern),
        Expr::Add(p) => nums(p).map_or(Lit::Null, |(a, b)| num(a + b)),
        Expr::Sub(p) => nums(p).map_or(Lit::Null, |(a, b)| num(a - b)),
        Expr::Mul(p) => nums(p).map_or(Lit::Null, |(a, b)| num(a * b)),
        Expr::Div(p) => nums(p).map_or(Lit::Null, |(a, b)| num(a / b)),
        Expr::Cat(xs) => Lit::Str(xs.iter().map(|x| text(&of(x))).collect()),
        Expr::Pick(p) => {
            let [c, a, b] = &**p;
            match flag(&of(c)) {
                Some(true) => of(a),
                Some(false) => of(b),
                None => Lit::Null,
            }
        }
        Expr::Unknown(_) => Lit::Null,
    }
}
