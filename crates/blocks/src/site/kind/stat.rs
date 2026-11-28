use serde_json::Value;

use crate::site::write::{get, list, shown, ticked, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "stats", b, &[]);
    let items = b.get("items").and_then(Value::as_array);
    for i in items
        .map_or(std::slice::from_ref(b), Vec::as_slice)
        .iter()
        .filter(|i| i.is_object())
    {
        w.open("div", &format!("st as-surface {}", shown(i.get("tone"))), &[]);
        ticked(w, "b", "b-stat__value", i.get("value"));
        if let Some(u) = get(i, "unit").filter(|u| !u.is_empty()) {
            w.raw(" ");
            w.el("small", "", u);
        }
        w.el("span", "m", &shown(i.get("label")));
        let sp: Vec<f64> = list(i, "spark")
            .iter()
            .map(|v| v.as_f64().unwrap_or(f64::NAN))
            .collect();
        let hi = sp.iter().copied().fold(1.0, f64::max);
        if sp.len() > 1 {
            let points: Vec<String> = sp
                .iter()
                .enumerate()
                .map(|(x, v)| format!("{x},{}", 10.0 - (v / hi) * 10.0))
                .collect();
            w.raw(&format!(
                "<svg class=\"spark\" viewBox=\"0 0 {} 10\" preserveAspectRatio=\"none\" aria-hidden=\"true\"><polyline points=\"{}\"></polyline></svg>",
                sp.len() - 1,
                points.join(" ")
            ));
        }
        w.close("div");
    }
    w.close("div");
}
