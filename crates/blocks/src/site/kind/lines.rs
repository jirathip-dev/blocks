use serde_json::Value;

use crate::site::write::{fields, get, list, shown, Go, W};
use crate::behave;

fn minor(s: &str, scale: usize) -> Option<i128> {
    let t: String = s.chars().filter(|c| *c != ',' && !c.is_whitespace()).collect();
    let (neg, t) = t.strip_prefix('-').map_or((false, t.as_str()), |r| (true, r));
    let t = t.strip_prefix('+').unwrap_or(t);
    let (int, frac) = t.split_once('.').unwrap_or((t, ""));
    let digits = int.chars().chain(frac.chars());
    if (int.is_empty() && frac.is_empty()) || !digits.clone().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let mut f = frac.chars();
    let mut all = String::from("0");
    all.push_str(int);
    all.extend((0..scale).map(|_| f.next().unwrap_or('0')));
    let up = f.next().is_some_and(|c| c >= '5');
    let n = all.parse::<i128>().ok()?.checked_add(i128::from(up))?;
    Some(if neg { -n } else { n })
}

fn money(m: i128, scale: usize) -> String {
    let d = format!("{:0>w$}", m.unsigned_abs(), w = scale + 1);
    let (int, frac) = d.split_at_checked(d.len().saturating_sub(scale)).unwrap_or((&d, ""));
    let mut out = String::from(if m < 0 { "-" } else { "" });
    for (i, c) in int.chars().enumerate() {
        if i > 0 && (int.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    if scale > 0 {
        out.push('.');
        out.push_str(frac);
    }
    out
}

fn label(c: &Value) -> String {
    get(c, "label").map_or_else(|| shown(c.get("name")), String::from)
}

fn name(c: &Value) -> &str {
    get(c, "name").unwrap_or_default()
}

struct Cols<'v> {
    b: &'v Value,
    sums: Vec<&'v str>,
    scale: usize,
}

impl Cols<'_> {
    fn summed(&self, c: &Value) -> bool {
        self.sums.contains(&name(c))
    }

    fn num(&self, c: &Value) -> bool {
        self.summed(c) || get(c, "keyboard") == Some("number")
    }

    fn calc(&self, c: &Value) -> Option<&Value> {
        self.b.get("calc")?.get(name(c)).filter(|e| !e.is_null())
    }

    fn read_only(&self, c: &Value) -> bool {
        c.get("enabled") == Some(&Value::Bool(false)) || self.calc(c).is_some()
    }

    fn cell(&self, r: &Value, c: &Value) -> Value {
        let values = r.get("values").unwrap_or(&Value::Null);
        match self.calc(c) {
            Some(e) => behave::calc(e, values),
            None => values.get(name(c)).cloned().unwrap_or_default(),
        }
    }

    fn shown(&self, r: &Value, c: &Value) -> String {
        let v = shown(Some(&self.cell(r, c)));
        match minor(&v, self.scale) {
            Some(m) if self.summed(c) => money(m, self.scale),
            _ if v.is_empty() => "—".into(),
            _ => v,
        }
    }

    fn total(&self, key: &str) -> i128 {
        let col = list(self.b, "columns").iter().find(|c| name(c) == key);
        let each = list(self.b, "items").iter().map(|r| match col {
            Some(c) => shown(Some(&self.cell(r, c))),
            None => shown(r.get("values").and_then(|v| v.get(key))),
        });
        each.filter_map(|v| minor(&v, self.scale)).sum()
    }

    fn width(&self, c: &Value) -> &'static str {
        match (self.summed(c), self.num(c), get(c, "type")) {
            (true, _, _) => "14ch",
            (_, true, _) => "10ch",
            (_, _, Some("picker")) => "minmax(0,1.4fr)",
            _ => "minmax(0,2fr)",
        }
    }
}

fn cell(w: &mut W<'_>, k: &Cols<'_>, at: (usize, &Value), c: &Value, err: bool, form: Option<&str>) {
    let (i, r) = at;
    let cls = format!(
        "lqc{}{}{}",
        if k.num(c) { " num" } else { "" },
        if k.read_only(c) { " ro" } else { "" },
        if err { " err" } else { "" }
    );
    w.open("label", &cls, &[]);
    w.el("span", "lqk", &label(c));
    if k.read_only(c) {
        let id = shown(r.get("id"));
        w.open("span", "lqv", &[("data-row", &id), ("data-cell", name(c))]);
        w.text(&k.shown(r, c));
        w.close("span");
        return w.close("label");
    }
    let key = format!("{}.{i}.{}", shown(k.b.get("name")), name(c));
    let aria = format!("{}, line {}", label(c), i + 1);
    let raw = shown(r.get("values").and_then(|v| v.get(name(c))));
    let value = match minor(&raw, k.scale) {
        Some(m) if k.summed(c) => money(m, k.scale),
        _ => raw,
    };
    let mut attrs = vec![("name", key.as_str()), ("aria-label", aria.as_str())];
    attrs.extend(form.map(|f| ("form", f)));
    if err {
        attrs.push(("aria-invalid", "true"));
    }
    if get(c, "type") == Some("picker") {
        w.open("select", "", &attrs);
        w.option("", get(c, "placeholder").unwrap_or("choose…"), value.is_empty());
        for o in list(c, "options").iter().map(|o| shown(Some(o))) {
            w.option(&o, &o, o == value);
        }
        w.close("select");
    } else {
        let mode = if k.num(c) { "decimal" } else { "text" };
        let hint = get(c, "placeholder").unwrap_or_default();
        attrs.extend([
            ("type", "text"),
            ("autocomplete", "off"),
            ("placeholder", hint),
            ("inputmode", mode),
            ("value", &value),
        ]);
        w.open("input", "", &attrs);
    }
    w.close("label");
}

fn totals(w: &mut W<'_>, k: &Cols<'_>, fixed: bool) {
    w.open("div", "lqt", &[]);
    w.el("span", "", "");
    let mut named = false;
    for c in list(k.b, "columns") {
        if k.summed(c) {
            w.open("span", "num", &[]);
            w.el("span", "tk", &label(c));
            w.el("b", "", &money(k.total(name(c)), k.scale));
            w.close("span");
        } else {
            w.el("span", if named { "" } else { "tl" }, if named { "" } else { "total" });
            named = true;
        }
    }
    if !fixed {
        w.el("span", "", "");
    }
    w.close("div");
}

fn balance(w: &mut W<'_>, k: &Cols<'_>) -> bool {
    let Some([d, c]) = k.b.get("balance").and_then(Value::as_array).map(Vec::as_slice) else {
        return false;
    };
    let cols = list(k.b, "columns");
    let lower = |x: &Value| {
        let col = cols.iter().find(|c| c.get("name") == Some(x));
        col.map_or_else(|| shown(Some(x)), label).to_lowercase()
    };
    let gap = k.total(&shown(Some(d))) - k.total(&shown(Some(c)));
    let say = if gap == 0 {
        format!("balanced · {} = {}", lower(d), lower(c))
    } else {
        let short = if gap > 0 { lower(c) } else { lower(d) };
        format!("out of balance · {short} short by {}", money(gap.abs(), k.scale))
    };
    w.open("p", if gap == 0 { "lqb ok" } else { "lqb off" }, &[("role", "status")]);
    w.text(&say);
    w.close("p");
    gap != 0
}

fn submit(w: &mut W<'_>, s: &Value, f: &str, errors: &[&Value], out: bool) {
    let mut bad: Vec<&Value> = errors
        .iter()
        .filter_map(|e| e.get("row").filter(|r| !r.is_null()))
        .collect();
    bad.sort_by_key(ToString::to_string);
    bad.dedup();
    let fix = match bad.len() {
        0 if errors.is_empty() => String::new(),
        0 => "fix the error".into(),
        1 => "fix 1 line".into(),
        n => format!("fix {n} lines"),
    };
    let even = if out { "balance the entry" } else { "" };
    let note: Vec<&str> = [fix.as_str(), even].into_iter().filter(|t| !t.is_empty()).collect();
    let label = shown(s.get("label"));
    w.open("div", "ra", &[]);
    if !note.is_empty() {
        w.el("p", "m lqw", &format!("{} to {label}", note.join(" and ")));
    }
    let off = !note.is_empty() || s.get("off") == Some(&Value::Bool(true));
    let go = Go::Post(f.into(), shown(s.get("action")));
    w.btn(&label, "", &go, if off { &[("disabled", "")] } else { &[] }, None);
    w.close("div");
}

fn head(w: &mut W<'_>, k: &Cols<'_>, fixed: bool) {
    w.open("div", "lqh", &[("aria-hidden", "true")]);
    w.el("span", "", "");
    for c in list(k.b, "columns") {
        w.el("span", if k.num(c) { "num" } else { "" }, &label(c));
    }
    if !fixed {
        w.el("span", "", "");
    }
    w.close("div");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let scale = b
        .get("scale")
        .and_then(Value::as_u64)
        .and_then(|s| usize::try_from(s).ok())
        .unwrap_or(2);
    let sums = list(b, "sum").iter().filter_map(Value::as_str).collect();
    let k = Cols { b, sums, scale };
    let (cols, rows) = (list(b, "columns"), list(b, "items"));
    let fixed = b.get("add").is_none_or(Value::is_null);
    let ids: Vec<&Value> = rows.iter().filter_map(|r| r.get("id")).collect();
    let errors: Vec<&Value> = list(b, "errors")
        .iter()
        .filter(|e| e.get("row").is_none_or(|r| r.is_null() || ids.contains(&r)))
        .collect();
    let mut widths = vec!["3ch"];
    widths.extend(cols.iter().map(|c| k.width(c)));
    if !fixed {
        widths.push("32px");
    }
    let style = format!("--lq-cols: {};", widths.join(" "));
    let sub = b.get("submit").filter(|s| s.is_object());
    let form = sub.map(|s| w.post(b.get("id"), &shown(s.get("action")), &fields(&[s.get("values")])));
    w.open_block("div", "lq", b, &[("style", &style)]);
    head(w, &k, fixed);
    if rows.is_empty() {
        w.el("p", "empty", get(b, "empty").unwrap_or("no lines yet"));
    }
    let min = b.get("min").and_then(Value::as_u64).unwrap_or(0);
    let few = u64::try_from(rows.len()).unwrap_or(u64::MAX) <= min;
    for (i, r) in rows.iter().enumerate() {
        let n = (i + 1).to_string();
        let mine: Vec<&&Value> = errors
            .iter()
            .filter(|e| e.get("row").is_some_and(|x| Some(x) == r.get("id")))
            .collect();
        let line = format!("line {n}");
        let row = if mine.is_empty() { "lqr" } else { "lqr err" };
        w.open("div", row, &[("role", "group"), ("aria-label", &line)]);
        w.el("i", "lqn", &n);
        for c in cols {
            let err = mine
                .iter()
                .any(|e| e.get("name").is_some() && e.get("name") == c.get("name"));
            cell(w, &k, (i, r), c, err, form.as_deref());
        }
        if !fixed {
            let aria = format!("remove line {n}");
            let mut at = vec![("aria-label", aria.as_str())];
            at.extend(few.then_some(("disabled", "")));
            w.btn("×", "lqx", &Go::Stay, &at, None);
        }
        w.close("div");
        for e in mine {
            w.el("p", "lqe", &shown(e.get("message")));
        }
    }
    for e in errors.iter().filter(|e| e.get("row").is_none_or(Value::is_null)) {
        w.el("p", "lqe", &shown(e.get("message")));
    }
    if !fixed {
        w.open("div", "lqa", &[]);
        w.btn(&shown(b.get("add")), "", &Go::Stay, &[("disabled", "")], None);
        w.close("div");
    }
    w.open("div", "lqf", &[]);
    if !k.sums.is_empty() {
        totals(w, &k, fixed);
    }
    let out = balance(w, &k);
    if let (Some(s), Some(f)) = (sub, form.as_deref()) {
        submit(w, s, f, &errors, out);
    }
    w.close("div");
    w.close("div");
}
