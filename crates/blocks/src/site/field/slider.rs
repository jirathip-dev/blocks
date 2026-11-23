use serde_json::Value;

use crate::site::write::{get, W};
use crate::SliderField;

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let Ok(f) = serde_json::from_value::<SliderField>(x.clone()) else {
        return super::plain::view(w, x, attrs);
    };
    let (lo, hi, now) = (f.min.get(), f.max.get(), f.start());
    let span = hi - lo;
    let v = if span > 0.0 {
        ((now - lo) / span).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let (said, label) = (f.said(now), get(x, "label").unwrap_or(&f.name).to_owned());
    let nums = [lo, hi, now, f.step.as_ref().map_or(1.0, crate::Num::get)].map(SliderField::number);
    let [min, max, value, step] = &nums;
    let mut attrs = attrs.to_vec();
    attrs.extend([
        ("type", "range"),
        ("min", min.as_str()),
        ("max", max.as_str()),
        ("step", step.as_str()),
    ]);
    attrs.extend([
        ("value", value.as_str()),
        ("aria-label", label.as_str()),
        ("aria-valuetext", said.as_str()),
    ]);
    let hide = [("aria-hidden", "true")];
    w.open("div", "fs", &[("style", &format!("--v:{}", SliderField::number(v)))]);
    w.open("input", "", &attrs);
    w.open("output", "fsv", &hide);
    w.text(&said);
    w.close("output");
    w.open("span", "fst", &hide);
    w.el("b", "", "");
    w.close("span");
    w.open("span", "fsb", &hide);
    w.close("span");
    w.open("span", "fse", &hide);
    w.el("span", "", &f.said(lo));
    w.el("span", "", &f.said(hi));
    w.close("span");
    w.close("div");
}
