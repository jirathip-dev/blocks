use serde::{Deserialize, Serialize};
use serde_json::Value;

use std::collections::BTreeSet;

use crate::behave::view;
use crate::built::{children, Built};
use crate::expr::State;
use crate::wire::{Action, Answer, Frame};

pub(crate) const VARIANTS: [(&str, &str); 9] = [
    ("modal", "variant"),
    ("sheet", "variant"),
    ("row", "style"),
    ("card", "kind"),
    ("button", "style"),
    ("text", "style"),
    ("images", "size"),
    ("message", "role"),
    ("tool", "state"),
];

pub(crate) const ROLES: [(&str, &str); 12] = [
    ("modal", "dialog"),
    ("sheet", "dialog"),
    ("section", "region"),
    ("form", "form"),
    ("config", "form"),
    ("nav", "navigation"),
    ("chart", "figure"),
    ("plot", "figure"),
    ("toast", "status"),
    ("message", "article"),
    ("sidebar", "navigation"),
    ("boxplot", "figure"),
];
pub(crate) const NAMES: [&str; 9] = [
    "label",
    "title",
    "header",
    "question",
    "alt",
    "file",
    "command",
    "placeholder",
    "name",
];

fn text_of<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(Value::as_str).filter(|s| !s.is_empty())
}

/// The accessible role and name every renderer gives the root of block `v`.
pub fn a11y(v: &Value) -> (&str, &str) {
    let kind = text_of(v, "type").unwrap_or_default();
    let tap = v.get("tap").filter(|t| t.is_object());
    let url = tap.is_some_and(|t| t.get("url").is_some_and(|u| !u.is_null()));
    let wrapped = ["rounds", "swipe"]
        .iter()
        .any(|k| v.get(k).and_then(Value::as_array).is_some_and(|a| !a.is_empty()));
    let role = match kind {
        "button" | "row" if url && !wrapped => "link",
        "row" if tap.is_some() && !wrapped => "button",
        "button" | "editor" => "button",
        "modal" | "sheet" if text_of(v, "variant") == Some("alert") => "alertdialog",
        _ => ROLES.iter().find(|(k, _)| *k == kind).map_or("group", |(_, r)| r),
    };
    let name = NAMES
        .iter()
        .find_map(|k| text_of(v, k))
        .or_else(|| text_of(v, "id"))
        .unwrap_or(kind);
    (role, name)
}

/// How a renderer drew a block: its own view, its fallback, or not at all.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "TreeDrawn"))]
#[serde(rename_all = "lowercase")]
pub enum Drawn {
    Native,
    Fallback,
    Hidden,
}

/// One block of the drawn tree; `rect` and `text` come from a harness, never from `expect`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "TreeNode"))]
pub struct Node {
    pub kind: String,
    pub id: Option<String>,
    pub variant: Option<String>,
    pub drawn: Drawn,
    pub role: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rect: Option<[f64; 4]>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fields: Option<Vec<FieldNode>>,
    pub children: Vec<Node>,
}

/// How a renderer drew a field: its type's own view, a plain text input, or not at all.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum FieldDrawn {
    Native,
    Plain,
    Hidden,
}

/// One field of a form in the drawn tree.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct FieldNode {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub drawn: FieldDrawn,
    pub role: String,
    pub label: String,
}

/// The block a tap or a scroll goes to.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "StepOn"))]
pub struct On {
    pub id: String,
}

/// Text typed into a block's field.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "StepType"))]
pub struct Typing {
    pub id: String,
    pub text: String,
}

/// A PNG and a tree taken under this name.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "StepShot"))]
pub struct Shot {
    pub name: String,
}

/// How a scripted gesture comes in: a pointer, the keys, or a named accessibility action.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum Via {
    Pointer,
    Keys,
    Action,
}

/// A gesture on one item of a block: pointer offsets `[dx, dy]` in px, key nudges, or named actions, in turn.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "StepGesture"))]
pub struct Gesturing {
    pub id: String,
    pub grab: Value,
    pub reach: Vec<Value>,
    pub via: Via,
}

/// The action out fails, with its toast as the reason.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "StepRefuse"))]
pub struct Refusal {
    pub toast: String,
}

/// What the harness's file handler does with a picked file: answers with an id, rejects it, or never answers.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum Handler {
    Answers,
    Fails,
    Waits,
}

/// A file picked in an upload field: its name, its size in bytes, its media type and what the handler does.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "StepFile"))]
pub struct Picking {
    pub field: String,
    pub name: String,
    pub size: u64,
    pub mime: String,
    pub handler: Handler,
}

/// One scripted input: by block id, a stream frame arriving, an action answered, or a shot.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum Step {
    Tap(On),
    Type(Typing),
    Scroll(On),
    Frame(Frame),
    Answer(Box<Answer>),
    Shot(Shot),
    Gesture(Gesturing),
    Refuse(Refusal),
    File(Picking),
}

/// How long the first paint and each step took; the frame fields only where a harness draws real frames.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Timings {
    pub first_paint_ms: f64,
    pub steps_ms: Vec<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub longest_frame_ms: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frames_over_budget: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub longest_patch_ms: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub p99_patch_ms: Option<f64>,
}

/// A harness run's `report.json`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Report {
    pub shots: Vec<String>,
    pub sent: Vec<Action>,
    pub dropped: Vec<String>,
    pub timings: Timings,
}

/// The tree a renderer that draws `kinds` natively must draw for `screen` in `state`, roles and names included: no rect, no text.
pub fn expect(screen: &Built, kinds: &[&str], state: &State) -> Node {
    node(screen.value(), kinds, None, &view(screen, state).hidden)
}

/// `expect`, with each form's `fields` as a renderer that draws `types` natively must draw them.
pub fn expect_fields(screen: &Built, kinds: &[&str], types: &[&str], state: &State) -> Node {
    node(screen.value(), kinds, Some(types), &view(screen, state).hidden)
}

fn field(f: &Value, types: &[&str], hide: &BTreeSet<String>) -> FieldNode {
    let (name, kind) = (
        text_of(f, "name").unwrap_or_default(),
        text_of(f, "type").unwrap_or_default(),
    );
    let known = crate::Field::TYPES.iter().position(|t| *t == kind);
    let drawn = match (hide.contains(name), types.contains(&kind)) {
        (true, _) => FieldDrawn::Hidden,
        (false, true) => FieldDrawn::Native,
        (false, false) => FieldDrawn::Plain,
    };
    let role = known
        .filter(|_| drawn == FieldDrawn::Native)
        .and_then(|i| crate::Field::ROLES.get(i));
    FieldNode {
        name: name.into(),
        kind: kind.into(),
        drawn,
        role: role.copied().unwrap_or("textbox").into(),
        label: text_of(f, "label").unwrap_or(name).into(),
    }
}

fn node(v: &Value, kinds: &[&str], types: Option<&[&str]>, hide: &BTreeSet<String>) -> Node {
    let text = |k: &str| text_of(v, k).map(String::from);
    let kind = text("type").unwrap_or_default();
    let form = ["form", "config"].contains(&kind.as_str());
    let variant = VARIANTS.iter().find(|(k, _)| *k == kind).and_then(|(_, f)| text(f));
    let hidden = text("id").is_some_and(|i| hide.contains(&i));
    let native = kinds.contains(&kind.as_str());
    let drawn = match (hidden, native) {
        (true, _) => Drawn::Hidden,
        (false, true) => Drawn::Native,
        (false, false) => Drawn::Fallback,
    };
    let under: Vec<&Value> = match (drawn, v.as_object()) {
        (Drawn::Native, Some(o)) => children(o).collect(),
        (Drawn::Fallback, _) => v
            .get("blocks")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect(),
        _ => vec![],
    };
    let (role, name) = a11y(v);
    Node {
        role: role.into(),
        name: name.into(),
        id: text("id"),
        kind,
        variant,
        drawn,
        rect: None,
        text: None,
        fields: types.filter(|_| form && drawn == Drawn::Native).map(|t| {
            let all = v.get("fields").and_then(Value::as_array).into_iter().flatten();
            all.map(|f| field(f, t, hide)).collect()
        }),
        children: under.into_iter().map(|c| node(c, kinds, types, hide)).collect(),
    }
}

fn who(n: &Node) -> String {
    n.id.as_ref()
        .map_or_else(|| n.kind.clone(), |id| format!("{}#{id}", n.kind))
}

/// Where `got` differs from `want` in kind, id, drawn, role, name, fields or child count, each as `at/…: what`; empty when it matches.
pub fn check(got: Option<&Node>, want: &Node, at: &str) -> Vec<String> {
    let Some(got) = got.filter(|g| g.kind == want.kind && g.id == want.id && g.drawn == want.drawn) else {
        let drew = got.map_or_else(|| "nothing".into(), |g| format!("{} {}", who(g), drawn(g.drawn)));
        return vec![format!(
            "{at}: drew {drew}, expected {} {}",
            who(want),
            drawn(want.drawn)
        )];
    };
    let here = format!("{at}/{}", who(got));
    let mut out = Vec::new();
    if (&got.role, &got.name) != (&want.role, &want.name) {
        let (g, w) = (&got, want);
        out.push(format!(
            "{here}: drew {} \"{}\", expected {} \"{}\"",
            g.role, g.name, w.role, w.name
        ));
    }
    if want.fields.is_some() && got.fields != want.fields {
        out.push(format!(
            "{here}: drew fields {:?}, expected {:?}",
            got.fields, want.fields
        ));
    }
    if got.children.len() != want.children.len() {
        let (g, w) = (got.children.len(), want.children.len());
        out.push(format!("{here}: {g} children, expected {w}"));
    }
    for (i, c) in want.children.iter().enumerate() {
        out.extend(check(got.children.get(i), c, &here));
    }
    out
}

fn drawn(d: Drawn) -> &'static str {
    match d {
        Drawn::Native => "native",
        Drawn::Fallback => "fallback",
        Drawn::Hidden => "hidden",
    }
}
