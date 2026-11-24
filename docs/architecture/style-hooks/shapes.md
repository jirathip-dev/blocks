# style hooks: the shapes (#392)

## 1. Where things live

```
crates/blocks/src/theme/
  finish.rs            Finish, At, Variant, Rule, Axis                         new, S1
  axis/<axis>.rs       one axis: its values and each value's rows              moved out of style.rs, S1
  axis/mod.rs          generated: the modules and AXES, the one list of axes   S1
  style.rs             Style, Format, Scale, Affix, StyleLabel                 what stays
  css.rs               writes the tokens, then each picked value's rows        loses its list of axes
web/src/css/look/<finish>.css   the finish's base look, one file each          S2; surface.css replaces tiles.css's list
web/src/gen/hooks.ts            + finishes                                     generated
web/src/gen/schemes.ts          rules, drawn: same names, finish selectors     generated
swift/Sources/Blocks/Gen/       + Finish                                       generated
swift/Sources/BlocksUI/Finish/  Surface, Tint, Button, Mark, Label, Worn       S3; moved out of Look+Style.swift
fixtures/look/worn.json         which finishes each kind's parts wear          generated, S2
ci/tokens/finishes.txt          where a renderer differs; only shrinks         S2 and S3 write it, S5 empties it
```

## 2. The crate

```rust
pick!(
    /// A label a style may decorate.
    pub LabelRole { Kind, Header, Group, Section, Title, Button, Chip, Back, Said, Picked }
);

/// A named way the look draws a part.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Finish { Surface, Tint, Button, Mark, Label(LabelRole) }

impl Finish {
    pub const ALL: [Self; 14];
    pub const fn name(self) -> &'static str;       // "surface", "tint", "button", "mark", "header-label", …
    pub const fn selector(self) -> &'static str;   // S1: today's private selector; S2: ".as-surface", …; Button: "button,a.btn"
}

/// The one variant a finish has today.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Variant { Primary }

/// Where on the part a row lands.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum At { Part, Before, After, Variant(Variant) }

/// One row of a style value: declarations on a finish.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rule { pub on: Finish, pub at: At, pub put: &'static str }

impl Rule {
    pub const fn on(on: Finish, put: &'static str) -> Self;
    pub const fn at(self, at: At) -> Self;
}

/// One axis, as `css` and the codegen read it.
pub struct Axis {
    pub name: &'static str,
    pub values: &'static [(&'static str, &'static [Rule])],
    pub of: fn(&Style) -> &'static [Rule],
}
```

- A rule has no selector field, so it cannot name a class of a kind. From S2 `css.rs` writes `:root`, the finish's
  selector and the `At`: a row then outweighs the finish's one-class base rule wherever the look's sheet sits (the
  site writes it before `blocks.css`, the shell after).
- `put` is declarations only. `theme_finish.rs` fails a `{`, a `}` or a `.` followed by a letter in one.
- `LabelRole::selector`, `tiles!` and each axis's `css()` are deleted in S1; the private selectors they held sit in
  `Finish::selector` until S2 replaces them with the classes. `TypeDesign::css` and `Easing::curve` stay: they write
  the page's font and `--ease`, which are tokens. Every other public name of `theme` keeps its path.
- `Style` keeps every field and its serde form: the schema, `fixtures/styles` and an app's style.json are untouched.

Today's values as rows (the text after S2; the pixels are today's):

| Value | Rows |
|---|---|
| `surface: dashed` | `Surface` `border-style:dashed` |
| `surface: solid` | `Surface` `border-width:2px` |
| `fills: outline` | `Tint` `background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)` |
| `buttons: filled` | `Button` at `Before` `content:none`; at `After` `content:""`; at `Variant(Primary)` the fill, the ink, the padding and the weight |
| `marks: text` | `Mark` `width:auto;font-size:0`; at `After` `content:attr(data-mark);font-size:var(--fs-meta)` |
| `sections: quiet` | `Label(Header)` and `Label(Section)` `font-size:var(--fs-meta);font-weight:400` |
| `labels.<role>` | `Label(role)` `text-transform`; at `Before` and `After` the affix as `content` |
| `surface: glass`, `fills: tint`, `fills: solid`, each first value | no rows |

## 3. The web

| Finish | Class | The parts S2 tags (what today's selector reaches) |
|---|---|---|
| `surface` | `as-surface` | `.card`, `.st`, `.list>.row`, `.list>.rw`, `.form:not(.say)`, `.choice`, `.secret`, `.run`, `.tbl` |
| `tint` | `as-tint` | a chip while it is on; a step's mark once done |
| `button` | none: the `button` and `a.btn` elements; `primary` stays its variant class | every button, as today |
| `mark` | `as-mark`, with its word in `data-mark` | a step's mark once done |
| `header-label` | `as-header-label` | `.sec>.sh` |
| `section-label` | `as-section-label` | the `.sh` of steps and of a scene |
| `title-label` | `as-title-label` | a card's title, a row's title |
| `button-label` | `as-button-label` | the span in a button block |
| `chip-label` | `as-chip-label` | the span in a chip |
| `picked-label` | `as-picked-label` | a picked diagram node's label |
| `kind-`, `group-`, `back-`, `said-label` | the class exists | no part yet: four lines in the baseline |

- A kind's CSS sets nothing a finish sets on a tagged part; S2 moves those declarations into `css/look/<finish>.css`.
- `gen/hooks.ts` gains `export const finishes = ["surface", …] as const`. `rules` and `drawn` in `gen/schemes.ts`
  keep their names and types; `core/look.ts` does not change.
- The React kinds add the same classes; `markup.test.ts` holds them to `fixtures/html`.

## 4. SwiftUI

```swift
public enum Finish: String, Sendable, CaseIterable { case surface, tint, button, mark, kindLabel = "kind-label", … }
```

| Finish | File in `Finish/` | The call a kind makes | Reads |
|---|---|---|---|
| `surface` | `Surface.swift` | `.surface(look, radius:, interactive:)` | `style.surface`, `tiles`, `still` |
| `tint` | `Tint.swift` | `.chip(look)`, `.chip(look, fill:edge:…)`, `.accent(look, …)`, `.tinted(look, tint)` | `style.fills` |
| `button` | `Button.swift` | `CardButton(title:primary:tint:)` | `style.buttons`, `style.fills` |
| `mark` | `Mark.swift` | `Mark(text:) { symbol }` | `style.marks` |
| a label | `Label.swift` | `LookText(.section, title)` | `style.labels`, `style.sections` |
| | `Worn.swift` | none: each helper above reports its finish through it | |

```swift
package struct Worn: PreferenceKey {
    package static let defaultValue: [Finish: [Anchor<CGRect>]] = [:]
}
```

`look.type`, `.motion`, `.radius(_:)`, `.square`, `.pill` and `Scale` stay in `Look+Style.swift`: they are tokens.

## 5. The worn file

`fixtures/look/worn.json`, written by `just gen` from the site's HTML of every `fixtures/blocks` and
`fixtures/fields` file: the finishes found under each kind's root, up to the next block's root.

```json
{ "kinds": { "card": ["button", "surface", "title-label"], "stat": ["surface"],
             "steps": ["mark", "section-label", "tint"] },
  "values": { "surface": { "dashed": ["surface"], "solid": ["surface"], "glass": [] },
              "labels": { "header": ["header-label"] } } }
```

`kinds` is what the parity check compares; `values` is each value's finishes, which the look check's new fact
reads to know which parts to compare.

## 6. The gap baseline

`ci/tokens/finishes.txt`, one fact a line, sorted. A fact is three or four words; any words after it are its
reason, as in `ci/tokens/allowed.txt`:

```
<renderer> kind <kind> -<finish>      the site tags a part of this kind and this renderer does not
<renderer> kind <kind> +<finish>      this renderer tags one the site does not
<renderer> value <axis> <value>       this value changes no part on this renderer
```

`<renderer>` is `web` or `swift`. Only `value` lines can be `web`: its three writers share the site's markup.
A line with no reason is a debt S5 pays; a line with one is meant. After S5 a line with no reason fails the lint.
The first value of an axis is the default the others are compared with, so it never has a line.

## 7. The harness report

```rust
pub struct Report {
    pub shots: Vec<String>, pub sent: Vec<Action>, pub dropped: Vec<String>, pub timings: Timings,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub worn: Option<BTreeMap<String, Vec<String>>>,
}
```

Kind to the finishes its parts wore in this run, sorted. Optional and additive, as the frame timings were:
`compat.yml`'s older harness leaves it out. `blocks-shot` reads it from the DOM, `blocks-snap` from `Worn`.
