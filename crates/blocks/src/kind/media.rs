use serde::{Deserialize, Serialize};
use serde_json::Number;

use super::{Gesture, Media, Tone};
use crate::gesture::{Dir, Nudge, Rules, Word};

words!(MarkKind {
    Arrow,
    Box,
    Ellipse,
    Text,
    Pin,
    Highlight,
    Line
});

wire! {
    /// A mark the app keeps on a picture: places are `[x, y]` from 0 to 1 of it, `to` a two-ended mark's other end.
    pub struct Mark {
        id: String,
        kind: MarkKind,
        at: Vec<Number>,
        to: Option<Vec<Number>>,
        text: Option<String>,
        tone: Option<Tone>,
        group: Option<String>,
        path: Option<Vec<Vec<Number>>>,
        fixed: Option<bool>,
    }
}

wire! {
    /// What a draw, a move or a stretch gives; a remove gives `id` alone.
    pub struct MarkChange {
        id: Option<String>,
        kind: Option<MarkKind>,
        at: Option<Vec<Number>>,
        to: Option<Vec<Number>>,
        text: Option<String>,
        group: Option<String>,
    }
}

/// A place on the picture, `[x, y]` from 0 to 1 of it.
pub type Spot = [f64; 2];

/// What a new mark is made with: its tool, and for keys and named actions where it goes (the middle when none).
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Pen {
    pub tool: MarkKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub at: Option<Spot>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
}

/// What a gesture on a picture's marks holds: a mark's body, one of its ends, its removal, or a pen.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MarkGrab {
    Body(String),
    Start(String),
    End(String),
    Remove(String),
    Draw(Pen),
}

/// A pointer over the picture: where it was pressed and where it is now, each 0 to 1 of the picture.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct MarkReach {
    pub from: Spot,
    pub to: Spot,
}

const SMALL: f64 = 0.02;
const SIDE: f64 = 0.05;
const MIDDLE: Spot = [0.5, 0.5];

fn round(x: f64) -> f64 {
    (x.clamp(0.0, 1.0) * 10_000.0).round() / 10_000.0 + 0.0
}

fn snap([x, y]: Spot) -> Spot {
    [round(x), round(y)]
}

fn put(p: Spot) -> Vec<Number> {
    snap(p)
        .into_iter()
        .map(|v| Number::from_f64(v).unwrap_or_else(|| Number::from(0)))
        .collect()
}

fn spot(p: &[Number]) -> Option<Spot> {
    match p {
        [x, y] => Some([x.as_f64()?, y.as_f64()?]),
        _ => None,
    }
}

fn ends(c: &MarkChange) -> Option<(Spot, Option<Spot>)> {
    let at = spot(c.at.as_deref()?)?;
    match c.to.as_deref() {
        Some(t) => Some((at, Some(spot(t)?))),
        None => Some((at, None)),
    }
}

fn big([ax, ay]: Spot, [tx, ty]: Spot) -> bool {
    (tx - ax).abs().max((ty - ay).abs()) >= SMALL
}

fn placed(c: &MarkChange, at: Spot, to: Option<Spot>) -> MarkChange {
    MarkChange {
        at: Some(put(at)),
        to: to.map(put),
        ..c.clone()
    }
}

fn moved(c: &MarkChange, [dx, dy]: Spot) -> Option<MarkChange> {
    let ([ax, ay], to) = ends(c)?;
    let [tx, ty] = to.unwrap_or([ax, ay]);
    let dx = dx.max(-ax.min(tx)).min(1.0 - ax.max(tx));
    let dy = dy.max(-ay.min(ty)).min(1.0 - ay.max(ty));
    Some(placed(c, [ax + dx, ay + dy], to.map(|_| [tx + dx, ty + dy])))
}

fn stretched(c: &MarkChange, end: bool, [dx, dy]: Spot) -> Option<MarkChange> {
    let (at, to) = ends(c)?;
    let to = to?;
    let ([x, y], fixed) = if end { (to, at) } else { (at, to) };
    let pulled = snap([x + dx, y + dy]);
    let (at, to) = if end { (fixed, pulled) } else { (pulled, fixed) };
    big(at, to).then(|| placed(c, at, Some(to)))
}

fn two_ended(k: &MarkKind) -> bool {
    matches!(
        k,
        MarkKind::Arrow | MarkKind::Box | MarkKind::Ellipse | MarkKind::Highlight | MarkKind::Line
    )
}

fn made(p: &Pen, at: Spot, to: Option<Spot>) -> Option<MarkChange> {
    let text = match p.tool {
        MarkKind::Text => Some(p.text.clone().filter(|t| !t.trim().is_empty())?),
        _ => None,
    };
    let c = MarkChange {
        kind: Some(p.tool.clone()),
        text,
        group: p.group.clone(),
        ..MarkChange::default()
    };
    Some(placed(&c, at, to))
}

fn drawn(p: &Pen, from: Spot, to: Spot) -> Option<MarkChange> {
    let (from, to) = (snap(from), snap(to));
    match p.tool {
        MarkKind::Pin | MarkKind::Text => made(p, to, None),
        MarkKind::Other(_) => None,
        _ => big(from, to).then(|| made(p, from, Some(to)))?,
    }
}

fn keyed(p: &Pen) -> Option<MarkChange> {
    let [x, y] = p.at.unwrap_or(MIDDLE);
    if two_ended(&p.tool) {
        made(p, [x - SIDE, y - SIDE], Some([x + SIDE, y + SIDE]))
    } else {
        made(p, [x, y], None)
    }
}

fn toward([dx, dy]: Spot) -> Dir {
    match (dx.abs() >= dy.abs(), dx >= 0.0, dy >= 0.0) {
        (true, true, _) => Dir::Right,
        (true, false, _) => Dir::Left,
        (false, _, true) => Dir::Down,
        (false, _, false) => Dir::Up,
    }
}

fn back(d: Dir) -> Dir {
    match d {
        Dir::Left => Dir::Right,
        Dir::Right => Dir::Left,
        Dir::Up => Dir::Down,
        Dir::Down => Dir::Up,
    }
}

/// The word a mark's kind is spoken as.
#[must_use]
pub fn said(k: &MarkKind) -> &str {
    match k {
        MarkKind::Arrow => "Arrow",
        MarkKind::Box => "Box",
        MarkKind::Ellipse => "Ellipse",
        MarkKind::Text => "Text",
        MarkKind::Pin => "Pin",
        MarkKind::Highlight => "Highlight",
        MarkKind::Line => "Line",
        MarkKind::Other(s) => s,
    }
}

/// The ninth of the picture a place is in: "upper left", "centre", "middle right".
#[must_use]
pub fn ninth([x, y]: Spot) -> String {
    let row = if y < 1.0 / 3.0 {
        "upper"
    } else if y < 2.0 / 3.0 {
        "middle"
    } else {
        "lower"
    };
    let col = if x < 1.0 / 3.0 {
        "left"
    } else if x < 2.0 / 3.0 {
        "centre"
    } else {
        "right"
    };
    match (row, col) {
        ("middle", "centre") => "centre".into(),
        _ => format!("{row} {col}"),
    }
}

impl Media {
    fn mark(&self, id: &str) -> Option<&Mark> {
        self.marks.as_deref()?.iter().find(|m| m.id == id)
    }

    fn live(&self, id: &str, g: Option<&Gesture>) -> Option<&Mark> {
        g.and(self.mark(id)).filter(|m| m.fixed != Some(true))
    }

    /// A mark's spoken name: its group, its kind and number (a pin's text, a text mark's words), and its ninth.
    #[must_use]
    pub fn named(&self, id: &str) -> Option<String> {
        let m = self.mark(id)?;
        let all = self.marks.as_deref().unwrap_or_default();
        let n = all
            .iter()
            .filter(|o| o.kind == m.kind)
            .position(|o| o.id == id)
            .map_or(0, |i| i + 1);
        let group = m.group.as_ref().map(|g| format!("{g}, ")).unwrap_or_default();
        let place = ninth(spot(&m.at).unwrap_or(MIDDLE));
        let text = m.text.as_deref().unwrap_or_default();
        Some(match m.kind {
            MarkKind::Text => format!("{group}Text “{text}”, {place}"),
            MarkKind::Pin if !text.is_empty() => format!("{group}Pin {text}, {place}"),
            _ => format!("{group}{} {n}, {place}", said(&m.kind)),
        })
    }
}

impl Rules for Media {
    type Grab = MarkGrab;
    type Reach = MarkReach;
    type Change = MarkChange;

    fn word(&self, grab: &MarkGrab) -> Option<Word> {
        match grab {
            MarkGrab::Body(id) => self.live(id, self.moves.as_ref()).map(|_| Word::Move),
            MarkGrab::Start(id) | MarkGrab::End(id) => self
                .live(id, self.stretch.as_ref())
                .filter(|m| m.to.is_some())
                .map(|_| Word::Stretch),
            MarkGrab::Remove(id) => self.live(id, self.remove.as_ref()).map(|_| Word::Remove),
            MarkGrab::Draw(p) => {
                let listed = self.tools.as_ref().is_some_and(|t| t.contains(&p.tool));
                (self.draw.is_some() && listed && !matches!(p.tool, MarkKind::Other(_))).then_some(Word::Draw)
            }
        }
    }

    fn start(&self, grab: &MarkGrab) -> Option<MarkChange> {
        self.word(grab)?;
        match grab {
            MarkGrab::Body(id) | MarkGrab::Start(id) | MarkGrab::End(id) | MarkGrab::Remove(id) => {
                let m = self.mark(id)?;
                let c = MarkChange {
                    id: Some(m.id.clone()),
                    at: Some(m.at.clone()),
                    to: m.to.clone(),
                    ..MarkChange::default()
                };
                let (at, to) = ends(&c)?;
                Some(placed(&c, at, to))
            }
            MarkGrab::Draw(_) => Some(MarkChange::default()),
        }
    }

    fn candidate(&self, grab: &MarkGrab, reach: &MarkReach) -> Option<MarkChange> {
        let s = self.start(grab)?;
        let ([fx, fy], [tx, ty]) = (reach.from, reach.to);
        let d = [tx - fx, ty - fy];
        match grab {
            MarkGrab::Body(_) => moved(&s, d),
            MarkGrab::Start(_) => stretched(&s, false, d),
            MarkGrab::End(_) => stretched(&s, true, d),
            MarkGrab::Remove(id) => Some(MarkChange {
                id: Some(id.clone()),
                ..MarkChange::default()
            }),
            MarkGrab::Draw(p) => {
                let on = [fx, fy].iter().all(|v| (0.0..=1.0).contains(v));
                on.then(|| drawn(p, reach.from, reach.to))?
            }
        }
    }

    fn nudge(&self, grab: &MarkGrab, from: &MarkChange, by: Nudge) -> Option<MarkChange> {
        let s = self.start(grab)?;
        let step = if by.big { 0.1 } else { 0.01 };
        let d = match by.dir {
            Dir::Left => [-step, 0.0],
            Dir::Right => [step, 0.0],
            Dir::Up => [0.0, -step],
            Dir::Down => [0.0, step],
        };
        let next = match grab {
            MarkGrab::Draw(p) if *from == s => keyed(p),
            MarkGrab::Body(_) | MarkGrab::Draw(_) => moved(from, d),
            MarkGrab::Start(_) => stretched(from, false, d),
            MarkGrab::End(_) => stretched(from, true, d),
            MarkGrab::Remove(_) => self.candidate(
                grab,
                &MarkReach {
                    from: MIDDLE,
                    to: MIDDLE,
                },
            ),
        }?;
        (next != *from).then_some(next)
    }

    fn steps(&self, grab: &MarkGrab) -> Vec<(String, Nudge)> {
        let Some(s) = self.start(grab) else { return vec![] };
        let one = |dir| Nudge { dir, big: false };
        let named: Vec<(String, Dir)> = match grab {
            MarkGrab::Body(_) => [
                ("up", Dir::Up),
                ("down", Dir::Down),
                ("left", Dir::Left),
                ("right", Dir::Right),
            ]
            .map(|(w, d)| (format!("Move {w}"), d))
            .to_vec(),
            MarkGrab::Start(_) | MarkGrab::End(_) => {
                let Some(([ax, ay], Some([tx, ty]))) = ends(&s) else {
                    return vec![];
                };
                let out = if matches!(grab, MarkGrab::End(_)) {
                    [tx - ax, ty - ay]
                } else {
                    [ax - tx, ay - ty]
                };
                let d = toward(out);
                vec![("Longer".into(), d), ("Shorter".into(), back(d))]
            }
            MarkGrab::Remove(_) => vec![("Delete".into(), Dir::Right)],
            MarkGrab::Draw(p) => vec![(format!("Add {}", said(&p.tool).to_lowercase()), Dir::Right)],
        };
        named
            .into_iter()
            .map(|(n, d)| (n, one(d)))
            .filter(|(_, n)| self.nudge(grab, &s, *n).is_some())
            .collect()
    }

    fn says(&self, grab: &MarkGrab, change: &MarkChange) -> String {
        let id = match grab {
            MarkGrab::Body(id) | MarkGrab::Start(id) | MarkGrab::End(id) | MarkGrab::Remove(id) => Some(id.as_str()),
            MarkGrab::Draw(_) => None,
        };
        let m = id.and_then(|i| self.mark(i));
        if let (MarkGrab::Remove(i), None) = (grab, &change.at) {
            return format!("Delete {}", self.named(i).unwrap_or_default());
        }
        let kind = change.kind.as_ref().or(m.map(|m| &m.kind)).cloned().unwrap_or_default();
        let text = change.text.as_ref().or(m.and_then(|m| m.text.as_ref()));
        let what = match (&kind, text) {
            (MarkKind::Text, Some(t)) => format!("Text “{t}”"),
            _ => said(&kind).to_string(),
        };
        match ends(change) {
            Some((at, Some(to))) => format!("{what}, {} to {}", ninth(at), ninth(to)),
            Some((at, None)) => format!("{what}, {}", ninth(at)),
            None => what,
        }
    }
}
