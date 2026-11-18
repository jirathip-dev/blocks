use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Number, Value};

macro_rules! wire {
    ($(#[$m:meta])* pub struct $name:ident { $($body:tt)* }) => {
        wire!(@field [$(#[$m])* pub struct $name] [] $($body)*);
    };
    (@field [$($head:tt)*] [$($out:tt)*] $(#[$fm:meta])* $f:ident: Option<$t:ty>, $($rest:tt)*) => {
        wire!(@field [$($head)*] [$($out)* $(#[$fm])*
            #[serde(default, skip_serializing_if = "Option::is_none")] pub $f: Option<$t>,] $($rest)*);
    };
    (@field [$($head:tt)*] [$($out:tt)*] $(#[$fm:meta])* $f:ident: $t:ty, $($rest:tt)*) => {
        wire!(@field [$($head)*] [$($out)* $(#[$fm])* pub $f: $t,] $($rest)*);
    };
    (@field [$($head:tt)*] [$($out:tt)*]) => {
        #[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        $($head)* { $($out)* }
    };
}

macro_rules! words {
    ($(#[$m:meta])* $name:ident { $first:ident $(, $v:ident)* $(,)? }) => {
        $(#[$m])*
        #[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        #[serde(rename_all = "kebab-case")]
        pub enum $name {
            #[default]
            $first,
            $($v,)*
            #[serde(untagged)]
            Other(String),
        }
    };
}

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
words!(FieldKind {
    Text,
    Toggle,
    Picker,
    Secret
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
    /// A moment a value counts from or to.
    pub struct Time {
        since: Option<String>,
        until: Option<String>,
    }
}

/// A row's or a tile's value: a string, a number, or a time.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Shown {
    Text(String),
    Number(Number),
    Time(Time),
}

impl Default for Shown {
    fn default() -> Self {
        Self::Text(String::new())
    }
}

wire! {
    /// A short text and its tone: a badge, or a toned subtitle.
    pub struct Label {
        text: String,
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
    /// One input of a form.
    pub struct Field {
        #[serde(rename = "type")]
        kind: FieldKind,
        name: String,
        label: Option<String>,
        placeholder: Option<String>,
        keyboard: Option<Keyboard>,
        value: Option<FieldValue>,
        options: Option<Vec<String>>,
        set: Option<bool>,
        doc: Option<String>,
        was: Option<String>,
        error: Option<String>,
        open: Option<bool>,
    }
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
    /// A reorderable list's action.
    pub struct Reorder {
        action: String,
        name: String,
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
    /// A whole screen.
    pub struct Screen {
        id: Option<String>,
        title: Option<String>,
        large: Option<bool>,
        stream: Option<String>,
        actions: Option<Vec<Act>>,
        blocks: Option<Vec<Block>>,
        back: Option<String>,
        done: Option<Submit>,
        refresh: Option<bool>,
        pending: Option<Pending>,
        focus: Option<bool>,
        badge: Option<u64>,
        source: Option<String>,
        url: Option<String>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A sheet over a screen.
    pub struct Sheet {
        id: Option<String>,
        title: String,
        cancel: Option<String>,
        done: Option<Submit>,
        blocks: Vec<Block>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A titled group of blocks.
    pub struct Section {
        id: Option<String>,
        header: Option<String>,
        footer: Option<String>,
        blocks: Vec<Block>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A list of rows.
    pub struct List {
        id: Option<String>,
        rows: Vec<Block>,
        reorder: Option<Reorder>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// One row of a list.
    pub struct Row {
        id: Option<String>,
        title: String,
        subtitle: Option<Toned>,
        badge: Option<Label>,
        figure: Option<Figure>,
        value: Option<Shown>,
        accessory: Option<Accessory>,
        swipe: Option<Vec<Act>>,
        tap: Option<Tap>,
        menu: Option<Vec<Act>>,
        indent: Option<u8>,
        style: Option<RowStyle>,
        button: Option<Act>,
        handle: Option<bool>,
        lifted: Option<bool>,
        changed: Option<bool>,
        sticky: Option<bool>,
        rounds: Option<Vec<Round>>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A card: an ask, a run, a config or a proposal.
    pub struct Card {
        id: Option<String>,
        kind: Option<CardKind>,
        tone: Option<Tone>,
        title: Option<String>,
        subtitle: Option<String>,
        meta: Option<String>,
        badge: Option<Label>,
        buttons: Option<Vec<Block>>,
        tap: Option<Tap>,
        push: Option<bool>,
        blocks: Option<Vec<Block>>,
        menu: Option<Vec<Act>>,
        fold: Option<Fold>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A question with options, a free answer and a default.
    pub struct Choice {
        id: Option<String>,
        action: String,
        question: Option<String>,
        recommended: Option<String>,
        options: Vec<ChoiceOption>,
        other: Option<Other>,
        default: Option<ChoiceDefault>,
        values: Option<Fields>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A form of fields; also the `config` kind.
    pub struct Form {
        id: Option<String>,
        submit: Option<Submit>,
        action: Option<String>,
        fields: Vec<Field>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A secret's input: its value is never sent back.
    pub struct Secret {
        id: Option<String>,
        name: String,
        action: String,
        label: Option<String>,
        placeholder: Option<String>,
        set: Option<bool>,
        values: Option<Fields>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A command the owner approves to run.
    pub struct Run {
        id: Option<String>,
        action: String,
        command: String,
        sha: String,
        dir: Option<String>,
        touches: Option<String>,
        until: Option<String>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A button.
    pub struct Button {
        id: Option<String>,
        label: String,
        style: Option<ButtonStyle>,
        action: Option<String>,
        values: Option<Fields>,
        tap: Option<Tap>,
        confirm: Option<Confirm>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A row of chips, one or many selected.
    pub struct Chips {
        id: Option<String>,
        name: String,
        multi: Option<bool>,
        action: Option<String>,
        selected: Option<Vec<String>>,
        options: Vec<ChipOption>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// Figures: a list of tiles, or one tile inline.
    pub struct Stat {
        id: Option<String>,
        items: Option<Vec<Tile>>,
        label: Option<String>,
        value: Option<Shown>,
        unit: Option<String>,
        tone: Option<Tone>,
        spark: Option<Vec<Number>>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// Text: markdown, or a plain styled line.
    pub struct Text {
        id: Option<String>,
        markdown: Option<String>,
        style: Option<TextStyle>,
        until: Option<String>,
        text: Option<String>,
        size: Option<Number>,
        weight: Option<String>,
        font: Option<String>,
        tone: Option<Tone>,
        center: Option<bool>,
        top: Option<Number>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A strip of images.
    pub struct Images {
        id: Option<String>,
        size: Option<ImageSize>,
        items: Vec<Image>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A web view of a fixed height.
    pub struct Web {
        id: Option<String>,
        src: String,
        height: u32,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A file's diff.
    pub struct Diff {
        id: Option<String>,
        file: String,
        summary: Option<String>,
        hunks: Vec<Hunk>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A text editor and its errors.
    pub struct Editor {
        id: Option<String>,
        name: String,
        text: String,
        action: String,
        first: Option<u32>,
        errors: Option<Vec<LineError>>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// Lanes at work.
    pub struct Scene {
        id: Option<String>,
        label: Option<String>,
        lanes: Option<Vec<Lane>>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A diagram from its source, with counts and nodes by name.
    pub struct Diagram {
        id: Option<String>,
        title: Option<String>,
        source: String,
        selected: Option<String>,
        counts: Option<BTreeMap<String, Number>>,
        nodes: Option<BTreeMap<String, Node>>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A message box: its send action, its chips and the messages queued.
    pub struct Composer {
        id: Option<String>,
        action: String,
        label: Option<String>,
        placeholder: Option<String>,
        acts: Option<BTreeMap<String, String>>,
        chips: Option<Vec<ComposerChip>>,
        queued: Option<Vec<Queued>>,
        values: Option<Fields>,
        #[serde(flatten)]
        more: Fields,
    }
}

wire! {
    /// A block of a `type` that is no core kind: an app's own, kept whole.
    pub struct AppBlock {
        #[serde(rename = "type", deserialize_with = "app_kind")]
        kind: String,
        id: Option<String>,
        fallback: Option<Fallback>,
        #[serde(flatten)]
        more: Fields,
    }
}

fn app_kind<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    let kind = String::deserialize(d)?;
    if Block::KINDS.contains(&kind.as_str()) {
        return Err(serde::de::Error::custom(format!(
            "a `{kind}` block that does not fit its kind"
        )));
    }
    Ok(kind)
}

macro_rules! kinds {
    ($($v:ident($t:ty) = $name:literal,)*) => {
        /// A block: an object whose `type` names its kind; any other `type` is an app's own.
        #[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
        #[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
        #[serde(tag = "type")]
        pub enum Block {
            $(#[serde(rename = $name)] $v(Box<$t>),)*
            #[serde(untagged)]
            App(Box<AppBlock>),
        }

        impl Block {
            /// The core kinds' `type` names.
            pub const KINDS: &[&str] = &[$($name),*];

            /// The block's id, when it has one.
            pub fn id(&self) -> Option<&str> {
                match self {
                    $(Self::$v(b) => b.id.as_deref(),)*
                    Self::App(b) => b.id.as_deref(),
                }
            }
        }
    };
}

kinds! {
    Screen(Screen) = "screen",
    Sheet(Sheet) = "sheet",
    Section(Section) = "section",
    List(List) = "list",
    Row(Row) = "row",
    Card(Card) = "card",
    Choice(Choice) = "choice",
    Form(Form) = "form",
    Config(Form) = "config",
    Secret(Secret) = "secret",
    Run(Run) = "run",
    Button(Button) = "button",
    Chips(Chips) = "chips",
    Stat(Stat) = "stat",
    Text(Text) = "text",
    Images(Images) = "images",
    Web(Web) = "web",
    Diff(Diff) = "diff",
    Editor(Editor) = "editor",
    Scene(Scene) = "scene",
    Diagram(Diagram) = "diagram",
    Composer(Composer) = "composer",
}
