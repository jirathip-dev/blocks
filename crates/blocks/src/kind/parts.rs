use serde::{Deserialize, Serialize};
use serde_json::{Map, Number, Value};

use super::Block;
use crate::expr::Expr;

/// A field sent as `null` when it has no value, rather than left out.
pub type Nullable<T> = Option<T>;

/// A JSON object: action values, merged fields, an app's own data.
pub type Fields = Map<String, Value>;

words!(Tone {
    Ok,
    Warn,
    Bad,
    Info,
    Mute,
    Accent,
    Working,
    Needs,
    Done,
    Fail,
    Idle
});
words!(LaneState {
    Working,
    Needs,
    Done,
    Idle,
    Fail,
    Merged
});
words!(Keyboard { Default, Url, Number });
words!(Accessory { Chevron, None });
words!(RowStyle { Link, Destructive });
words!(CardKind {
    Ask,
    Run,
    Secret,
    Config,
    Proposal
});
words!(ButtonStyle {
    Primary,
    Plain,
    Destructive
});
words!(TextStyle { Body, Footnote });
words!(ImageSize { Small, Large });

wire! {
    /// A moment a value counts from or to; `label` shows it, `{}` the age since `since`, `{rel}` what is left until `until`.
    pub struct Time {
        since: Option<String>,
        until: Option<String>,
        label: Option<String>,
    }
}

wire! {
    /// A value bound to local state: it shows the text of state key `get`.
    pub struct Bound {
        get: String,
    }
}

/// A shown value (a row's or tile's value, a card's meta, a label's text): a string, a number, a state key's value, or a time.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Shown {
    Text(String),
    Number(Number),
    Get(Bound),
    Time(Time),
}

impl Default for Shown {
    fn default() -> Self {
        Self::Text(String::new())
    }
}

impl From<&str> for Shown {
    fn from(s: &str) -> Self {
        Self::Text(s.into())
    }
}

impl From<String> for Shown {
    fn from(s: String) -> Self {
        Self::Text(s)
    }
}

impl From<Time> for Shown {
    fn from(t: Time) -> Self {
        Self::Time(t)
    }
}

wire! {
    /// A short text and its tone: a badge, or a toned subtitle.
    pub struct Label {
        text: Shown,
        tone: Option<Tone>,
    }
}

/// A subtitle: plain text, or text with a tone.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Toned {
    Text(String),
    Label(Label),
}

wire! {
    /// What a tap does: open a screen or sheet, send an action, open a thread or a URL, focus, copy.
    pub struct Tap {
        open: Option<String>,
        sheet: Option<String>,
        action: Option<String>,
        values: Option<Fields>,
        thread: Option<String>,
        url: Option<String>,
        focus: Option<String>,
        copy: Option<String>,
        set: Option<Vec<Set>>,
    }
}

wire! {
    /// A tap's change of local state: `key` becomes the value of `to`; nothing is sent.
    #[cfg_attr(feature = "schema", schemars(rename = "SetState"))]
    pub struct Set {
        key: String,
        to: Expr,
    }
}

wire! {
    /// A field's test: while `ok` does not hold, the field shows `say` and its form's submit is off.
    pub struct Check {
        ok: Expr,
        say: String,
    }
}

wire! {
    /// The question asked before an action runs.
    pub struct Confirm {
        title: String,
        message: Option<String>,
        ok: Option<String>,
        destructive: Option<bool>,
    }
}

wire! {
    /// A labelled action: a screen's button, a swipe, a menu item.
    pub struct Act {
        label: String,
        icon: Option<String>,
        action: Option<String>,
        values: Option<Fields>,
        tone: Option<Tone>,
        tap: Option<Tap>,
        confirm: Option<Confirm>,
        menu: Option<Vec<Act>>,
        enabled: Option<Expr>,
    }
}

wire! {
    /// A form's or a sheet's submit button.
    pub struct Submit {
        label: String,
        action: String,
        off: Option<bool>,
        values: Option<Fields>,
    }
}

/// A field's value: text, a number or a switch.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum FieldValue {
    Text(String),
    Number(Number),
    Flag(bool),
}

wire! {
    /// A screen's bar of unsaved changes.
    pub struct Pending {
        count: String,
        text: String,
        discard: Tap,
        review: Tap,
    }
}

wire! {
    /// A row's figure: its state, tool, icon or avatar.
    pub struct Figure {
        state: Option<Tone>,
        tool: Option<String>,
        icon: Option<String>,
        avatar: Option<String>,
        coat: Option<String>,
        grow: Option<String>,
    }
}

wire! {
    /// A scene's lane.
    pub struct Lane {
        id: String,
        title: String,
        stage: Option<String>,
        state: LaneState,
        tool: Option<String>,
        since: Option<String>,
        tap: Option<Tap>,
    }
}

wire! {
    /// The lane that ran a round.
    pub struct RoundLane {
        name: Option<String>,
        harness: Option<String>,
        model: Option<String>,
        host: Option<String>,
        lines: Option<Vec<String>>,
    }
}

wire! {
    /// A labelled tap.
    pub struct Link {
        label: String,
        tap: Tap,
    }
}

wire! {
    /// One round of a row's work: its state, lane, blocks and links.
    pub struct Round {
        id: String,
        name: String,
        state: LaneState,
        summary: Option<String>,
        since: Option<String>,
        tap: Option<Tap>,
        lane: Option<RoundLane>,
        blocks: Option<Vec<Block>>,
        links: Option<Vec<Link>>,
    }
}

wire! {
    /// A node of a diagram.
    pub struct Node {
        state: Option<Tone>,
        coat: Option<String>,
        tap: Option<Tap>,
        limit: Option<String>,
        label: Option<String>,
        value: Option<String>,
    }
}

wire! {
    /// A folded card's main action.
    pub struct FoldMain {
        label: String,
        action: String,
        block: Option<String>,
        value: Option<String>,
        values: Option<Fields>,
    }
}

wire! {
    /// What a folded card shows: one line and its main action.
    pub struct Fold {
        line: String,
        main: Option<FoldMain>,
    }
}

wire! {
    /// One answer of a choice.
    pub struct ChoiceOption {
        value: String,
        label: String,
        values: Option<Fields>,
        confirm: Option<Confirm>,
    }
}

wire! {
    /// A choice's free-text answer.
    pub struct Other {
        placeholder: Option<String>,
        r#for: Option<String>,
    }
}

wire! {
    /// The answer a choice takes by itself at `until`.
    pub struct ChoiceDefault {
        value: String,
        until: String,
        label: Option<String>,
    }
}

wire! {
    /// One chip.
    pub struct ChipOption {
        value: String,
        label: String,
    }
}

wire! {
    /// One figure of a stat.
    pub struct Tile {
        label: String,
        value: Shown,
        unit: Option<String>,
        tone: Option<Tone>,
        spark: Option<Vec<Number>>,
    }
}

wire! {
    /// One step of a stepper: a done one with a tap can be pressed.
    pub struct Stage {
        id: String,
        label: String,
        sub: Option<String>,
        tap: Option<Tap>,
    }
}

wire! {
    /// One progress bar: its value from 0 to 100 and its tone.
    pub struct Bar {
        label: String,
        value: u8,
        tone: Option<Tone>,
        sub: Option<String>,
    }
}

wire! {
    /// One image.
    pub struct Image {
        src: String,
        alt: Option<String>,
        caption: Option<String>,
    }
}

wire! {
    /// One hunk of a diff.
    pub struct Hunk {
        at: String,
        lines: Vec<String>,
    }
}

wire! {
    /// An editor's error on a line.
    pub struct LineError {
        line: i64,
        message: String,
    }
}

wire! {
    /// One row of a `lines` block: its id and its values by column name.
    pub struct LineItem {
        id: String,
        values: Fields,
    }
}

wire! {
    /// An app's check on a `lines` block: on a row and a column, or on the whole block.
    pub struct RowError {
        row: Option<String>,
        name: Option<String>,
        message: String,
    }
}

wire! {
    /// A composer's picker: its name, current value and choices.
    pub struct ComposerChip {
        name: String,
        cur: Nullable<String>,
        all: Vec<String>,
    }
}

wire! {
    /// A message queued for the turn's end.
    pub struct Queued {
        q: u64,
        text: String,
    }
}

wire! {
    /// A composer's turn in progress: when it started.
    pub struct Working {
        since: String,
    }
}

wire! {
    /// A gesture a block allows: the action its result is sent as, under `name` in the action's values.
    pub struct Gesture {
        action: String,
        name: String,
        enabled: Option<Expr>,
    }
}

wire! {
    /// What a client with no view for a block's `type` draws: a plain row.
    pub struct Fallback {
        title: String,
        subtitle: Option<String>,
        tap: Option<Tap>,
    }
}

wire! {
    /// A toast's undo: its label (default "undo") and the action it sends, with any confirm.
    pub struct Undo {
        label: Option<String>,
        action: String,
        values: Option<Fields>,
        confirm: Option<Confirm>,
    }
}

wire! {
    /// One page of a `pages` block: its picture, what it shows, and its size in pixels.
    pub struct Page {
        src: String,
        alt: String,
        width: u32,
        height: u32,
    }
}
