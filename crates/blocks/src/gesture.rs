use serde::{Deserialize, Serialize};

/// The gesture words: each is the name of a field on the kinds that take it.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Word {
    Reorder,
    Move,
    Stretch,
    Edit,
    Draw,
    Remove,
}

impl Word {
    /// Every word, as the field names a block declares its gestures under.
    pub const ALL: [&'static str; 6] = ["reorder", "move", "stretch", "edit", "draw", "remove"];
}

/// Where one item's gesture is.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "at", rename_all = "lowercase")]
pub enum Phase<C> {
    Idle,
    Pressed,
    Dragging,
    Previewing { c: C },
    Sent { c: C },
    Confirmed,
    Refused { why: String },
}

/// What happens to it.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "on", rename_all = "lowercase")]
pub enum Event<C> {
    Press,
    Move { c: Option<C> },
    Release,
    Cancel,
    Answer { ok: bool, why: Option<String> },
    Settled,
}

/// What the renderer must do after a step, besides drawing the phase.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Effect<C> {
    Tap,
    Send(C),
}

/// One step: total, no clock, no I/O. `start` is the item as the data has it.
pub fn step<C: Clone + PartialEq>(phase: Phase<C>, event: Event<C>, start: &C) -> (Phase<C>, Option<Effect<C>>) {
    match (phase, event) {
        (Phase::Idle, Event::Press) => (Phase::Pressed, None),
        (Phase::Pressed, Event::Release) => (Phase::Idle, Some(Effect::Tap)),
        (Phase::Pressed | Phase::Dragging | Phase::Previewing { .. }, Event::Move { c: Some(c) }) => {
            (Phase::Previewing { c }, None)
        }
        (Phase::Pressed | Phase::Dragging | Phase::Previewing { .. }, Event::Move { c: None }) => {
            (Phase::Dragging, None)
        }
        (Phase::Pressed | Phase::Dragging | Phase::Previewing { .. }, Event::Cancel)
        | (Phase::Dragging, Event::Release) => (Phase::Idle, None),
        (Phase::Previewing { c }, Event::Release) if &c == start => (Phase::Idle, None),
        (Phase::Previewing { c }, Event::Release) => (Phase::Sent { c: c.clone() }, Some(Effect::Send(c))),
        (Phase::Sent { .. }, Event::Answer { ok: true, .. }) => (Phase::Confirmed, None),
        (Phase::Sent { .. }, Event::Answer { ok: false, why }) => (
            Phase::Refused {
                why: why.unwrap_or_default(),
            },
            None,
        ),
        (Phase::Confirmed | Phase::Refused { .. }, Event::Settled) => (Phase::Idle, None),
        (phase, _) => (phase, None),
    }
}

/// A direction a key or a named accessibility action nudges in.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Dir {
    Left,
    Right,
    Up,
    Down,
}

/// A nudge by a key or a named accessibility action; `big` is Shift's.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Nudge {
    pub dir: Dir,
    #[serde(default)]
    pub big: bool,
}

/// What a kind that takes gestures answers; no pixels, no time.
pub trait Rules {
    type Grab;
    type Reach;
    type Change: Clone + PartialEq + Serialize;

    /// The word of the gesture a grab belongs to; none when the block does not declare it or the item is fixed.
    fn word(&self, grab: &Self::Grab) -> Option<Word>;
    /// The grabbed item as the data has it.
    fn start(&self, grab: &Self::Grab) -> Option<Self::Change>;
    /// The result for a reach in the kind's own units, snapped and clamped; none where no result is allowed.
    fn candidate(&self, grab: &Self::Grab, reach: &Self::Reach) -> Option<Self::Change>;
    /// The next candidate from `from` in a direction; none at an end.
    fn nudge(&self, grab: &Self::Grab, from: &Self::Change, by: Nudge) -> Option<Self::Change>;
    /// The named steps a screen reader offers for a grab: each is one whole gesture of one nudge.
    fn steps(&self, grab: &Self::Grab) -> Vec<(String, Nudge)>;
    /// The words spoken for a candidate of a grab.
    fn says(&self, grab: &Self::Grab, change: &Self::Change) -> String;
}
