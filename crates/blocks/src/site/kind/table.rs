use serde::Serialize;
use serde_json::Value;

use super::fallback;
use crate::kind::{Cell, Column, ColumnKind, PhonePart, SortDir, Table, TableRow, Total};
use crate::site::write::W;

fn word<T: Serialize>(t: &T) -> String {
    serde_json::to_value(t)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default()
}

fn class(c: &Column, role: &PhonePart, blank: bool) -> String {
    let side = if c.end() { "end" } else { "start" };
    let mut out = format!("{side} k-{} p-{}", word(&c.kind), word(role));
    out.push_str(if c.width.is_some() { " w" } else { "" });
    out.push_str(if blank { " nil" } else { "" });
    out
}

fn width(c: &Column) -> Option<String> {
    c.width.map(|w| format!("--w:{w}ch"))
}

fn cell(w: &mut W<'_>, t: &Table, c: &Column, role: &PhonePart, v: Option<&Cell>) {
    let text = v.map(|v| c.shown(v, w.thai)).unwrap_or_default();
    let style = width(c);
    let mut attrs = vec![("data-l", c.label.as_str())];
    attrs.extend(style.as_deref().map(|s| ("style", s)));
    attrs.extend(c.width.and(v).map(|_| ("title", text.as_str())));
    w.open("td", &class(c, role, v.is_none()), &attrs);
    match v {
        Some(Cell::Label(l)) => w.el(
            "span",
            &format!("tag {}", l.tone.as_ref().map(word).unwrap_or_default()),
            &text,
        ),
        Some(Cell::Number(n)) if c.kind == ColumnKind::Bar => {
            let full = (n.as_f64().unwrap_or_default() / t.bar_max(c)).clamp(0.0, 1.0) * 100.0;
            w.open(
                "span",
                &format!("tbb {}", c.tone.as_ref().map(word).unwrap_or_default()),
                &[],
            );
            w.raw(&format!("<i style=\"width:{full:.1}%\"></i></span>"));
            w.text(&text);
        }
        _ => w.text(&text),
    }
    w.close("td");
}

fn foot(w: &mut W<'_>, cols: &[&Column], roles: &[PhonePart], rows: &[&TableRow]) {
    if !cols.iter().any(|c| c.total.is_some()) {
        return;
    }
    w.raw("<tfoot><tr><th class=\"p-title\" scope=\"row\">Total</th>");
    for (c, role) in cols.iter().zip(roles).skip(1) {
        let role = if *role == PhonePart::Title {
            &PhonePart::Meta
        } else {
            role
        };
        let total = c.total(rows);
        w.open("td", &class(c, role, total.is_none()), &[("data-l", &c.label)]);
        if let Some((agg, v)) = total {
            if !agg.is_empty() {
                w.el("span", "agg", agg);
                w.raw(" ");
            }
            w.text(&v);
        }
        w.close("td");
    }
    w.raw("</tr></tfoot>");
}

fn group(w: &mut W<'_>, cols: &[&Column], roles: &[PhonePart], rows: &[TableRow], at: usize) {
    let Some(r) = rows.get(at) else { return };
    w.open("tr", "grp", &[("data-id", &r.id)]);
    for (i, (c, role)) in cols.iter().zip(roles).enumerate() {
        let sub = Table::subtotal(c, rows, at).filter(|_| c.total != Some(Total::Count) && i > 0);
        let blank = i > 0 && sub.is_none();
        w.open("td", &class(c, role, blank), &[("data-l", &c.label)]);
        if i == 0 {
            let n = rows.iter().skip(at + 1).take_while(|x| !x.is_group()).count();
            w.text(&r.cells.get(&c.id).map(|v| c.shown(v, w.thai)).unwrap_or_default());
            w.el("span", "tbgn", &n.to_string());
        }
        w.text(&sub.map(|(_, v)| v).unwrap_or_default());
        w.close("td");
    }
    w.close("tr");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let Ok(t) = serde_json::from_value::<Table>(b.clone()) else {
        return fallback(w, b);
    };
    let n = t.rows.iter().filter(|r| !r.is_group()).count();
    let ed = t.edit.is_some() || t.reorder.is_some();
    w.open_block("div", if ed { "tbl ed" } else { "tbl" }, b, &[]);
    w.open("div", "tbh", &[]);
    if let Some(title) = &t.title {
        w.el("b", "tbt", title);
    }
    w.el("span", "tbn", &format!("{n} row{}", if n == 1 { "" } else { "s" }));
    w.raw("</div><div class=\"tbw\"><table>");
    w.el("caption", "", t.title.as_deref().unwrap_or("Table"));
    let cols: Vec<&Column> = t.columns.iter().collect();
    let roles = Table::roles(&cols);
    w.raw("<thead><tr>");
    for c in &cols {
        let on = t.sort.as_ref().filter(|s| s.by == c.id).map(|s| s.dir == SortDir::Desc);
        let style = width(c);
        let mut attrs = vec![("scope", "col")];
        attrs.extend(on.map(|d| ("aria-sort", if d { "descending" } else { "ascending" })));
        attrs.extend(style.as_deref().map(|s| ("style", s)));
        w.open("th", &class(c, &PhonePart::Meta, false), &attrs);
        w.el("span", "", &c.label);
        if let Some(u) = c.unit() {
            w.el("span", "tbu", &u);
        }
        w.el("i", "", on.map_or("", |d| if d { "↓" } else { "↑" }));
        w.close("th");
    }
    w.raw("</tr></thead><tbody>");
    let rows = t.sorted();
    for (at, r) in rows.iter().enumerate() {
        if r.is_group() {
            group(w, &cols, &roles, &rows, at);
            continue;
        }
        w.open("tr", if r.tap.is_some() { "tap" } else { "" }, &[("data-id", &r.id)]);
        for (c, role) in cols.iter().zip(&roles) {
            cell(w, &t, c, role, r.cells.get(&c.id));
        }
        w.close("tr");
    }
    let rows: Vec<&TableRow> = rows.iter().filter(|r| !r.is_group()).collect();
    if rows.is_empty() {
        let span = cols.len().to_string();
        w.raw("<tr>");
        w.open("td", "", &[("colspan", &span)]);
        w.el("p", "empty", t.empty.as_deref().unwrap_or("No rows yet."));
        w.raw("</td></tr>");
    }
    w.raw("</tbody>");
    if !rows.is_empty() {
        foot(w, &cols, &roles, &rows);
    }
    w.raw("</table></div></div>");
}
