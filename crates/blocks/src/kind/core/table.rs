use std::cmp::Ordering;
use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::expr::{eval, Expr, Lit};
use crate::gesture::{Dir, Nudge, Rules, Word};
use crate::kind::{Block, Era, Fallback, Gesture, Label, Shown, Tap, Tone};

listed! { 28: Table(Table) = "table" }

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
        edit: Option<bool>,
    }
}

wire! {
    /// One row of a table: its id, its cells by column id, what a tap on it does, whether it stays put, or heads a group.
    pub struct TableRow {
        id: String,
        cells: BTreeMap<String, Cell>,
        tap: Option<Tap>,
        fixed: Option<bool>,
        group: Option<bool>,
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
        edit: Option<Gesture>,
        reorder: Option<Gesture>,
        calc: Option<BTreeMap<String, Expr>>,
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
            Cell::Label(l) => match &l.text {
                Shown::Text(s) => s.clone(),
                Shown::Number(n) => n.to_string(),
                Shown::Time(t) => t
                    .label
                    .as_deref()
                    .unwrap_or_default()
                    .replace("{}", "")
                    .replace("{rel}", "")
                    .trim()
                    .into(),
                Shown::Get(_) => String::new(),
            },
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
    /// The rows worked out by `calc`, in `sort` order: stable, items sorted within their group, blank cells last both ways.
    pub fn sorted(&self) -> Vec<TableRow> {
        let rows: Vec<TableRow> = self.rows.iter().map(|r| self.worked(r)).collect();
        let Some(s) = &self.sort else { return rows };
        let Some(c) = self.columns.iter().find(|c| c.id == s.by) else {
            return rows;
        };
        let by = |a: &TableRow, b: &TableRow| match (a.cells.get(&c.id), b.cells.get(&c.id)) {
            (Some(x), Some(y)) if s.dir == SortDir::Desc => c.order(y, x),
            (Some(x), Some(y)) => c.order(x, y),
            (x, y) => x.is_none().cmp(&y.is_none()),
        };
        let mut out = vec![];
        let mut run: Vec<TableRow> = vec![];
        for r in rows {
            if r.is_group() {
                run.sort_by(by);
                out.append(&mut run);
                out.push(r);
            } else {
                run.push(r);
            }
        }
        run.sort_by(by);
        out.append(&mut run);
        out
    }

    /// A group row's subtotal for a column with a `total`: over its items in `rows`, up to the next group row.
    pub fn subtotal(c: &Column, rows: &[TableRow], at: usize) -> Option<(&'static str, String)> {
        let items: Vec<&TableRow> = rows.iter().skip(at + 1).take_while(|r| !r.is_group()).collect();
        c.total(&items)
    }

    /// A bar column's full length: its `max`, else the largest value in all rows (at least 1).
    pub fn bar_max(&self, c: &Column) -> f64 {
        let top = self.rows.iter().filter_map(|r| num(r.cells.get(&c.id)?));
        c.max
            .as_ref()
            .and_then(Number::as_f64)
            .unwrap_or_else(|| top.fold(1.0, f64::max))
    }

    /// Each column's part of a phone row: its `phone`, else a first text title, tone tag, (totalled) number value.
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

    /// What a client with no table view draws: the title, the first summed column's total, and the item row count.
    pub fn fallback(&self) -> Fallback {
        let worked: Vec<TableRow> = self
            .rows
            .iter()
            .filter(|r| !r.is_group())
            .map(|r| self.worked(r))
            .collect();
        let n = worked.len();
        let rows: Vec<&TableRow> = worked.iter().collect();
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

/// What a cell edit gives: the row, the column and the cell's new value.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct CellEdit {
    pub row: String,
    pub column: String,
    pub value: Cell,
}

/// What a table's gesture grabs: one cell to type into, or a row by its handle.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GridGrab {
    Cell { row: String, column: String },
    Row(String),
}

/// How far a grab reaches: the typed text for a cell, a number of rows for a row.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GridReach {
    Text(String),
    Rows(i64),
}

/// What a table's gesture gives: one cell's new value, or every row id in the new order.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GridChange {
    Cell(CellEdit),
    Order(Vec<String>),
}

const STEPS: [(&str, Dir, bool); 4] = [
    ("Move up", Dir::Up, false),
    ("Move down", Dir::Down, false),
    ("Move to top", Dir::Up, true),
    ("Move to bottom", Dir::Down, true),
];

fn lit(c: &Cell) -> Lit {
    match c {
        Cell::Number(n) => Lit::Num(n.clone()),
        Cell::Text(s) => Lit::Str(s.clone()),
        Cell::Label(l) => match &l.text {
            Shown::Text(s) => Lit::Str(s.clone()),
            Shown::Number(n) => Lit::Num(n.clone()),
            _ => Lit::Null,
        },
    }
}

fn whole(f: f64) -> Option<Number> {
    format!("{f}")
        .parse::<i64>()
        .map_or_else(|_| Number::from_f64(f), |i| Some(i.into()))
}

fn iso(s: &str) -> bool {
    let p: Vec<&str> = s.split('-').collect();
    let digits = |x: &&str, n: usize| x.len() == n && x.chars().all(|c| c.is_ascii_digit());
    matches!(p.as_slice(), [y, m, d] if digits(y, 4) && digits(m, 2) && digits(d, 2))
}

impl Column {
    /// The cell a typed text gives: a number (commas allowed), an ISO date or text; none when the column can't take it.
    pub fn parse(&self, text: &str) -> Option<Cell> {
        match self.kind {
            ColumnKind::Number | ColumnKind::Money => {
                let t: String = text.chars().filter(|c| *c != ',' && !c.is_whitespace()).collect();
                let body = t.strip_prefix(['+', '-']).unwrap_or(&t);
                let (int, frac) = body.split_once('.').unwrap_or((body, ""));
                let digits = |p: &str| p.chars().all(|c| c.is_ascii_digit());
                let ok = !(int.is_empty() && frac.is_empty()) && digits(int) && digits(frac);
                ok.then(|| t.parse::<f64>().ok().and_then(whole).map(Cell::Number))?
            }
            ColumnKind::Date => iso(text.trim()).then(|| Cell::Text(text.trim().into())),
            ColumnKind::Text => Some(Cell::Text(text.into())),
            _ => None,
        }
    }
}

impl TableRow {
    /// Whether the row heads a group: the item rows after it, up to the next group row, are its items.
    pub fn is_group(&self) -> bool {
        self.group == Some(true)
    }
}

fn chunks(order: &[String], head: impl Fn(&str) -> bool) -> (Vec<String>, Vec<Vec<String>>) {
    let mut prefix = vec![];
    let mut out: Vec<Vec<String>> = vec![];
    for id in order {
        match out.last_mut() {
            _ if head(id) => out.push(vec![id.clone()]),
            Some(c) => c.push(id.clone()),
            None => prefix.push(id.clone()),
        }
    }
    (prefix, out)
}

impl Table {
    fn row(&self, id: &str) -> Option<&TableRow> {
        self.rows.iter().find(|r| r.id == id)
    }

    fn head(&self, id: &str) -> bool {
        self.row(id).is_some_and(TableRow::is_group)
    }

    fn column(&self, id: &str) -> Option<&Column> {
        self.columns.iter().find(|c| c.id == id)
    }

    /// Whether a column's cells are typed into: `edit`, not worked out by `calc`, and a kind a text can give.
    pub fn editable(&self, c: &Column) -> bool {
        let worked = self.calc.as_ref().is_some_and(|m| m.contains_key(&c.id));
        let typed = matches!(
            c.kind,
            ColumnKind::Text | ColumnKind::Number | ColumnKind::Money | ColumnKind::Date
        );
        c.edit == Some(true) && !worked && typed
    }

    /// A row's name: its first column's cell as drawn, else its id.
    pub fn name(&self, r: &TableRow) -> String {
        let first = self.columns.first();
        let shown = first.and_then(|c| Some(c.shown(r.cells.get(&c.id)?, false)));
        shown.filter(|s| !s.is_empty()).unwrap_or_else(|| r.id.clone())
    }

    /// A row with each `calc` column worked out by `expr`, in column order; a group row as it is.
    pub fn worked(&self, r: &TableRow) -> TableRow {
        let mut out = r.clone();
        let Some(calc) = self.calc.as_ref().filter(|_| !r.is_group()) else {
            return out;
        };
        for c in &self.columns {
            let Some(e) = calc.get(&c.id) else { continue };
            let state = out.cells.iter().map(|(k, v)| (k.clone(), lit(v))).collect();
            match eval(e, &state) {
                Lit::Num(n) => out.cells.insert(c.id.clone(), Cell::Number(n)),
                Lit::Str(s) => out.cells.insert(c.id.clone(), Cell::Text(s)),
                _ => out.cells.remove(&c.id),
            };
        }
        out
    }

    fn order(&self) -> Vec<String> {
        self.rows.iter().map(|r| r.id.clone()).collect()
    }

    fn item_to(&self, from: &[String], grab: &str, to: usize) -> Option<Vec<String>> {
        let mut rest: Vec<String> = from.iter().filter(|i| *i != grab).cloned().collect();
        let to = to.min(rest.len());
        let first = rest.iter().position(|i| self.head(i));
        if first.is_some_and(|g| to <= g) {
            return None;
        }
        rest.insert(to, grab.into());
        Some(rest)
    }

    fn group_to(&self, from: &[String], grab: &str, to: usize) -> Option<Vec<String>> {
        let (mut out, mut all) = chunks(from, |i| self.head(i));
        let at = all.iter().position(|c| c.first().is_some_and(|i| i == grab))?;
        let it = all.remove(at);
        all.insert(to.min(all.len()), it);
        out.extend(all.into_iter().flatten());
        Some(out)
    }

    fn rows_to(&self, from: &[String], grab: &str, rows: i64) -> Option<Vec<String>> {
        let at = i64::try_from(from.iter().position(|i| i == grab)?).ok()?;
        let t = at.saturating_add(rows).max(0);
        if !self.head(grab) {
            return self.item_to(from, grab, usize::try_from(t).ok()?);
        }
        let (prefix, all) = chunks(from, |i| self.head(i));
        let mut start = i64::try_from(prefix.len()).ok()?;
        let mut best = (i64::MAX, 0);
        for (j, c) in all.iter().filter(|c| c.first().is_none_or(|i| i != grab)).enumerate() {
            best = best.min(((start - t).abs(), j));
            start += i64::try_from(c.len()).ok()?;
        }
        let last = all.len().saturating_sub(1);
        best = best.min(((start - t).abs(), last));
        self.group_to(from, grab, best.1)
    }

    fn nudged(&self, from: &[String], grab: &str, by: Nudge) -> Option<Vec<String>> {
        let (up, big) = match by.dir {
            Dir::Up => (true, by.big),
            Dir::Down => (false, by.big),
            Dir::Left | Dir::Right => return None,
        };
        let out = if self.head(grab) {
            let (_, all) = chunks(from, |i| self.head(i));
            let at = all.iter().position(|c| c.first().is_some_and(|i| i == grab))?;
            let to = match (up, big) {
                (true, true) => 0,
                (true, false) => at.checked_sub(1)?,
                (false, true) => all.len().saturating_sub(1),
                (false, false) => at + 1,
            };
            self.group_to(from, grab, to)?
        } else {
            let at = from.iter().position(|i| i == grab)?;
            let to = match (up, big) {
                (true, true) => from.iter().position(|i| self.head(i)).map_or(0, |g| g + 1),
                (true, false) => at.checked_sub(1)?,
                (false, true) => from.len(),
                (false, false) => at + 1,
            };
            self.item_to(from, grab, to)?
        };
        (out != from).then_some(out)
    }

    fn place(&self, grab: &str, order: &[String]) -> String {
        let name = self.row(grab).map_or_else(|| grab.to_string(), |r| self.name(r));
        let at = order.iter().position(|i| i == grab).unwrap_or_default();
        let (_, all) = chunks(order, |i| self.head(i));
        if self.head(grab) {
            let k = all.iter().position(|c| c.first().is_some_and(|i| i == grab));
            return format!("{name}, {} of {}", k.map_or(0, |k| k + 1), all.len());
        }
        let mine = all.iter().find(|c| c.iter().any(|i| i == grab));
        let head = mine.and_then(|c| c.first()).and_then(|g| self.row(g));
        match (mine, head) {
            (Some(c), Some(g)) => {
                let i = c.iter().position(|i| i == grab).unwrap_or_default();
                format!("{name}, {i} of {} in {}", c.len().saturating_sub(1), self.name(g))
            }
            _ => format!("{name}, {} of {}", at + 1, order.len()),
        }
    }
}

impl Rules for Table {
    type Grab = GridGrab;
    type Reach = GridReach;
    type Change = GridChange;

    fn word(&self, grab: &GridGrab) -> Option<Word> {
        let free = |id: &str| self.row(id).filter(|r| r.fixed != Some(true));
        match grab {
            GridGrab::Cell { row, column } => {
                let cell = free(row).filter(|r| !r.is_group()).and(self.column(column));
                (self.edit.is_some() && cell.is_some_and(|c| self.editable(c))).then_some(Word::Edit)
            }
            GridGrab::Row(id) => (self.reorder.is_some() && free(id).is_some()).then_some(Word::Reorder),
        }
    }

    fn start(&self, grab: &GridGrab) -> Option<GridChange> {
        self.word(grab)?;
        Some(match grab {
            GridGrab::Cell { row, column } => GridChange::Cell(CellEdit {
                row: row.clone(),
                column: column.clone(),
                value: self
                    .row(row)?
                    .cells
                    .get(column)
                    .cloned()
                    .unwrap_or(Cell::Text(String::new())),
            }),
            GridGrab::Row(_) => GridChange::Order(self.order()),
        })
    }

    fn candidate(&self, grab: &GridGrab, reach: &GridReach) -> Option<GridChange> {
        match (self.start(grab)?, reach) {
            (GridChange::Cell(e), GridReach::Text(t)) => Some(GridChange::Cell(CellEdit {
                value: self.column(&e.column)?.parse(t)?,
                ..e
            })),
            (GridChange::Order(o), GridReach::Rows(n)) => {
                let GridGrab::Row(id) = grab else { return None };
                self.rows_to(&o, id, *n).map(GridChange::Order)
            }
            _ => None,
        }
    }

    fn nudge(&self, grab: &GridGrab, from: &GridChange, by: Nudge) -> Option<GridChange> {
        self.word(grab)?;
        match (grab, from) {
            (GridGrab::Row(id), GridChange::Order(o)) => self.nudged(o, id, by).map(GridChange::Order),
            _ => None,
        }
    }

    fn steps(&self, grab: &GridGrab) -> Vec<(String, Nudge)> {
        let Some(start) = self.start(grab) else { return vec![] };
        let all = STEPS
            .iter()
            .map(|(name, dir, big)| ((*name).to_string(), Nudge { dir: *dir, big: *big }));
        all.filter(|(_, n)| self.nudge(grab, &start, *n).is_some()).collect()
    }

    fn says(&self, grab: &GridGrab, change: &GridChange) -> String {
        match (grab, change) {
            (GridGrab::Row(id), GridChange::Order(o)) => self.place(id, o),
            (_, GridChange::Cell(e)) => {
                let row = self.row(&e.row).map_or_else(|| e.row.clone(), |r| self.name(r));
                let col = self.column(&e.column);
                let shown = col.map(|c| c.shown(&e.value, false)).unwrap_or_default();
                format!(
                    "{}, {row}, {shown}",
                    col.map_or(e.column.as_str(), |c| c.label.as_str())
                )
            }
            (GridGrab::Cell { .. }, GridChange::Order(_)) => String::new(),
        }
    }
}

fn invoice(id: &str, client: &str, status: Cell, due: Option<&str>, late: Option<u32>, amount: u32) -> TableRow {
    let mut cells = std::collections::BTreeMap::from([
        ("inv".to_string(), Cell::Text(id.into())),
        ("client".into(), Cell::Text(client.into())),
        ("status".into(), status),
        ("amount".into(), Cell::Number(amount.into())),
    ]);
    cells.extend(due.map(|d| ("due".into(), Cell::Text(d.into()))));
    cells.extend(late.map(|l| ("late".into(), Cell::Number(l.into()))));
    TableRow {
        id: id.into(),
        cells,
        tap: Some(Tap {
            open: Some(format!("/invoice/{id}")),
            ..Tap::default()
        }),
        ..TableRow::default()
    }
}

fn columns() -> Vec<Column> {
    let col = |id: &str, label: &str, kind: ColumnKind| Column {
        id: id.into(),
        label: label.into(),
        kind,
        ..Column::default()
    };
    vec![
        Column {
            phone: Some(PhonePart::Meta),
            ..col("inv", "Invoice", ColumnKind::Text)
        },
        Column {
            width: Some(18),
            phone: Some(PhonePart::Title),
            ..col("client", "Client", ColumnKind::Text)
        },
        col("status", "Status", ColumnKind::Tone),
        Column {
            era: Some(Era::Be),
            ..col("due", "Due", ColumnKind::Date)
        },
        Column {
            unit: Some("days".into()),
            tone: Some(Tone::Warn),
            max: Some(60.into()),
            digits: Some(0),
            ..col("late", "Overdue", ColumnKind::Bar)
        },
        Column {
            currency: Some("THB".into()),
            total: Some(Total::Sum),
            ..col("amount", "Amount", ColumnKind::Money)
        },
    ]
}

fn markup() -> Vec<Column> {
    let col = |id: &str, label: &str, kind: ColumnKind, edit: bool| Column {
        id: id.into(),
        label: label.into(),
        kind,
        edit: edit.then_some(true),
        ..Column::default()
    };
    let money = |id: &str, label: &str, edit: bool| Column {
        currency: Some("THB".into()),
        total: (!edit).then_some(Total::Sum),
        ..col(id, label, ColumnKind::Money, edit)
    };
    vec![
        Column {
            width: Some(22),
            ..col("name", "Item", ColumnKind::Text, true)
        },
        Column {
            digits: Some(0),
            ..col("qty", "Qty", ColumnKind::Number, true)
        },
        Column {
            phone: Some(PhonePart::Meta),
            ..money("price", "Unit cost", true)
        },
        col("mult", "Mult", ColumnKind::Number, true),
        money("cost", "Cost", false),
        Column {
            unit: Some("%".into()),
            digits: Some(1),
            ..col("margin", "Margin", ColumnKind::Number, true)
        },
        money("sell", "Price", false),
        money("final", "Final", false),
    ]
}

fn item(id: &str, name: &str, n: [f64; 5]) -> TableRow {
    let [qty, price, mult, margin, fin] =
        n.map(|v| Cell::Number(serde_json::from_str(&v.to_string()).unwrap_or(0.into())));
    let cells = [
        ("qty", qty),
        ("price", price),
        ("mult", mult),
        ("margin", margin),
        ("final", fin),
    ];
    let mut cells: std::collections::BTreeMap<String, Cell> = cells.map(|(k, v)| (k.to_string(), v)).into();
    cells.insert("name".into(), Cell::Text(name.into()));
    TableRow {
        id: id.into(),
        cells,
        ..TableRow::default()
    }
}

fn grid() -> Block {
    let group = |id: &str, name: &str| TableRow {
        id: id.into(),
        cells: [("name".to_string(), Cell::Text(name.into()))].into(),
        group: Some(true),
        ..TableRow::default()
    };
    let get = |k: &str| Expr::Get(k.into());
    let cost = Expr::Mul(Box::new([Expr::Mul(Box::new([get("qty"), get("price")])), get("mult")]));
    let share = Expr::Div(Box::new([get("margin"), Expr::Lit(Lit::Num(100.into()))]));
    let keep = Expr::Sub(Box::new([Expr::Lit(Lit::Num(1.into())), share]));
    let sell = Expr::Div(Box::new([get("cost"), keep]));
    let rows = vec![
        group("g-pipe", "Pipework"),
        item("p1", "Steel pipe 2in, sch 40", [40.0, 410.0, 1.05, 18.0, 21_000.0]),
        item("p2", "Elbow 2in 90°", [24.0, 95.0, 1.05, 22.0, 3_100.0]),
        group("g-valve", "Valves"),
        item("v1", "Gate valve 3in", [4.0, 4_200.0, 1.1, 15.0, 21_800.0]),
        item("v2", "Ball valve 2in", [6.0, 1_650.0, 1.1, 15.0, 12_800.0]),
        group("g-lab", "Labour"),
        item("l1", "Fitter, day", [6.0, 2_400.0, 1.0, 25.0, 19_200.0]),
        TableRow {
            fixed: Some(true),
            ..item("l2", "Transport, by weight", [1.0, 5_600.0, 1.0, 0.0, 5_600.0])
        },
    ];
    let gesture = |action: &str, name: &str| Gesture {
        action: action.into(),
        name: name.into(),
        enabled: None,
    };
    let table = Table::new(markup(), rows)
        .id("grid")
        .title("Mark-up · K-12 tower")
        .calc(
            [("cost".to_string(), cost), ("sell".to_string(), sell)]
                .into_iter()
                .collect::<std::collections::BTreeMap<_, _>>(),
        )
        .edit(gesture("set-cell", "cell"))
        .reorder(gesture("order", "rows"));
    Block::Table(Box::new(table))
}

fn table() -> Block {
    let label = |text: &str, tone: Tone| {
        Cell::Label(Label {
            text: text.into(),
            tone: Some(tone),
        })
    };
    let rows = vec![
        invoice(
            "INV-0133",
            "Orchard Lane Clinic",
            label("overdue", Tone::Warn),
            Some("2026-10-18"),
            Some(32),
            48_750,
        ),
        invoice(
            "INV-0136",
            "Bluepeak Logistics",
            label("disputed", Tone::Bad),
            Some("2026-11-05"),
            Some(14),
            31_500,
        ),
        invoice(
            "INV-0138",
            "Saffron & Salt",
            label("sent", Tone::Done),
            Some("2026-11-19"),
            None,
            18_000,
        ),
        invoice(
            "INV-0139",
            "Tidewater Bakery",
            label("paid", Tone::Ok),
            Some("2026-11-26"),
            None,
            15_000,
        ),
        invoice(
            "INV-0143",
            "Moss Hill School",
            label("draft", Tone::Mute),
            None,
            None,
            13_500,
        ),
    ];
    let bulk = |action: &str, label: &str, bad: Option<bool>| BulkAction {
        action: action.into(),
        label: label.into(),
        bad,
    };
    let select = TableSelect {
        actions: vec![bulk("remind", "send reminder", None), bulk("void", "void", Some(true))],
    };
    let table = Table::new(columns(), rows)
        .id("invoices")
        .title("Invoices")
        .sort(TableSort {
            by: "due".into(),
            dir: SortDir::Asc,
        })
        .empty("No invoices yet.")
        .select(select)
        .export(vec![ExportFormat::Csv, ExportFormat::Xlsx]);
    Block::Table(Box::new(table))
}

pub(super) fn sample() -> Vec<Block> {
    vec![table(), grid()]
}
