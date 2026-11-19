use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::expr::{Expr, State};

#[macro_use]
mod macros;
mod content;
mod list;
mod parts;
mod sample;
mod table;

pub use content::*;
pub use parts::*;
pub use sample::samples;
pub use table::*;

kind! {
    /// A whole screen.
    pub struct Screen {
        id: Option<String>,
        title: Option<String>,
        large: Option<bool>,
        state: Option<State>,
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
        sites: Option<u64>,
        personas: Option<Vec<Fields>>,
        threads: Option<Vec<Fields>>,
    }
}

kind! {
    /// A sheet over a screen.
    pub struct Sheet {
        id: Option<String>,
        title: String,
        cancel: Option<String>,
        done: Option<Submit>,
        blocks: Vec<Block>,
    }
}

kind! {
    /// A titled group of blocks.
    pub struct Section {
        id: Option<String>,
        header: Option<String>,
        footer: Option<String>,
        blocks: Vec<Block>,
    }
}

kind! {
    /// A list of rows.
    pub struct List {
        id: Option<String>,
        rows: Vec<Block>,
        reorder: Option<Gesture>,
    }
}

kind! {
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
    }
}

kind! {
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
    }
}

kind! {
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
    }
}

kind! {
    /// A form of fields; also the `config` kind.
    pub struct Form {
        id: Option<String>,
        submit: Option<Submit>,
        action: Option<String>,
        fields: Vec<Field>,
    }
}

kind! {
    /// A secret's input: its value is never sent back.
    pub struct Secret {
        id: Option<String>,
        name: String,
        action: String,
        label: Option<String>,
        placeholder: Option<String>,
        set: Option<bool>,
        values: Option<Fields>,
    }
}

kind! {
    /// A command the owner approves to run.
    pub struct Run {
        id: Option<String>,
        action: String,
        command: String,
        sha: String,
        dir: Option<String>,
        touches: Option<String>,
        until: Option<String>,
    }
}

kind! {
    /// A button.
    pub struct Button {
        id: Option<String>,
        label: String,
        style: Option<ButtonStyle>,
        action: Option<String>,
        values: Option<Fields>,
        tap: Option<Tap>,
        confirm: Option<Confirm>,
        enabled: Option<Expr>,
    }
}

kind! {
    /// A row of chips, one or many selected.
    pub struct Chips {
        id: Option<String>,
        name: String,
        multi: Option<bool>,
        action: Option<String>,
        selected: Option<Vec<String>>,
        options: Vec<ChipOption>,
    }
}

kind! {
    /// Figures: a list of tiles, or one tile inline.
    pub struct Stat {
        id: Option<String>,
        items: Option<Vec<Tile>>,
        label: Option<String>,
        value: Option<Shown>,
        unit: Option<String>,
        tone: Option<Tone>,
        spark: Option<Vec<Number>>,
    }
}

kind! {
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
    }
}

kind! {
    /// A strip of images.
    pub struct Images {
        id: Option<String>,
        size: Option<ImageSize>,
        items: Vec<Image>,
    }
}

kind! {
    /// A web view of a fixed height.
    pub struct Web {
        id: Option<String>,
        src: String,
        height: u32,
    }
}

kind! {
    /// A file's diff.
    pub struct Diff {
        id: Option<String>,
        file: String,
        summary: Option<String>,
        hunks: Vec<Hunk>,
    }
}

kind! {
    /// A text editor and its errors.
    pub struct Editor {
        id: Option<String>,
        name: String,
        text: String,
        action: String,
        first: Option<u32>,
        errors: Option<Vec<LineError>>,
    }
}

kind! {
    /// Lanes at work.
    pub struct Scene {
        id: Option<String>,
        label: Option<String>,
        lanes: Option<Vec<Lane>>,
    }
}

kind! {
    /// A diagram from its source, with counts and nodes by name.
    pub struct Diagram {
        id: Option<String>,
        title: Option<String>,
        source: String,
        selected: Option<String>,
        counts: Option<BTreeMap<String, Number>>,
        nodes: Option<BTreeMap<String, Node>>,
    }
}

kind! {
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
        working: Option<Working>,
    }
}

kind! {
    /// A stepper of named steps with its current one, or progress bars.
    pub struct Steps {
        id: Option<String>,
        title: Option<String>,
        steps: Option<Vec<Stage>>,
        current: Option<String>,
        done: Option<bool>,
        bars: Option<Vec<Bar>>,
        fallback: Option<Fallback>,
    }
}

kind! {
    /// Repeating rows of fields with add and remove, running totals and a balance check.
    pub struct Lines {
        id: Option<String>,
        name: String,
        label: Option<String>,
        action: Option<String>,
        columns: Vec<Field>,
        items: Vec<LineItem>,
        calc: Option<BTreeMap<String, Expr>>,
        sum: Option<Vec<String>>,
        balance: Option<[String; 2]>,
        scale: Option<u8>,
        min: Option<u32>,
        max: Option<u32>,
        #[serde(rename = "add")]
        adds: Option<String>,
        empty: Option<String>,
        errors: Option<Vec<RowError>>,
        submit: Option<Submit>,
    }
}

kind! {
    /// A short line after an action, in a tone, with an optional undo: an answer's toast, or drawn where it sits.
    pub struct Toast {
        id: Option<String>,
        tone: Option<Tone>,
        title: String,
        undo: Option<Undo>,
        fallback: Option<Fallback>,
    }
}

kind! {
    /// A document as the app's server drew it, one picture a page: paged and zoomed in the view, with its PDF.
    pub struct Pages {
        id: Option<String>,
        title: Option<String>,
        pages: Vec<Page>,
        file: Option<String>,
        note: Option<String>,
        fallback: Option<Fallback>,
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

            /// The fields of a core kind its type lacks: kept on the wire, a fault in a server's own screen.
            pub fn more(&self) -> Option<&Fields> {
                match self {
                    $(Self::$v(b) => Some(&b.more),)*
                    Self::App(_) => None,
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
    Lines(Lines) = "lines",
    Prose(Prose) = "prose",
    Hero(Hero) = "hero",
    Media(Media) = "media",
    Nav(Nav) = "nav",
    Island(Island) = "island",
    Table(Table) = "table",
    Steps(Steps) = "steps",
    Toast(Toast) = "toast",
    Pages(Pages) = "pages",
}
