use serde_json::{Map, Number, Value};

use super::fallback;
use crate::site::write::{fields, sends, W};
use crate::{Heat, HeatCell, HeatEdges, HeatTone};

fn num(x: f64) -> String {
    format!("{}", (x * 100.0).round() / 100.0 + 0.0)
}

fn th(h: &Heat) -> bool {
    h.lang.as_deref() == Some("th")
}

fn unit(h: &Heat) -> String {
    match h.scale.as_ref().and_then(|s| s.unit.as_deref()) {
        Some("%") => "%".into(),
        Some(u) => format!(" {u}"),
        None => String::new(),
    }
}

fn value(c: &HeatCell) -> Option<f64> {
    c.value.as_ref().and_then(Number::as_f64)
}

fn said(h: &Heat, row: &str, col: &str, c: &HeatCell) -> String {
    let v = value(c).map_or_else(
        || if th(h) { "ไม่มีข้อมูล" } else { "no data" }.to_string(),
        |v| num(v) + &unit(h),
    );
    let label = c.label.as_ref().map(|l| format!(", {l}")).unwrap_or_default();
    format!("{row}, {col}: {v}{label}")
}

fn tone(h: &Heat) -> &str {
    match h.tone.as_ref() {
        Some(HeatTone::Ok) => " hk-ok",
        Some(HeatTone::Warn) => " hk-warn",
        Some(HeatTone::Bad) => " hk-bad",
        Some(HeatTone::Accent) => " hk-accent",
        Some(HeatTone::Mute) => " hk-mute",
        _ => "",
    }
}

fn readout(w: &mut W<'_>, h: &Heat) {
    w.open("div", "hmo", &[("aria-live", "polite")]);
    let at = |r: usize, c: usize| Some((h.grid.get(r)?, h.columns.get(c)?, h.grid.get(r)?.cells.get(c)?));
    let picked = h.selected.as_ref().and_then(|s| {
        let r = h.grid.iter().position(|r| r.name == s.row)?;
        at(r, h.columns.iter().position(|c| *c == s.column)?)
    });
    let peak = h
        .grid
        .iter()
        .enumerate()
        .flat_map(|(r, row)| row.cells.iter().enumerate().map(move |(c, cell)| (r, c, cell)))
        .filter_map(|(r, c, cell)| Some((r, c, value(cell)?)))
        .reduce(|a, b| if b.2 > a.2 { b } else { a })
        .and_then(|(r, c, _)| at(r, c));
    let Some((row, col, cell)) = picked.or(peak) else {
        return w.close("div");
    };
    if picked.is_none() {
        w.el("span", "", if th(h) { "สูงสุด" } else { "Peak" });
    }
    w.el("span", "at", &format!("{} · {col}", row.name));
    let n = value(cell).map(num);
    let shown = n.as_ref().map(|n| n.clone() + &unit(h));
    w.el("b", "", shown.as_deref().unwrap_or("—"));
    if let Some(l) = cell.label.as_ref().filter(|l| Some(*l) != n.as_ref() && Some(*l) != shown.as_ref()) {
        w.el("span", "", l);
    }
    w.close("div");
}

fn grid(w: &mut W<'_>, h: &Heat, b: &Value) {
    let action = h.tap.as_ref().and(b.get("tap")).and_then(|t| sends(Some(t)));
    w.open("div", "hmw", &[]);
    w.open("table", "", &[]);
    w.open("thead", "", &[]);
    w.open("tr", "", &[]);
    w.el("td", "", "");
    for c in &h.columns {
        w.open("th", "", &[("scope", "col")]);
        w.text(c);
        w.close("th");
    }
    w.close("tr");
    w.close("thead");
    w.open("tbody", "", &[]);
    let empty = HeatCell::default();
    for row in &h.grid {
        w.open("tr", "", &[]);
        w.open("th", "", &[("scope", "row")]);
        w.text(&row.name);
        w.close("th");
        for (i, col) in h.columns.iter().enumerate() {
            let c = row.cells.get(i).unwrap_or(&empty);
            let sel = h.selected.as_ref().is_some_and(|s| s.row == row.name && s.column == *col);
            let cls = value(c).map_or_else(|| "e".to_string(), |v| format!("s{}", h.step(v)));
            w.open("td", &format!("{cls}{}", if sel { " sel" } else { "" }), &[]);
            let name = said(h, &row.name, col, c);
            match action {
                Some(a) => {
                    let mut values: Map<String, Value> = fields(&[b.get("tap").and_then(|t| t.get("values"))]);
                    values.insert("row".into(), row.name.clone().into());
                    values.insert("column".into(), col.clone().into());
                    let form = w.post(b.get("id"), a, &values);
                    let mut at = vec![
                        ("aria-label", name.as_str()),
                        ("type", "submit"),
                        ("form", form.as_str()),
                        ("data-action", a),
                    ];
                    at.extend(sel.then_some(("aria-pressed", "true")));
                    w.open("button", "", &at);
                }
                None => w.open("span", "v", &[]),
            }
            let label = c.label.as_deref().unwrap_or(if value(c).is_some() { "" } else { "–" });
            w.open("span", "lb", &[("aria-hidden", "true")]);
            w.text(label);
            w.close("span");
            if action.is_some() {
                w.close("button");
            } else {
                w.el("span", "b-sr", &name);
                w.close("span");
            }
            w.close("td");
        }
        w.close("tr");
    }
    w.close("tbody");
    w.close("table");
    w.close("div");
}

fn legend(w: &mut W<'_>, h: &Heat) {
    let (min, max) = h.range();
    let u = h.scale.as_ref().and_then(|s| s.unit.as_deref());
    let given = |f: fn(&crate::HeatScale) -> Option<&Number>| h.scale.as_ref().and_then(f).is_some();
    let vs: Vec<f64> = h.grid.iter().flat_map(|r| r.cells.iter().filter_map(value)).collect();
    let under = given(|s| s.min.as_ref()) && vs.iter().any(|v| *v < min);
    let over = given(|s| s.max.as_ref()) && vs.iter().any(|v| *v > max);
    let name = format!("Scale {} to {}{}", num(min), num(max), u.map(|u| format!(" {u}")).unwrap_or_default());
    w.open("div", "hml", &[("aria-label", &name)]);
    if let Some(u) = u {
        w.el("span", "u", u);
    }
    w.open("div", "ramp", &[]);
    for s in 1..=5 {
        w.open("i", &format!("s{s}"), &[]);
        w.close("i");
    }
    w.open("div", "rx", &[]);
    for i in 0..=5u8 {
        let ends = i == 0 || i == 5;
        if h.edges == Some(HeatEdges::Ends) && !ends {
            continue;
        }
        let mark = match i {
            0 if under => "≤",
            5 if over => "≥",
            _ => "",
        };
        w.el("span", "", &format!("{mark}{}", num(min + (max - min) * f64::from(i) / 5.0)));
    }
    w.close("div");
    w.close("div");
    let gaps = h.grid.iter().any(|r| r.cells.len() < h.columns.len() || r.cells.iter().any(|c| c.value.is_none()));
    if gaps {
        w.open("span", "nd", &[]);
        w.open("i", "", &[]);
        w.close("i");
        w.text(if th(h) { "ไม่มีข้อมูล" } else { "No data" });
        w.close("span");
    }
    w.close("div");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let Ok(h) = serde_json::from_value::<Heat>(b.clone()) else {
        return fallback(w, b);
    };
    w.open_block("div", &format!("card heat as-surface{}", tone(&h)), b, &[]);
    w.el("div", "hmt", &h.title);
    readout(w, &h);
    if h.drawn() {
        grid(w, &h, b);
        legend(w, &h);
    } else {
        w.el("div", "hme", h.empty.as_deref().unwrap_or("No data yet"));
    }
    w.close("div");
}
