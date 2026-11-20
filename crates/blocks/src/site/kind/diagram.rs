use std::collections::{BTreeSet, HashMap};

use serde_json::Value;

use super::fallback;
use crate::site::write::{get, shown, W};

struct Edge {
    from: String,
    into: String,
    both: bool,
}

struct Metrics {
    cls: &'static str,
    widths: [f64; 3],
    gap: f64,
    gutter: f64,
    height: f64,
    row_gap: f64,
}

const WIDE: Metrics = Metrics {
    cls: "wide",
    widths: [156.0, 176.0, 140.0],
    gap: 40.0,
    gutter: 18.0,
    height: 54.0,
    row_gap: 22.0,
};
const PHONE: Metrics = Metrics {
    cls: "phone",
    widths: [108.0, 100.0, 78.0],
    gap: 22.0,
    gutter: 12.0,
    height: 46.0,
    row_gap: 20.0,
};
const TOP: f64 = 34.0;

struct Chart {
    order: Vec<String>,
    names: HashMap<String, String>,
    spine: Vec<String>,
    row: HashMap<String, i32>,
    side: HashMap<String, i32>,
    optional: BTreeSet<String>,
    edges: Vec<Edge>,
    rows: i32,
}

fn word(s: &str) -> (&str, &str) {
    let end = s
        .find(|c: char| !(c.is_ascii_alphanumeric() || c == '_'))
        .unwrap_or(s.len());
    s.split_at(end)
}

fn spaced(s: &str) -> Option<&str> {
    let t = s.trim_start();
    (t.len() < s.len()).then_some(t)
}

fn named(line: &str) -> Option<(&str, &str)> {
    let rest = spaced(line.strip_prefix("state")?)?.strip_prefix('"')?;
    let (name, rest) = rest.split_once('"')?;
    let (id, end) = word(spaced(spaced(rest)?.strip_prefix("as")?)?);
    (!name.is_empty() && !id.is_empty() && end.is_empty()).then_some((name, id))
}

fn plain(line: &str) -> Option<&str> {
    let (id, end) = word(spaced(line.strip_prefix("state")?)?);
    (!id.is_empty() && end.is_empty()).then_some(id)
}

fn end(s: &str) -> Option<(&str, &str)> {
    if let Some(rest) = s.strip_prefix("[*]") {
        return Some(("[*]", rest));
    }
    let (id, rest) = word(s);
    (!id.is_empty()).then_some((id, rest))
}

fn edge(line: &str) -> Option<(&str, &str)> {
    let (from, rest) = end(line)?;
    let (into, _) = end(rest.trim_start().strip_prefix("-->")?.trim_start())?;
    Some((from, into))
}

type Parsed = (Vec<String>, HashMap<String, String>, Vec<Edge>);

fn parse(source: &str) -> Parsed {
    let (mut order, mut names, mut parsed) = (vec![], HashMap::new(), vec![]);
    let add = |order: &mut Vec<String>, id: &str| {
        if id != "[*]" && !order.iter().any(|o| o == id) {
            order.push(id.to_string());
        }
    };
    for line in source.split('\n').map(str::trim) {
        if let Some((name, id)) = named(line) {
            names.insert(id.to_string(), name.to_string());
            add(&mut order, id);
        } else if let Some(id) = plain(line) {
            add(&mut order, id);
        } else if let Some((from, into)) = edge(line) {
            add(&mut order, from);
            add(&mut order, into);
            parsed.push(Edge {
                from: from.into(),
                into: into.into(),
                both: false,
            });
        }
    }
    (order, names, parsed)
}

fn spine(order: &[String], parsed: &[Edge]) -> (Vec<String>, BTreeSet<String>) {
    let at = |id: &str| order.iter().position(|o| o == id);
    let forward: Vec<&Edge> = parsed
        .iter()
        .filter(|e| at(&e.from).is_some_and(|a| at(&e.into).is_some_and(|z| a < z)))
        .collect();
    let (mut length, mut next) = (HashMap::<&str, i32>::new(), HashMap::<&str, &str>::new());
    for id in order.iter().rev() {
        for e in &forward {
            let into = length.get(e.into.as_str()).copied().unwrap_or(1);
            if e.from == *id && into + 1 > length.get(id.as_str()).copied().unwrap_or(1) {
                length.insert(id, into + 1);
                next.insert(id, &e.into);
            }
        }
    }
    let mut spine = Vec::<String>::new();
    let start = parsed.iter().find(|e| e.from == "[*]").map(|e| e.into.as_str());
    let mut id = start.or_else(|| order.first().map(String::as_str));
    while let Some(i) = id.filter(|i| !spine.iter().any(|s| s == i)) {
        spine.push(i.to_string());
        id = next.get(i).copied();
    }
    let mut optional = BTreeSet::new();
    for e in &forward {
        let (a, z) = (
            spine.iter().position(|s| *s == e.from),
            spine.iter().position(|s| *s == e.into),
        );
        if let (Some(a), Some(z)) = (a, z) {
            optional.extend(spine.get(a + 1..z).unwrap_or_default().iter().cloned());
        }
    }
    (spine, optional)
}

fn place(id: &str, parsed: &[Edge], row: &HashMap<String, i32>, side: &HashMap<String, i32>) -> (i32, i32) {
    let touching: Vec<&String> = parsed
        .iter()
        .filter_map(|e| match (e.from == id, e.into == id) {
            (true, _) => Some(&e.into),
            (_, true) => Some(&e.from),
            _ => None,
        })
        .filter(|n| side.get(*n) == Some(&0))
        .collect();
    let before: Vec<&String> = parsed
        .iter()
        .filter(|e| e.into == id && row.contains_key(&e.from))
        .map(|e| &e.from)
        .collect();
    let (mut column, mut at) = (1, 0);
    if !touching.is_empty() {
        at = touching
            .iter()
            .map(|n| row.get(*n).copied().unwrap_or(0))
            .min()
            .unwrap_or(0);
        column = if parsed.iter().any(|e| e.from == id && side.get(&e.into) == Some(&0)) {
            1
        } else {
            -1
        };
    } else if !before.is_empty() {
        at = before
            .iter()
            .map(|b| row.get(*b).copied().unwrap_or(0))
            .max()
            .unwrap_or(0)
            + 1;
        column = before
            .iter()
            .map(|b| side.get(*b))
            .find(|s| *s != Some(&0))
            .flatten()
            .copied()
            .unwrap_or(1);
    }
    while side.iter().any(|(k, s)| *s == column && row.get(k) == Some(&at)) {
        at += 1;
    }
    (at, column)
}

fn chart(source: &str) -> Chart {
    let (order, names, parsed) = parse(source);
    let (spine, optional) = spine(&order, &parsed);
    let (mut row, mut side) = (HashMap::new(), HashMap::new());
    for (i, id) in spine.iter().enumerate() {
        row.insert(id.clone(), i32::try_from(i).unwrap_or(i32::MAX));
        side.insert(id.clone(), 0);
    }
    for id in order.iter().filter(|o| !spine.contains(o)) {
        let (at, column) = place(id, &parsed, &row, &side);
        row.insert(id.clone(), at);
        side.insert(id.clone(), column);
    }
    let mut edges: Vec<Edge> = vec![];
    for e in parsed {
        let (Some(a), Some(z)) = (row.get(&e.from), row.get(&e.into)) else {
            continue;
        };
        let flat = side.get(&e.from) == Some(&0) && side.get(&e.into) == Some(&0);
        if flat && (a - z).abs() > 1 {
            continue;
        }
        match edges.iter_mut().find(|t| t.from == e.into && t.into == e.from) {
            Some(twin) => twin.both = true,
            None => edges.push(e),
        }
    }
    let rows = row.values().copied().max().unwrap_or(-1).max(-1) + 1;
    Chart {
        order,
        names,
        spine,
        row,
        side,
        optional,
        edges,
        rows,
    }
}

#[derive(Clone, Copy)]
struct Box {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
    mx: f64,
    my: f64,
}

type Pt = (f64, f64);

fn path(pts: &[Pt]) -> String {
    let all: Vec<String> = pts.iter().map(|(x, y)| format!("{x} {y}")).collect();
    format!("M{}", all.join("L"))
}

fn route(f: Box, t: Box, s: i32, m: &Metrics) -> Vec<Pt> {
    let down = t.my > f.my;
    if (f.my - t.my).abs() < f64::EPSILON {
        return if f.mx < t.mx {
            vec![(f.x + f.w, f.my), (t.x, t.my)]
        } else {
            vec![(f.x, f.my), (t.x + t.w, t.my)]
        };
    }
    let col = (f.mx - t.mx).abs() < f64::EPSILON;
    if col && (f.my - t.my).abs() <= m.height + m.row_gap + 1.0 {
        return vec![
            (f.mx, if down { f.y + f.h } else { f.y }),
            (t.mx, if down { t.y } else { t.y + t.h }),
        ];
    }
    if col {
        let ex = if s < 0 { f.x } else { f.x + f.w };
        let gx = ex + if s < 0 { -1.0 } else { 1.0 } * (m.gutter - 3.0);
        return vec![(ex, f.my), (gx, f.my), (gx, t.my), (ex, t.my)];
    }
    if s == 0 {
        let from = if t.mx > f.mx { f.x + f.w } else { f.x };
        return vec![(from, f.my), (t.mx, f.my), (t.mx, if down { t.y } else { t.y + t.h })];
    }
    let into = if t.mx > f.mx { t.x } else { t.x + t.w };
    vec![(f.mx, if down { f.y + f.h } else { f.y }), (f.mx, t.my), (into, t.my)]
}

fn head(svg: &mut String, tip: Pt, back: Pt) {
    let a = (tip.1 - back.1).atan2(tip.0 - back.0);
    let side = |t: f64| (tip.0 - 8.0 * (a + t).cos(), tip.1 - 8.0 * (a + t).sin());
    let pts = [side(-0.45), tip, side(0.45)];
    svg.push_str(&format!("<path d=\"{}\" class=\"dgh\"></path>", path(&pts)));
}

fn map(w: &mut W<'_>, g: &Chart, b: &Value, m: &Metrics, counts: &HashMap<String, f64>) {
    let mut centre = HashMap::new();
    let mut left = m.gutter;
    for s in [-1, 0, 1].into_iter().filter(|s| g.side.values().any(|v| v == s)) {
        let wide = m
            .widths
            .get(usize::try_from(s + 1).unwrap_or(0))
            .copied()
            .unwrap_or(0.0);
        centre.insert(s, left + wide / 2.0);
        left += wide + m.gap;
    }
    let at = |id: &str| -> Box {
        let s = g.side.get(id).copied().unwrap_or(0);
        let wide = m
            .widths
            .get(usize::try_from(s + 1).unwrap_or(0))
            .copied()
            .unwrap_or(0.0);
        let y = TOP + f64::from(g.row.get(id).copied().unwrap_or(0)) * (m.height + m.row_gap);
        let mx = centre.get(&s).copied().unwrap_or(0.0);
        Box {
            x: mx - wide / 2.0,
            y,
            w: wide,
            h: m.height,
            mx,
            my: y + m.height / 2.0,
        }
    };
    let width = left - m.gap + m.gutter;
    let height = TOP + f64::from(g.rows) * (m.height + m.row_gap) - m.row_gap + 12.0;
    w.open(
        "div",
        &format!("dgm {}", m.cls),
        &[("style", &format!("width:{width}px;height:{height}px"))],
    );
    w.raw(&lines(g, b, m, &at, width, height));
    for id in &g.order {
        node(w, g, b, id, at(id), counts);
    }
    w.close("div");
}

fn lines(g: &Chart, b: &Value, m: &Metrics, at: &dyn Fn(&str) -> Box, width: f64, height: f64) -> String {
    let mut svg = format!("<svg width=\"{width}\" height=\"{height}\" aria-hidden=\"true\">");
    let node = |id: &str| node_of(b, id);
    let limit = |id: &str| node(id).and_then(|n| n.get("limit")).is_some_and(|l| !l.is_null());
    if let Some(first) = g.spine.first().map(|f| at(f)) {
        let line = path(&[(first.mx, 16.0), (first.mx, first.y)]);
        svg.push_str(&format!(
            "<circle cx=\"{}\" cy=\"10\" r=\"6\" class=\"dgs\"></circle>",
            first.mx
        ));
        svg.push_str(&format!("<path d=\"{line}\" class=\"dge\"></path>"));
    }
    for e in &g.edges {
        let pts = route(at(&e.from), at(&e.into), g.side.get(&e.from).copied().unwrap_or(0), m);
        let cls = if limit(&e.from) || limit(&e.into) {
            "dge timer"
        } else {
            "dge"
        };
        svg.push_str(&format!("<path d=\"{}\" class=\"{cls}\"></path>", path(&pts)));
        if let (Some(tip), Some(back)) = (pts.last(), pts.len().checked_sub(2).and_then(|i| pts.get(i))) {
            head(&mut svg, *tip, *back);
        }
        if let (true, Some(tip), Some(back)) = (e.both, pts.first(), pts.get(1)) {
            head(&mut svg, *tip, *back);
        }
    }
    svg + "</svg>"
}

fn node_of<'a>(b: &'a Value, id: &str) -> Option<&'a Value> {
    let n = match b.get("nodes")? {
        Value::Array(l) => l.iter().find(|n| n.get("id").and_then(Value::as_str) == Some(id)),
        m => m.get(id),
    };
    n.filter(|n| n.is_object())
}

fn node(w: &mut W<'_>, g: &Chart, b: &Value, id: &String, p: Box, counts: &HashMap<String, f64>) {
    let n = node_of(b, id);
    let field = |k: &str| n.and_then(|n| n.get(k)).filter(|v| !v.is_null());
    let name = g.names.get(id).unwrap_or(id);
    let label = field("label").map_or_else(|| name.clone(), |l| shown(Some(l)));
    let style = format!("left:{}px;top:{}px;width:{}px;height:{}px", p.x, p.y, p.w, p.h);
    let tap = field("tap").is_some();
    let mut at: Vec<(&str, &str)> = vec![("style", &style), ("title", &label)];
    if tap {
        at.extend([("tabindex", "0"), ("role", "button")]);
    }
    if field("limit").is_some() {
        let value = shown(field("value"));
        let aria = format!("{label} {value}, opens its setting");
        at.push(("aria-label", &aria));
        w.open("div", if tap { "dgn timer tap" } else { "dgn timer" }, &at);
        w.open("span", "", &[("aria-hidden", "true")]);
        w.text("⧗");
        w.close("span");
        w.open("span", "", &[]);
        w.el("span", "dgl", &label);
        w.el("span", "dgv", &value);
        w.close("span");
    } else {
        let count = counts.get(id).copied().unwrap_or(0.0);
        let opt = g.optional.contains(id);
        let state = field("state").map_or_else(|| "idle".to_string(), |s| shown(Some(s)));
        let cls = format!(
            "dgn {state}{}{}{}",
            if count.abs() < f64::EPSILON { " zero" } else { "" },
            if get(b, "selected") == Some(id.as_str()) {
                " picked"
            } else {
                ""
            },
            if tap { " tap" } else { "" }
        );
        let plural = if (count - 1.0).abs() < f64::EPSILON { "" } else { "s" };
        let aria = format!("{name}, {count} issue{plural}{}", if opt { ", optional" } else { "" });
        at.push(("aria-label", &aria));
        w.open("div", &cls, &at);
        w.el("span", "dgl", name);
        w.open("span", "dgc", &[]);
        w.text(&count.to_string());
        if opt {
            w.el("small", "opt", "optional");
        }
        w.close("span");
    }
    w.close("div");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let g = chart(&shown(b.get("source")));
    if g.order.is_empty() {
        return fallback(w, b);
    }
    let counts: HashMap<String, f64> = b
        .get("counts")
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .map(|(k, v)| (k.clone(), v.as_f64().unwrap_or(f64::NAN)))
        .collect();
    w.open_block("div", "dg", b, &[]);
    map(w, &g, b, &WIDE, &counts);
    map(w, &g, b, &PHONE, &counts);
    w.close("div");
}
