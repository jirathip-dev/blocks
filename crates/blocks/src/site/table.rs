use serde::Serialize;
use serde_json::Value;

use super::{fallback, W};
use crate::kind::{Cell, Column, ColumnKind, PhonePart, SortDir, Table, TableRow};

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

pub(super) fn table(w: &mut W<'_>, b: &Value) {
    let Ok(t) = serde_json::from_value::<Table>(b.clone()) else {
        return fallback(w, b);
    };
    let n = t.rows.len();
    w.open_block("div", "tbl", b, &[]);
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
    for r in &rows {
        w.open("tr", if r.tap.is_some() { "tap" } else { "" }, &[("data-id", &r.id)]);
        for (c, role) in cols.iter().zip(&roles) {
            cell(w, &t, c, role, r.cells.get(&c.id));
        }
        w.close("tr");
    }
    if rows.is_empty() {
        let span = cols.len().to_string();
        w.raw("<tr class=\"tbe\">");
        w.open("td", "", &[("colspan", &span)]);
        w.text(t.empty.as_deref().unwrap_or("No rows yet."));
        w.raw("</td></tr>");
    }
    w.raw("</tbody>");
    if !rows.is_empty() {
        foot(w, &cols, &roles, &rows);
    }
    w.raw("</table></div></div>");
}
