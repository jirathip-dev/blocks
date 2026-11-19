# Shapes

Rust is the one source, as for every wire type: `just gen` writes the schema, TS and Swift from it. Sketches, not
final code. Paths are as they are at staging `95bafad`; #152 and #155 move the per-kind view files.

## 1. What a block declares

```rust
// crates/blocks/src/kind/gesture.rs (new; `Reorder` in parts.rs is deleted)
wire! {
    /// A gesture a block allows: the action its result is sent as, under `name` in the action's values.
    pub struct Gesture {
        action: String,
        name: String,
        enabled: Option<Expr>,
    }
}

// crates/blocks/src/gesture.rs
/// The gesture words: each is the name of a field on the kinds that take it.
#[serde(rename_all = "lowercase")]
pub enum Word { Reorder, Move, Stretch, Edit, Draw, Remove }
```

`{"action": "order", "name": "accounts"}` is the JSON a `list`'s `reorder` has today, so cooee's screens read
unchanged. A field left out means the gesture is not allowed. An item with `fixed: true` takes none.

| Word | What the user does | The result under `name` | Taken by |
|---|---|---|---|
| `reorder` | drags an item to another place among its siblings | the sibling ids in the new order | `list`, `table` |
| `move` | drags an item along the kind's axes | the item's id and its new place | `timeline`, `media` marks, `chart` |
| `stretch` | pulls one end of an item | the same shape as `move` | `timeline`, `media` marks |
| `edit` | types a new value into an item | the item's id and the value | `table` |
| `draw` | drags over empty space to make an item | the new item, with no id | `media` marks, `timeline` |
| `remove` | deletes the item it has selected | the item's id | `media` marks |

Two gestures of one block may send the same action (a timeline's `move` and `stretch` both give a `Span`).

A second sort of gesture has no word and no field, because it sends nothing: **view gestures** (zoom, pan, page,
scroll, select). They change only what the renderer shows. `boundaries.md` has their rules.

## 2. The machine

```rust
// crates/blocks/src/gesture.rs (new layer `gesture`: uses nothing; `kind`, `built` and `behave` may use it)

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
pub fn step<C: Clone + PartialEq>(phase: Phase<C>, event: Event<C>, start: &C) -> (Phase<C>, Option<Effect<C>>);
```

`web/src/core/gesture.ts` and `swift/Sources/Blocks/Gesture.swift` are the same function. `boundaries.md` has
the table of transitions.

## 3. A kind's rules

```rust
// crates/blocks/src/gesture.rs
/// A nudge by a key or a named accessibility action.
pub struct Nudge { pub dir: Dir, pub big: bool }     // Dir: Left, Right, Up, Down

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
    /// The words spoken for a candidate.
    fn says(&self, change: &Self::Change) -> String;
}
```

Each kind implements it in its own file (`kind/timeline.rs`, `core/kind/timeline.ts`, `Kind/Timeline+Rules.swift`).
There is no union of every kind's `Change` and no list of the kinds that take gestures.

## 4. Each family's shapes

Only what the model fixes. Looks, labels and optional extras are each kind issue's design.

```rust
// timeline (#137): a new kind. Days are ISO, `end` is the last day, a reach is whole days.
kind! { pub struct Timeline { id: Option<String>, title: Option<String>, from: String, to: String,
    off: Option<Vec<String>>, rows: Vec<TimeRow>, empty: Option<String>,
    #[serde(rename = "move")] moves: Option<Gesture>, stretch: Option<Gesture>, draw: Option<Gesture> } }
wire! { pub struct TimeRow { id: String, title: String, subtitle: Option<String>, bars: Vec<Bar>, tap: Option<Tap> } }
wire! { pub struct Bar { id: String, start: String, end: String, label: Option<String>, tone: Option<Tone>,
    progress: Option<u8>, fixed: Option<bool>, tap: Option<Tap> } }
wire! { /// What a move, a stretch or a draw gives: `id` for the first two, `row` for a draw.
    pub struct Span { id: Option<String>, row: Option<String>, start: String, end: String } }
pub struct BarGrab { pub bar: String, pub part: BarPart }      // Body, Start, End; a draw grabs a row and a day
pub struct Days { pub days: i32 }

// grid (#138): fields added to `table`. A reach is the typed text.
// Table:    edit: Option<Gesture>, reorder: Option<Gesture>, calc: Option<BTreeMap<String, Expr>>
// Column:   edit: Option<bool>
// TableRow: fixed: Option<bool>
wire! { pub struct CellEdit { row: String, column: String, value: Cell } }
// `reorder` gives Vec<String>: every row id in the new order.

// marks (#140): fields added to `media`. Places are 0 to 1 of the image, 4 decimals, clamped.
// Media: marks: Option<Vec<Mark>>, tools: Option<Vec<MarkKind>>, draw, move, stretch, remove: Option<Gesture>
words!(MarkKind { Arrow, Box, Ellipse, Text, Pin, Highlight, Line });
wire! { pub struct Mark { id: String, kind: MarkKind, at: [Number; 2], to: Option<[Number; 2]>,
    text: Option<String>, tone: Option<Tone>, group: Option<String>, path: Option<Vec<[Number; 2]>>, fixed: Option<bool> } }
wire! { /// What a draw, a move or a stretch gives; a remove gives `id` alone.
    pub struct MarkChange { id: Option<String>, kind: Option<MarkKind>, at: Option<[Number; 2]>,
    to: Option<[Number; 2]>, text: Option<String>, group: Option<String> } }

// chart points (#139): fields added to #132's `chart`. x is the chart's label and stays; a reach is steps of y.
// Chart: move: Option<Gesture>; a series: step: Option<Number>, fixed: Option<bool>
wire! { pub struct PointMove { series: String, at: String, y: Number } }

// pages (#141): a new kind with no gesture field. Every gesture on it is a view gesture.
kind! { pub struct Pages { id: Option<String>, title: Option<String>, pages: Vec<Page>, file: Option<String>,
    note: Option<String> } }
wire! { pub struct Page { src: String, alt: String, width: u32, height: u32 } }
```

Every item a gesture grabs has an `id`, unique in its block. No family adds an op, a `Child` or a line to the
patchers: the app's `diff` sends a `merge` of the block's changed list, as it does for any field (`table` keeps the
row ops #80 gave it).

## 5. Layout (#130)

A layout is not a block and is not on a screen, so its edit goes to a handler the host passes in, as a file does
in form v2. The machine, the rules and the three ways in are the same.

```rust
// crates/blocks/src/layout.rs
/// One edit to a layout: the tree is one for both size classes, how a node shows is per size class.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Edit {
    Move { id: String, into: String, slot: String, before: Option<String> },
    Swap { a: String, b: String },
    Show { id: String, size: SizeClass, place: Place },
}

/// `l` after `e`, checked: `Ok` passes `check`, `Err` leaves the caller's layout as it was.
pub fn edit(l: &Layout, e: &Edit, c: &Contract) -> Result<Layout, Broken>;

/// The slots each of the contract's components holds: what a shell needs to offer only drops that can pass.
pub fn slots(c: &Contract) -> BTreeMap<&'static str, &'static [&'static str]>;

/// Every edit a grabbed node can end in, in reading order: the list the arrow keys walk.
pub fn drops(tree: &Resolved, slots: &BTreeMap<&str, &[&str]>, grabbed: &str) -> Vec<Edit>;
```

`edit` applies the change to the tree, writes it out and runs `check` on the text, so a result that `check`
would refuse cannot be returned. `drops` leaves out the root, the node's own subtree, a slot its host does not
hold and a place over six deep. `Edit` is generated into `gen/layout.ts` and `Gen/LayoutShapes.swift` as
`LayoutEdit`; `drops` exists in TS and Swift too.

```ts
// web/src/shell.ts: one more part of `Mount`
edit?: { slots: Record<string, string[]>; save: (e: LayoutEdit) => Promise<boolean | string> };
```

```swift
// swift/Sources/BlocksUI/SlotView.swift
SlotView(node) { … }.layoutEditing(slots: slots) { edit in await app.save(edit) }
```

`save` resolving `true` confirms, and the host then hands in the new layout. `false`, a string (the reason) or a
rejection refuses.

## 6. What changes in `expr`, `behave`, `built`, `wire` and `tree`

| Where | Change |
|---|---|
| `expr` | one operation: `{"div": [a, b]}`. Two numbers give their quotient; anything else, and a division by zero, gives `null`, as `add` does for a sum that is not finite. Cases join `fixtures/behave/number.json` |
| `behave::view` | a gesture whose `enabled` does not hold puts its action in `View.acts`, the set an act's `enabled` already uses. A renderer draws no handle for it. It finds gestures by `Word`, on any kind |
| `behave::calc` | unchanged: a `table`'s `calc` is a `lines`' `calc`, an expression over one row's values |
| `Built::check` | a gesture on a block with no `id` is an `Unnamed` fault, as an island with none is. A word on a kind that does not take it is already an `Extra` fault. Two gestures of one block that send the same action are not an `ActTwice` |
| `wire::Action` | `fn read<T: DeserializeOwned>(&self, name: &str) -> Result<T, Broken>`: the typed result of a gesture |
| `tree::Step` | two more: `Gesture { id, grab, reach, via }` and `Refuse { toast }` |

No op, no stream message and no field of `Action` or `Answer` is added. `SCHEMA_VERSION` stays.

## 7. What a renderer holds

```ts
// web/src/render/index.ts: two more parts of `Ctx`, beside `open` and `store`
held: (block: unknown, item: string) => unknown;       // the candidate of an item whose action is out
view: (block: unknown) => Record<string, unknown>;     // a block's view state: zoom, scroll, page, selection
```

```ts
// web/src/gesture.ts (new): the one place a drag is listened for
export function gestured<G, R, C>(el: HTMLElement, c: Ctx, o: {
  block: { id?: string | null };
  rules: Rules<G, R, C>;
  grab: G;
  reach: (dx: number, dy: number) => R;
  show: (candidate: C | null) => void;
}): void;
export function zoomed(el: HTMLElement, c: Ctx, block: { id?: string | null }, o: { min: number; max: number }): void;
```

SwiftUI has the same two as view modifiers in `BlocksUI/Gestured.swift`, with `held` and `view` in the environment.

## 8. Fixtures

| File | Holds | Run by |
|---|---|---|
| `fixtures/gesture/machine.json` | start values, event lists, the phases and effects wanted | Rust, TS, Swift |
| `fixtures/gesture/sim.json` (generated) | seeded random event lists through `step` | Rust, TS, Swift |
| `fixtures/gesture/<kind>.json`, one per kind | a block, then cases: grab, reach or nudges, the change and the words wanted | Rust, TS, Swift; then each harness, once per way in |
| `fixtures/layouts/edits.json` | a layout, the slots, cases: a grab and its drops; an edit and its layout or refusal | `drops` in Rust, TS, Swift; `edit` in Rust |
