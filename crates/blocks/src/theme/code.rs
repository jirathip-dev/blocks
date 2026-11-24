use std::collections::BTreeMap;
use std::fmt;
use std::str::FromStr;

use super::{
    Affix, Buttons, Easing, Fills, Format, LabelCase, LabelRole, Marks, Scale, Sections, Style, StyleLabel, Surface,
    TypeDesign,
};

const B64: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const STEPS: u32 = 17;
const SPAN: u32 = 3 * STEPS * STEPS * STEPS * 3 * 3 * 3 * 2 * 2 * 2;

/// Why a look code was refused.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CodeError {
    NotACode,
    Version(char),
    Newer,
    Labels,
    Scheme,
    OffStep(&'static str),
}

impl fmt::Display for CodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotACode => write!(f, "not a look code"),
            Self::Version(v) => write!(f, "version {v}: this reader takes 1"),
            Self::Newer => write!(f, "an axis value this reader does not know: made by a newer blocks"),
            Self::Labels => write!(f, "the labels part does not decode"),
            Self::Scheme => write!(f, "a scheme name is a-z, 0-9 and -, at most 32, and never default"),
            Self::OffStep(axis) => write!(f, "{axis} is off the code's quarter steps"),
        }
    }
}

impl std::error::Error for CodeError {}

/// The name of a scheme pair a look code refers to: a swag pack or the app's own; `default` is written as none.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SchemeName(String);

impl SchemeName {
    /// A name of `[a-z0-9][a-z0-9-]{0,31}` but `default`; any other is [`CodeError::Scheme`].
    pub fn new(name: &str) -> Result<Self, CodeError> {
        let word = |c: char| c.is_ascii_lowercase() || c.is_ascii_digit();
        let ok = name.len() <= 32
            && name.chars().next().is_some_and(word)
            && name.chars().all(|c| word(c) || c == '-')
            && name != "default";
        if ok {
            Ok(Self(name.to_string()))
        } else {
            Err(CodeError::Scheme)
        }
    }

    /// The name as written after the code's `.`.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// A whole look as one short versioned code: a style on quarter steps and the name of its scheme pair.
#[derive(Debug, Clone, PartialEq)]
pub struct LookCode {
    style: Style,
    scheme: Option<SchemeName>,
    code: String,
}

fn place<T: PartialEq>(all: &[T], v: &T) -> u32 {
    all.iter()
        .position(|x| x == v)
        .and_then(|i| u32::try_from(i).ok())
        .unwrap_or(0)
}

fn step(s: Scale, axis: &'static str) -> Result<u32, CodeError> {
    let x = f64::from(s);
    (0..STEPS)
        .find(|i| (f64::from(*i) / 4.0).to_bits() == x.to_bits())
        .ok_or(CodeError::OffStep(axis))
}

fn affix(out: &mut Vec<u8>, a: &Affix) {
    let t = String::from(a.clone()).into_bytes();
    out.push(u8::try_from(t.len()).unwrap_or(0));
    out.extend(t);
}

fn b64(bytes: &[u8]) -> String {
    let sym = |v: u32| B64.chars().nth(usize::try_from(v & 63).unwrap_or(0)).unwrap_or('A');
    bytes
        .chunks(3)
        .flat_map(|c| {
            let n = c.iter().zip([16, 8, 0]).fold(0, |n, (b, at)| n | u32::from(*b) << at);
            (0..=c.len()).map(move |k| sym(n >> (18 - 6 * k)))
        })
        .collect()
}

fn unb64(text: &str) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    let (mut acc, mut bits) = (0u32, 0u32);
    for c in text.chars() {
        acc = acc << 6 | u32::try_from(B64.find(c)?).ok()?;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(u8::try_from(acc >> bits & 0xff).ok()?);
            acc &= (1 << bits) - 1;
        }
    }
    Some(out)
}

fn labels(bytes: Vec<u8>) -> Option<BTreeMap<LabelRole, StyleLabel>> {
    let mut it = bytes.into_iter();
    let mut out = BTreeMap::new();
    while let Some(rc) = it.next() {
        let role = *LabelRole::ALL.get(usize::from(rc / 3))?;
        let case = *LabelCase::ALL.get(usize::from(rc % 3))?;
        let mut take = || {
            let len = usize::from(it.next()?);
            let t: Vec<u8> = it.by_ref().take(len).collect();
            let t = String::from_utf8(t).ok().filter(|t| t.len() == len)?;
            Affix::try_from(t).ok()
        };
        let label = StyleLabel {
            prefix: take()?,
            suffix: take()?,
            case,
        };
        out.insert(role, label);
    }
    Some(out)
}

fn pick<T: Copy>(all: &[T], n: &mut u32) -> Result<T, CodeError> {
    let radix = u32::try_from(all.len()).map_err(|_| CodeError::Newer)?;
    let i = usize::try_from(*n % radix).map_err(|_| CodeError::Newer)?;
    *n /= radix;
    all.get(i).copied().ok_or(CodeError::Newer)
}

fn scale(n: &mut u32) -> Result<Scale, CodeError> {
    let i = *n % STEPS;
    *n /= STEPS;
    Scale::try_from(f64::from(i) / 4.0).map_err(|_| CodeError::Newer)
}

impl LookCode {
    /// The code of `style` worn on `scheme` (none: blocks' own pair); [`CodeError::OffStep`] names an axis off a quarter step.
    pub fn new(style: Style, scheme: Option<SchemeName>) -> Result<Self, CodeError> {
        let digits = [
            (place(TypeDesign::ALL, &style.type_), 3),
            (step(style.space, "space")?, STEPS),
            (step(style.radius, "radius")?, STEPS),
            (step(style.motion, "motion")?, STEPS),
            (place(Easing::ALL, &style.easing), 3),
            (place(Surface::ALL, &style.surface), 3),
            (place(Fills::ALL, &style.fills), 3),
            (place(Buttons::ALL, &style.buttons), 2),
            (place(Marks::ALL, &style.marks), 2),
            (place(Sections::ALL, &style.sections), 2),
        ];
        let mut n = digits.iter().rev().fold(0, |n, (d, radix)| n * radix + d);
        let mut axes = ['0'; 5];
        for c in axes.iter_mut().rev() {
            *c = char::from_digit(n % 36, 36).unwrap_or('0');
            n /= 36;
        }
        let mut code: String = std::iter::once('1').chain(axes).collect();
        let mut bytes = Vec::new();
        for (role, l) in &style.labels {
            bytes.push(u8::try_from(place(LabelRole::ALL, role) * 3 + place(LabelCase::ALL, &l.case)).unwrap_or(0));
            affix(&mut bytes, &l.prefix);
            affix(&mut bytes, &l.suffix);
        }
        if !bytes.is_empty() {
            code = format!("{code}~{}", b64(&bytes));
        }
        if let Some(s) = &scheme {
            code = format!("{code}.{}", s.as_str());
        }
        Ok(Self { style, scheme, code })
    }

    /// The style, every axis set and `format` 2.
    #[must_use]
    pub const fn style(&self) -> &Style {
        &self.style
    }

    /// The scheme pair's name for the app to resolve; none is `theme::default()`.
    #[must_use]
    pub const fn scheme(&self) -> Option<&SchemeName> {
        self.scheme.as_ref()
    }
}

impl fmt::Display for LookCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.code)
    }
}

impl FromStr for LookCode {
    type Err = CodeError;

    fn from_str(code: &str) -> Result<Self, CodeError> {
        let (head, scheme) = code.split_once('.').map_or((code, None), |(h, s)| (h, Some(s)));
        let (head, packed) = head.split_once('~').map_or((head, None), |(h, l)| (h, Some(l)));
        let base36 = |c: char| c.is_ascii_lowercase() || c.is_ascii_digit();
        let b64ish = |l: &str| !l.is_empty() && l.chars().all(|c| B64.contains(c));
        let mut chars = head.chars();
        let version = chars.next().filter(|c| base36(*c)).ok_or(CodeError::NotACode)?;
        let axes = chars.as_str();
        if axes.len() != 5 || !axes.chars().all(base36) || !packed.is_none_or(b64ish) {
            return Err(CodeError::NotACode);
        }
        if version != '1' {
            return Err(CodeError::Version(version));
        }
        let scheme = scheme.map(SchemeName::new).transpose()?;
        let mut n = u32::from_str_radix(axes, 36).map_err(|_| CodeError::NotACode)?;
        if n >= SPAN {
            return Err(CodeError::Newer);
        }
        let labels = match packed {
            Some(l) => unb64(l).and_then(labels).ok_or(CodeError::Labels)?,
            None => BTreeMap::new(),
        };
        let style = Style {
            format: Format::try_from(2).map_err(|_| CodeError::Newer)?,
            type_: pick(TypeDesign::ALL, &mut n)?,
            space: scale(&mut n)?,
            radius: scale(&mut n)?,
            motion: scale(&mut n)?,
            easing: pick(Easing::ALL, &mut n)?,
            surface: pick(Surface::ALL, &mut n)?,
            fills: pick(Fills::ALL, &mut n)?,
            buttons: pick(Buttons::ALL, &mut n)?,
            marks: pick(Marks::ALL, &mut n)?,
            sections: pick(Sections::ALL, &mut n)?,
            labels,
        };
        let look = Self::new(style, scheme)?;
        if look.code == code {
            Ok(look)
        } else {
            Err(CodeError::Labels)
        }
    }
}
