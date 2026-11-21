use std::ops::Range;

use egui::epaint::text::{ByteIndex, ByteRangeExt as _, LayoutSection, TextFormat};
use egui::text::LayoutJob;
use egui::Align;
use unicode_bidi::{BidiClass, BidiInfo, Level};

pub(super) const MARK: char = '\u{2060}';
const SPARE: &str = "\u{2063}";
const PAIRS: [(char, char); 6] = [('(', ')'), ('[', ']'), ('{', '}'), ('<', '>'), ('«', '»'), ('‹', '›')];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Script {
    Hebrew,
    Arabic,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Kind {
    Ltr,
    Word(Script),
    One,
    Newline,
}

#[derive(Clone, Debug)]
pub(super) struct Atom {
    pub(super) bytes: Range<usize>,
    pub(super) level: Level,
    pub(super) kind: Kind,
    pub(super) space: bool,
}

fn odd_number(c: char) -> bool {
    matches!(u32::from(c), 0x0600..=0x0605 | 0x066A..=0x066D | 0x06DD | 0x06F0..=0x06F9 | 0x08E2)
}

fn mirrored(c: char) -> char {
    PAIRS
        .iter()
        .find_map(|&(a, b)| (c == a).then_some(b).or((c == b).then_some(a)))
        .unwrap_or(c)
}

pub(super) fn cut(job: &LayoutJob, info: &BidiInfo<'_>) -> Vec<Atom> {
    let cuts: Vec<usize> = job.sections.iter().map(|s| s.byte_range.as_usize().start).collect();
    let mut out: Vec<Atom> = vec![];
    let mut strong = Script::Hebrew;
    for (at, c) in job.text.char_indices() {
        let level = info.levels.get(at).copied().unwrap_or_else(Level::ltr);
        let class = info.original_classes.get(at).copied().unwrap_or(BidiClass::L);
        let kind = match class {
            _ if c == '\n' => Kind::Newline,
            _ if !level.is_rtl() && odd_number(c) => Kind::One,
            _ if !level.is_rtl() => Kind::Ltr,
            BidiClass::R | BidiClass::AL => {
                strong = if class == BidiClass::R { Script::Hebrew } else { Script::Arabic };
                Kind::Word(strong)
            }
            BidiClass::NSM => Kind::Word(strong),
            _ if matches!(c, '\u{200C}' | '\u{200D}') => Kind::Word(strong),
            _ => Kind::One,
        };
        let end = at + c.len_utf8();
        match out.last_mut() {
            Some(a)
                if a.kind == kind
                    && a.level == level
                    && !matches!(kind, Kind::One | Kind::Newline)
                    && !cuts.contains(&at) =>
            {
                a.bytes.end = end;
            }
            _ => out.push(Atom {
                bytes: at..end,
                level,
                kind,
                space: kind == Kind::One && c.is_whitespace(),
            }),
        }
    }
    out
}

pub(super) fn shaped(job: &LayoutJob, atoms: &[Atom]) -> LayoutJob {
    let mut out = LayoutJob {
        text: String::new(),
        sections: vec![],
        halign: Align::LEFT,
        justify: false,
        ..job.clone()
    };
    let mut push = |text: &str, lead: f32, format: &TextFormat| {
        let start = out.text.len();
        out.text.push_str(text);
        out.sections.push(LayoutSection {
            leading_space: lead,
            byte_range: ByteIndex(start)..ByteIndex(out.text.len()),
            format: format.clone(),
        });
    };
    for a in atoms {
        let Some(section) = job.sections.iter().find(|s| s.byte_range.as_usize().contains(&a.bytes.start)) else {
            continue;
        };
        let lead = if section.byte_range.as_usize().start == a.bytes.start { section.leading_space } else { 0.0 };
        let text = job.text.get(a.bytes.clone()).unwrap_or_default();
        match a.kind {
            Kind::Newline => {
                push("\n", lead, &section.format);
                continue;
            }
            Kind::One if a.level.is_rtl() => push(&text.chars().map(mirrored).collect::<String>(), lead, &section.format),
            _ => push(&text.replace(MARK, SPARE), lead, &section.format),
        }
        push(&MARK.to_string(), 0.0, &section.format);
    }
    out
}
