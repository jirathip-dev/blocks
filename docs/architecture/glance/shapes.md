# Shapes

Sketches: the names and fields are the decision, the bodies are impl's.

## The wire, in the crate

`crates/blocks/src/kind/core/glance.rs`. It uses the parts every kind shares: `Figure`, `Shown`, `Tone`, `Tap`, `Act`.

```rust
listed! { 40: Glance(Glance) = "glance" }

wire! {
    /// One side of the closed island: a figure, a short text, or both.
    pub struct GlanceSide {
        figure: Option<Figure>,
        text: Option<Shown>,
        tone: Option<Tone>,
    }
}

wire! {
    /// One row of a glance: a thing that runs or waits, and its value.
    pub struct GlanceRow {
        title: String,
        subtitle: Option<String>,
        figure: Option<Figure>,
        value: Option<Shown>,
        tone: Option<Tone>,
        tap: Option<Tap>,
    }
}

wire! {
    /// What a roomy form draws under the head: rows or a line, a foot and its acts.
    pub struct GlanceBody {
        line: Option<String>,
        rows: Option<Vec<GlanceRow>>,
        foot: Option<String>,
        acts: Option<Vec<Act>>,
    }
}

kind! {
    /// What an island and a widget show of one thing: a head every form draws from, and each form's own part.
    pub struct Glance {
        id: Option<String>,
        title: String,
        subtitle: Option<String>,
        figure: Option<Figure>,
        value: Option<Shown>,
        tone: Option<Tone>,
        tap: Option<Tap>,
        leading: Option<GlanceSide>,
        trailing: Option<GlanceSide>,
        expanded: Option<GlanceBody>,
        small: Option<GlanceBody>,
        medium: Option<GlanceBody>,
    }
}
```

- `kind!` gives `Glance::new(title)`, a setter per optional field, `show` and `more`, as for every kind. `listed!`'s
  number only orders the generated list: any after 39 puts it last.
- `rows` sits inside a body, not on the block, so no walk sees it as a list of child blocks: `built.rs`'s `LISTS`
  and the generated `hosts` do not change, and `diff` sends a change as a `merge` on the block.
- `value` and a side's `text` take every `Shown`. A `Get` has no local state to read on these surfaces and draws
  as empty.
- `sample()` returns three, so `fixtures/blocks/` gets `glance.json` (`turn`: the head and all five forms),
  `glance-needs.json` (the head, `small` and `medium`: the island's forms fall back) and `glance-bare.json` (a
  title and a value: every form falls back).
- Role: `("glance", "status")` in `tree.rs`. Fallback: `Built::of` writes it from `title`, `subtitle` and `tap`
  with no new code.
- Stress row: `"glance": { "long": ["title", "subtitle", "line", "foot", "text", "label"], "why": "its rows sit
  inside a form, which draws at most two: the no-row and the 200-row blocks are in GlanceTests" }`.
- Guard `glance/heavy` (`guard/rules/glance_heavy.rs`): a glance whose JSON is over 3,000 bytes. Fix text: "send
  fewer rows or shorter lines: a Live Activity's state is at most 4 KB, and a form draws two rows".

## What a form draws

One pure function settles the fallback and the budget, so the views only lay out what they are given. It is in
`Blocks` (Foundation only), in `swift/Sources/Blocks/Kind/Glance+Rules.swift`.

```swift
public enum GlanceForm: String, CaseIterable, Sendable { case leading, trailing, expanded, small, medium }

/// What one form of a glance draws, after the fallback and its budget.
public struct GlanceDrawn: Equatable, Sendable {
    public var figure: Figure?
    public var mark: Bool
    public var title: String?
    public var subtitle: String?
    public var value: Shown?
    public var tone: Tone?
    public var line: String?
    public var rows: [GlanceRow]
    public var foot: String?
    public var acts: [Act]
}

extension Glance: Hashable {
    public func hash(into hasher: inout Hasher)
}

extension Glance {
    public func drawn(_ form: GlanceForm) -> GlanceDrawn
}

extension Block {
    /// The glance of this id in a screen.
    public func glance(_ id: String) -> Glance?
}
```

`Hashable` hashes the id and the title, which agrees with the generated `==`; it is what lets the block be an
activity's `ContentState`.

| Form | `figure` | `value` | `title`, `subtitle` | Body, the first that is declared | `rows` | `line` | `acts` |
|---|---|---|---|---|---|---|---|
| `leading`, declared | the side's | the side's `text`, in the side's tone | no | | | | |
| `leading`, missing | the head's; with none, `mark` in the head's tone | no | no | | | | |
| `trailing`, declared | the side's | the side's `text`, in the side's tone | no | | | | |
| `trailing`, missing | no | the head's, in the head's tone | no | | | | |
| `expanded` | the head's | the head's | both | `expanded`, `medium` | 2 | 2 lines, with no row | 2 |
| `medium` | the head's | the head's | both | `medium`, `expanded` | 2 | 2 lines, with no row | 1 |
| `small` | the head's | the head's | the title | `small`, `medium`, `expanded` | 2 | 2 lines, with no row | 0 |

`foot` is one line in the three roomy forms. `drawn` caps the acts; the view then leaves out one the host cannot
run (no link for its `tap`, no intent for its `action`), since `drawn` knows no host.

## The view, in BlocksUI

`swift/Sources/BlocksUI/Glance/`, one file per part.

```swift
/// One form of a glance, drawn into the box it is given; it draws no ground.
public struct GlanceView: View {
    public init(_ block: Glance, _ form: GlanceForm)
}

extension GlanceForm {
    /// The box the harness draws this form in: the smallest a supported device hands out.
    public var box: CGSize { get }
}

extension View {
    /// How a glance's taps leave: a tap's link, an action's intent. An act with neither is not drawn.
    public func glanceTaps(
        link: @escaping @Sendable (Tap) -> URL?, intent: @escaping @Sendable (BlockAction) -> (any AppIntent)?
    ) -> some View
}

extension EnvironmentValues {
    /// The form being drawn, for an app's own figure view to size itself; nil outside a glance.
    public var glanceForm: GlanceForm? { get }
}
```

| File | Holds |
|---|---|
| `GlanceView.swift` | the public view: `drawn(form)`, then the side, the panel or the small layout; the one accessibility element of a side |
| `SideForm.swift` | `leading`, `trailing` |
| `PanelForm.swift` | `expanded`, `medium` |
| `SmallForm.swift` | `small` |
| `GlanceParts.swift` | a row, the figure at a size (the app's `AppBlocks.figure` first, as a row's), a `Shown` as text or as the system's timer |
| `GlanceTaps.swift` | `glanceTaps`, the link and the intent button; the one file that imports AppIntents |
| `GlanceScale.swift` | the boxes and the sizes, as named constants over `Scale` and `Token` |

`BlocksUI/Kind/Glance.swift` is the kind's view in a screen: `GlanceView(block, .medium)` on the `surface` finish.

| Form | Box, pt | From |
|---|---|---|
| `leading`, `trailing` | 60 × 24 | the compact island's side beside the camera; a notch's menu bar is no lower |
| `expanded` | 340 × 140 | the opened island and the Lock Screen banner are at most 160 high, less the system's margins |
| `small` | 116 × 116 | a 148 pt widget (a 375 pt wide iPhone) less the 16 pt content margins |
| `medium` | 289 × 116 | a 321 × 148 pt widget less the margins |

A larger box gets the same layout with more air. Impl may lower a budget so that the long-text variant fits; a
higher budget or another box is an amendment.

## The harness

- `swift/Sources/BlocksSnapshot/Form.swift`: `Snapshot.form(_ block: Glance, _ form: GlanceForm, look:)` draws the
  form in its box with a margin around it and returns the PNG and its faults: ink in the margin, or no ink in the
  box. It uses the `Pixels` reader the measured look check has.
- `blocks-snap --screen <file> --form <form> [--scheme light|dark] --out <dir>`: the first glance in the file.
- `.gatekeeper/gates/swift-glance.toml`: every `fixtures/blocks/glance*.json` and `fixtures/stress/glance*-long.json`,
  each form, light and dark; the PNGs are its kept files. No PNG is committed, as for `swift-snap`.
- `swift/Tests/BlocksTests/Render/GlanceTests.swift`: the same in XCTest, plus a block with no rows and one with
  200; `GlanceRulesTests` holds the table above against `drawn(_:)`, and `GlanceForm`'s names against the
  fixture's keys.
