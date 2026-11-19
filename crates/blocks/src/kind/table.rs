use std::cmp::Ordering;
use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Number;

use super::{Fallback, Fields, Label, Tap, Tone};
use crate::expr::Expr;

words!(ColumnKind {
    Text,
    Number,
    Money,
    Date,
    Tone,
    Bar
});
words!(Align { Start, End });
words!(Total { Sum, Avg, Count });
words!(PhonePart {
    Title,
    Tag,
    Value,
    Meta,
    Hide
});
words!(Era { Be });
words!(SortDir { Asc, Desc });
words!(ExportFormat { Csv, Xlsx });

/// A table cell: text (an ISO date's too), a number, or a toned label; a missing cell is blank.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Cell {
    Text(String),
    Number(Number),
    Label(Label),
}

wire! {
    /// A table's column: its id, header, kind, and how it aligns, formats, totals, sizes and shows on a phone.
    pub struct Column {
        id: String,
        label: String,
        kind: ColumnKind,
        align: Option<Align>,
        unit: Option<String>,
        digits: Option<u8>,
        currency: Option<String>,
        era: Option<Era>,
        max: Option<Number>,
        tone: Option<Tone>,
        total: Option<Total>,
        sort: Option<bool>,
        hide: Option<bool>,
        width: Option<u16>,
        phone: Option<PhonePart>,
    }
}

wire! {
    /// One row of a table: its id, its cells by column id, and what a tap on it does.
    pub struct TableRow {
        id: String,
        cells: BTreeMap<String, Cell>,
        tap: Option<Tap>,
    }
}

wire! {
    /// A table's starting order: one column, up or down.
    pub struct TableSort {
        by: String,
        dir: SortDir,
    }
}

wire! {
    /// An action on the ticked rows: it sends `{rows: [ids]}`.
    pub struct BulkAction {
        action: String,
        label: String,
        bad: Option<bool>,
    }
}

wire! {
    /// A table's row select: a tick box per row and its bulk actions.
    pub struct TableSelect {
        actions: Vec<BulkAction>,
    }
}

kind! {
    /// A data table: typed columns, rows by id, sort, filter, totals, row select and export.
    pub struct Table {
        id: Option<String>,
        title: Option<String>,
        columns: Vec<Column>,
        rows: Vec<TableRow>,
        sort: Option<TableSort>,
        filter: Option<bool>,
        empty: Option<String>,
        select: Option<TableSelect>,
        export: Option<Vec<ExportFormat>>,
    }
}

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const THAI: [&str; 12] = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
];

fn grouped(v: f64, digits: usize, fixed: bool) -> String {
    let s = format!("{:.*}", digits, v.abs());
    let (int, frac) = s.split_once('.').unwrap_or((&s, ""));
    let frac = if fixed { frac } else { frac.trim_end_matches('0') };
    let mut out = String::new();
    for (i, c) in int.chars().enumerate() {
        if i > 0 && (int.len().saturating_sub(i)) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    if !frac.is_empty() {
        out.push('.');
        out.push_str(frac);
    }
    if v < 0.0 && out.chars().any(|c| ('1'..='9').contains(&c)) {
        out.insert(0, '-');
    }
    out
}

fn date(iso: &str, be: bool, thai: bool) -> String {
    let mut p = iso.splitn(3, '-').map(|x| x.parse::<u32>().ok());
    let (Some(Some(y)), Some(Some(m)), Some(Some(d))) = (p.next(), p.next(), p.next()) else {
        return iso.into();
    };
    let names = if be && thai { &THAI } else { &MONTHS };
    let month = m.checked_sub(1).and_then(|i| names.get(usize::try_from(i).ok()?));
    let year = if be { y.saturating_add(543) } else { y };
    month.map_or_else(|| iso.into(), |n| format!("{d} {n} {year}"))
}

fn num(c: &Cell) -> Option<f64> {
    match c {
        Cell::Number(n) => n.as_f64(),
        _ => None,
    }
}

impl Column {
    fn numeric(&self) -> bool {
        matches!(self.kind, ColumnKind::Number | ColumnKind::Money | ColumnKind::Bar)
    }

    /// Whether the cells sit at the end: `align`, else end for number, money and bar.
    pub fn end(&self) -> bool {
        self.align.as_ref().map_or_else(|| self.numeric(), |a| *a == Align::End)
    }

    /// What the header shows after the label: a money column's sign (`THB` is ฿), else `unit`.
    pub fn unit(&self) -> Option<String> {
        if self.kind != ColumnKind::Money {
            return self.unit.clone();
        }
        let code = self.currency.as_deref()?;
        let sign = [("THB", "฿"), ("USD", "$"), ("EUR", "€")]
            .into_iter()
            .find(|(c, _)| *c == code);
        Some(sign.map_or(code, |(_, s)| s).into())
    }

    /// A number as the column draws it: en-US grouping, money to 2 decimals, else at most `digits` (2).
    pub fn number(&self, v: f64) -> String {
        if self.kind == ColumnKind::Money {
            return grouped(v, 2, true);
        }
        grouped(v, self.digits.map_or(2, usize::from), false)
    }

    /// A cell as drawn text; `thai` writes a Buddhist-Era date's month in Thai.
    pub fn shown(&self, c: &Cell, thai: bool) -> String {
        match c {
            Cell::Label(l) => l.text.clone(),
            Cell::Number(n) => self.number(n.as_f64().unwrap_or_default()),
            Cell::Text(s) if self.kind == ColumnKind::Date => date(s, self.era == Some(Era::Be), thai),
            Cell::Text(s) => s.clone(),
        }
    }

    /// The column's total over `rows`: its word (`avg`, `count`, or none for a sum) and value.
    pub fn total(&self, rows: &[&TableRow]) -> Option<(&'static str, String)> {
        let cells: Vec<&Cell> = rows.iter().filter_map(|r| r.cells.get(&self.id)).collect();
        let vs: Vec<f64> = cells.iter().filter_map(|c| num(c)).collect();
        let sum: f64 = vs.iter().sum();
        match self.total.as_ref()? {
            Total::Count => Some(("count", cells.len().to_string())),
            _ if vs.is_empty() => Some(("", "—".into())),
            Total::Avg => Some((
                "avg",
                grouped(sum / u32::try_from(vs.len()).map_or(f64::MAX, f64::from), 1, false),
            )),
            _ => Some(("", self.number(sum))),
        }
    }

    fn order(&self, a: &Cell, b: &Cell) -> Ordering {
        match (num(a), num(b)) {
            (Some(x), Some(y)) if self.numeric() => x.total_cmp(&y),
            _ => {
                let key = |c: &Cell| match c {
                    Cell::Text(s) if self.kind == ColumnKind::Date => s.clone(),
                    _ => self.shown(c, false).to_lowercase(),
                };
                key(a).cmp(&key(b))
            }
        }
    }
}

impl Table {
    /// The rows in `sort` order: stable, blank cells last both ways.
    pub fn sorted(&self) -> Vec<&TableRow> {
        let mut rows: Vec<&TableRow> = self.rows.iter().collect();
        let Some(s) = &self.sort else { return rows };
        let Some(c) = self.columns.iter().find(|c| c.id == s.by) else {
            return rows;
        };
        rows.sort_by(|a, b| match (a.cells.get(&c.id), b.cells.get(&c.id)) {
            (Some(x), Some(y)) if s.dir == SortDir::Desc => c.order(y, x),
            (Some(x), Some(y)) => c.order(x, y),
            (x, y) => x.is_none().cmp(&y.is_none()),
        });
        rows
    }

    /// A bar column's full length: its `max`, else the largest value in all rows (at least 1).
    pub fn bar_max(&self, c: &Column) -> f64 {
        let top = self.rows.iter().filter_map(|r| num(r.cells.get(&c.id)?));
        c.max
            .as_ref()
            .and_then(Number::as_f64)
            .unwrap_or_else(|| top.fold(1.0, f64::max))
    }

    /// Each column's part of a phone row: its `phone`, else the first text the title, the first tone the tag,
    /// the last number or money with a total (else the last) the value, the rest meta.
    pub fn roles(cols: &[&Column]) -> Vec<PhonePart> {
        let mut r: Vec<Option<PhonePart>> = cols.iter().map(|c| c.phone.clone()).collect();
        let has = |r: &[Option<PhonePart>], p: &PhonePart| r.iter().any(|x| x.as_ref() == Some(p));
        for (kind, part) in [(ColumnKind::Text, PhonePart::Title), (ColumnKind::Tone, PhonePart::Tag)] {
            let free = cols.iter().zip(&r).position(|(c, x)| x.is_none() && c.kind == kind);
            if let (false, Some(i)) = (has(&r, &part), free) {
                r.get_mut(i).into_iter().for_each(|x| *x = Some(part.clone()));
            }
        }
        let nums: Vec<usize> = (0..cols.len())
            .filter(|&i| {
                let c = cols.get(i);
                r.get(i).is_some_and(Option::is_none)
                    && c.is_some_and(|c| matches!(c.kind, ColumnKind::Number | ColumnKind::Money))
            })
            .collect();
        let totalled = nums
            .iter()
            .rev()
            .find(|&&i| cols.get(i).is_some_and(|c| c.total.is_some()));
        if let (false, Some(&i)) = (has(&r, &PhonePart::Value), totalled.or(nums.last())) {
            r.get_mut(i).into_iter().for_each(|x| *x = Some(PhonePart::Value));
        }
        r.into_iter().map(|x| x.unwrap_or(PhonePart::Meta)).collect()
    }

    /// What a client with no table view draws: the title, the first summed column's total, and the row count.
    pub fn fallback(&self) -> Fallback {
        let n = self.rows.len();
        let rows: Vec<&TableRow> = self.rows.iter().collect();
        let sum = self.columns.iter().find(|c| c.total == Some(Total::Sum));
        let total = sum.and_then(|c| {
            let (_, v) = c.total(&rows)?;
            Some(format!(
                "total {} {}{v}",
                c.label.to_lowercase(),
                c.unit().unwrap_or_default()
            ))
        });
        let count = format!("{n} row{}", if n == 1 { "" } else { "s" });
        Fallback {
            title: self.title.clone().unwrap_or_else(|| "Table".into()),
            subtitle: Some(total.map_or_else(|| count.clone(), |t| format!("{count} · {t}"))),
            tap: None,
        }
    }
}
