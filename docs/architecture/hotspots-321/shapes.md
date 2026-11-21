# Layout and shapes

## The layout, after all seven slices

```text
crates/blocks/src/
  tree.rs                    VARIANTS, ROLES, NAMES: the one copy, as today
  patch.rs                   HOSTS, WALKED beside list and lists: the one copy
  theme/style.rs             each enum and its css() arm per value
  theme/scheme.rs            Hex, Mode, PerMode, Tokens, Scheme, the default pair      shared, 250 lines
  theme/css.rs               css, axes, the label selectors, DEFAULT_STYLE
  codegen/hooks.rs           writes hooks.ts: hooks, roles, names, hosts, walked
  codegen/swift/kinds.rs     writes both Gen/Kinds.swift files
  codegen/theme.rs           writes schemes.ts: the pair, the default style, Scale, axes, ease, the label tables
crates/blocks/tests/
  theme_scheme.rs theme_css.rs theme_style.rs theme_pack.rs      support/mod.rs holds root, read, TOKENS
web/
  build.mjs                  every bundle/*.json, the two stylesheets, the types
  bundle/<name>.json         blocks, import, scan, core, react, play
  package.json               "build": "node build.mjs"                                 shared, 30
  src/shell.ts               the bundle's exports, nothing else                        shared, 40
  src/shell/                 layout.ts store.ts look.ts host.ts sheet.ts mount.ts adopt.ts
  src/core/look.ts           gated, css, tiles, choose; Scale comes from gen           shared, 100
  src/gen/hooks.ts           generated, more of it
  src/gen/schemes.ts         generated, more of it
  react/test/markup/<kind>.json     a kind's extra markup cases
swift/Sources/Blocks/
  Apply.swift                the ops; reads Block.hosts and Block.walked                shared, 290
  Gen/Kinds.swift            generated: hosts, walked
swift/Sources/BlocksUI/
  BlockNode.swift            BlockNode (hidden, disabled, empty), BlockStack, ChildKey  shared, 100
  Tree.swift                 the drawn tree, a11y's role rules, the app block's arm     shared, 200
  Gen/Kinds.swift            generated: typeAndID, variant, source, named, roles, names, KindView
  Kind/<Kind>.swift          <Kind>Block and the views only it uses: all 37 kinds
  Part/<Part>.swift          a view two kinds use: RoundButton, CardButton, Source, Pill, RelativeText, RelativeValue, Figure
  Field/Row.swift            the field row's view, from BlockFields.swift
swift/Sources/BlocksSnapshot/
  Snapshot.swift             Snapshot, its wraps, the loop over steps, draw             shared, 200
  Run.swift                  Run, Out, redraw, take
  Step/<Step>.swift          Tap, Type, Frame, Gesture, File: one method of Run each
  Check.swift                same, probe: what --check compares
swift/Tests/BlocksTests/
  RenderTests.swift          the tests about every kind and about an app's hooks        shared, 200
  Render/Kit.swift           pixels, height, block, fixture
  Render/<Kind>Tests.swift   one kind's render tests
.gatekeeper/
  config.toml                [legs.swift] platform = "macos"
  gates/swift-lint.toml swift-test.toml swift-snap.toml swift-plan.toml swift-stress.toml
```

## A kind's facts

The crate's side. `VARIANTS`, `ROLES` and `NAMES` are as they are. Two constants are new, and a test beside them
holds every kind's sample to them: `list` gives the key `HOSTS` names, and an id under any `WALKED` key is found.

```rust
// crates/blocks/src/patch.rs
/// The list an insert into a block of this kind lands in.
pub(crate) const HOSTS: [(&str, &str); 9] = [("screen", "blocks"), ("sheet", "blocks"), ("section", "blocks"),
    ("card", "blocks"), ("message", "blocks"), ("list", "rows"), ("scene", "lanes"), ("row", "rounds"), ("table", "rows")];
/// Every list an op walks to find an id.
pub(crate) const WALKED: [&str; 5] = ["blocks", "rows", "buttons", "rounds", "lanes"];
```

What `just gen` writes from them:

```ts
// web/src/gen/hooks.ts, after roles and names
export const hosts: Record<string, string> = { screen: "blocks", /* … */ table: "rows" };
export const walked = ["blocks", "rows", "buttons", "rounds", "lanes"] as const;
```

```swift
// swift/Sources/Blocks/Gen/Kinds.swift
extension Block {
    package static let hosts: [String: String] = ["screen": "blocks", /* … */ "table": "rows"]
    package static let walked = ["blocks", "rows", "buttons", "rounds", "lanes"]
}
```

```swift
// swift/Sources/BlocksUI/Gen/Kinds.swift, after typeAndID
extension Block {
    internal var variant: String? {            // tree::VARIANTS
        switch self {
        case .row(let b): b.style?.rawValue
        case .message(let b): b.role.rawValue
        default: nil
        }
    }
    internal var source: Source {              // the schema: the action, tap and values a kind has
        switch self {
        case .button(let b): Source(action: b.action, tap: b.tap, values: b.values)
        case .row(let b): Source(tap: b.tap)
        default: Source()
        }
    }
    internal var named: [String?] {            // the tree::NAMES a kind has, in that order
        switch self {
        case .secret(let b): [b.label, b.placeholder, b.name]
        default: []
        }
    }
    internal static let roles: [String: String] = ["section": "region", /* … */ "message": "article"]
    internal static let names = ["label", "title", "header", "question", "alt", "file", "command", "placeholder", "name"]
}
internal struct KindView: View { /* one case per kind, no default */ }
```

The generator's rule for `source` and `named` gives today's hand tables but for three lines. Each is what
`tree::a11y` and `behave.rs:45` do by key:

| kind | today in Swift | by the rule |
|---|---|---|
| `pages` | named by `title` | `title`, then `file` |
| `chart` | a tap sends nothing | sends its `tap` |
| `import` | a tap sends nothing | sends its `action` |

`Tree.swift` keeps `a11y` (a button with a URL is a link, a tappable row is a button), and the app block's arm,
which reads `names` by key. A markup case file is an array of blocks, as the `more` array holds them today:

```json
[{ "type": "web", "id": "wb", "src": "javascript:alert(1)", "height": 100 }]
```

## The Swift harness

```swift
// swift/Sources/BlocksSnapshot/Run.swift
/// One scripted run: the screen now, what the script changed on the device, the last drawing, and what came out.
struct Run {
    var screen: Block
    var edits = BlockState()
    var picks = Picks()
    var opened = Set<String>()
    var seen: Drawn
    var out = Out()
    let draw: (Run) -> Drawn
    mutating func redraw()
    mutating func take(_ shot: String) throws
}

/// What a run reports: its shots, what it sent and dropped, its timings, and with check its faults.
struct Out {
    var shots: [String] = [], sent: [JSONValue] = [], dropped: [String] = [], times: [Double] = []
    var pngs: [String: Data] = [:], trees: [String: TreeNode] = [:], found: [Seen] = [], faults: [String] = []
}
```

```swift
// swift/Sources/BlocksSnapshot/Step/Tap.swift
extension Run {
    mutating func tap(_ on: StepOn) throws
}
```

`Snapshot.run` reads:

```swift
var run = try Run(screen, draw: draw)
for step in steps {
    switch step {
    case .tap(let on): try run.tap(on)
    case .type(let typing): try run.type(typing)
    case .frame(let frame): try run.frame(frame)
    case .gesture(let g): try run.gesture(g)
    case .file(let f): try run.file(f)
    case .shot(let shot): try run.take(shot.name)
    }
}
return try run.report()
```

(`answer`, `refuse`, `scroll` and `unknown` are four more lines of the same shape.) A new piece of state is one
field of `Run`. `draw` reads it there, so no call changes.

## A Swift gate

```toml
# .gatekeeper/gates/swift-snap.toml
about = "blocks-snap --check on every fixtures/blocks file against its fixtures/trees/swift tree at 390 and 1440"
fix = "fix the view or the tree the check names; rerun just gen when a generated tree is behind"
budget_secs = 900
leg = "swift"
paths = ["Package.swift", "swift/**", "schema/sample.json", "fixtures/**", ".gatekeeper/gates/swift-snap.toml"]
run = """
if [ -z "${CI:-}" ]; then echo "swift-snap: CI's swift leg runs it"; exit 0; fi
set -e
swift build --product blocks-snap
"""
```

The `run` goes on with the loop `swift.yml` has for that step. The first line is open question 1's "CI only";
with the other answer it goes. `budget_secs` is set from the step's time in CI today.

## The shell

```ts
// web/src/render/ctx.ts
/// What a drawn screen keeps between paints.
export type Kept = Pick<Ctx, "open" | "held" | "view">;
export const kept = (): Kept => ({ open: new Set(), held: new Map(), view: new Map() });
```

```ts
// web/src/shell/host.ts
/// What the shell and an adopted page each give a screen they draw.
export type Hosted = {
  root: HTMLElement;
  model: () => Block | undefined;
  screen: () => string;
  act: Ctx["act"];
  tap: Ctx["tap"];
  theme: Theme;
  store: Store;
  apps?: AppBlocks;
  file?: OnFile;
  saved?: () => void;
};
/// One drawn screen: its kept state, the `Ctx` of the model now, and a patcher that draws with it.
export type Host = { kept: Kept; ctx(): Ctx; patcher(): ReturnType<typeof patcher> };
export function host(o: Hosted): Host;
```

`mount`'s view and `adopt` both read:

```ts
const h = host({ root: v.body, model: () => v.model, screen: () => String(v.model?.id ?? v.path), act: (a, b) => act(v, a, b), tap: (t) => tap(v, t), theme, store, apps: o.blocks, file: o.file, saved: v.sync });
const e = v.model ? render(v.model, h.ctx()) : null;
const p = h.patcher();
```

Where `shell.ts`'s code goes:

| today in `shell.ts` | after |
|---|---|
| `Placed`, `Layout`, `Resolved`, `resolved`, `walk`, `isScreen` | `shell/layout.ts` |
| `local` | `shell/store.ts` |
| `Worn`, `wearer`, `looks` | `shell/look.ts` |
| `AppBlocks`, the two `Ctx` literals, the two `patcher` calls | `shell/host.ts` |
| the sheet, its frame, the confirm, `row` | `shell/sheet.ts` |
| `Mount`, `mount`, `draw`'s tabs, parts, menu, `act`, `tap` | `shell/mount.ts` |
| `drawn`, `adopt` | `shell/adopt.ts` |
| the `export` lines | `shell.ts`, with `export *` for each `shell/` file that has public names |

## A bundle

```ts
type Bundle = { entry: string; minify?: boolean; external?: string[]; uses?: string[] };
```

| file | content |
|---|---|
| `bundle/blocks.json` | `{ "entry": "src/shell.ts", "minify": true, "uses": ["import"] }` |
| `bundle/import.json` | `{ "entry": "src/lazy/import.ts", "minify": true }` |
| `bundle/scan.json` | `{ "entry": "src/scan/index.ts", "minify": true }` |
| `bundle/core.json` | `{ "entry": "src/core/index.ts" }` |
| `bundle/react.json` | `{ "entry": "react/src/index.ts", "external": ["react"], "uses": ["core", "import"] }` |
| `bundle/play.json` | `{ "entry": "src/play/index.ts", "minify": true, "uses": ["blocks"] }` |

`build.mjs` builds each file to `dist/<name>.js` as an ES module with no legal comments. An import that resolves
to the entry of a bundle in `uses` becomes `./<that name>.js` and is not bundled: this replaces the three `sed`
calls. A key it does not know, or a `uses` that names no file, stops the build. The stylesheet (`base`, `kind`,
`shell`, `look`, each by file name), the scoped sheet and `tsc -p tsconfig.types.json` follow, as in today's line.

## A style value's CSS

```rust
// crates/blocks/src/theme/style.rs, one impl per enum
impl Surface {
    pub(crate) const fn css(self) -> &'static str;
}
```

```rust
// crates/blocks/src/theme/css.rs
fn axes(style: &Style) -> String {
    let mut out = [style.type_.css(), style.surface.css(), style.fills.css(), style.marks.css(), style.sections.css()].concat();
    /* the labels, as today */
    out
}
```

```ts
// web/src/gen/schemes.ts, after defaultStyle
export type Label = { prefix?: string; suffix?: string; case?: keyof typeof labelCase };
export type Scale = { space?: number; motion?: number; radius?: number; easing?: keyof typeof ease; labels?: Record<string, Label> } & { [A in keyof typeof axes]?: keyof (typeof axes)[A] };
export const axes = {
  type: { default: ':root{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}', mono: "", serif: ":root{font-family:ui-serif,Georgia,Cambria,serif}" },
  surface: { glass: "", dashed: "…", solid: "…" },
  fills: { tint: "", outline: "…", solid: "" },
  marks: { symbols: "", text: "…" },
  sections: { title: "", quiet: "…" },
} as const;
export const ease = { standard: "cubic-bezier(0.2, 0, 0, 1)", calm: "cubic-bezier(0.4, 0, 0.2, 1)", bouncy: "cubic-bezier(0.34, 1.3, 0.64, 1)" } as const;
export const labelAt = { header: ".sec>.sh", /* … */ picked: ".dgn.picked .dgl" } as const;
export const labelCase = { "as-is": "none", lower: "lowercase", upper: "uppercase" } as const;
```

`look.ts` exports `Scale` from there, so its importers do not change, and its `axes` is a loop: for each axis,
the rule of the value the style sets, and nothing when it sets none. Where `tests/theme.rs` goes:

| file | tests |
|---|---|
| `theme_scheme.rs` | the default pair's tokens, parsing, the gate, the committed misses, the approved design |
| `theme_css.rs` | `css` for both modes, the serif stack, `fixtures/css` (the test `scripts/gen.sh` runs), every value of every enum changes `css` but its default |
| `theme_style.rs` | the style fixtures, good and bad; solid fills; the easing curves |
| `theme_pack.rs` | `check_pack`, passing and refusing |

## Where the Swift views go

| today | after |
|---|---|
| `BlockRows.swift`: `RowView`, `RowButton`, `Lifted` | `Kind/Row.swift`, as `RowBlock(block:)` |
| `BlockRows.swift`: `RelativeValue` and `Shown.text`; `Figure` | `Part/RelativeValue.swift`; `Part/Figure.swift` |
| `BlockFields.swift`: `RunBlock`; `SecretBlock`; `FieldsBlock` | `Kind/Run.swift`; `Kind/Secret.swift`; `Kind/Form.swift` as `FormBlock`, and `Kind/Config.swift`, whose `ConfigBlock` draws `FormBlock` |
| `BlockFields.swift`: `FieldRow` | `Field/Row.swift` |
| `Components.swift`: `RoundButton`; `CardButton`; `Confirmation` and `Source`; `RelativeText`; `Pill` | `Part/`, a file each; `Confirmation` goes with `Source` |
| `BlockContent`, `BlockImages`, `BlockEdits`, `BlockDiagram`, `BlockLines`, `BlockTable`, `BlockSteps`, `BlockChart`, `Stage`, `Island` | each kind's view to `Kind/<Kind>.swift` under the name `<Kind>Block`, with the views only it uses; what an app calls (`islands`, `IslandDraw`) stays where it is |
| `BlockNode.swift`: the `scene` arm | `Kind/Scene.swift`: `SceneBlock` draws the app's `scene` view when it has one, else the stage |
