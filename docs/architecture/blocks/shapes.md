# blocks: the repo's layout and the data shapes (#2)

## The repo

```
Cargo.toml                      the workspace: crates/blocks
Package.swift                   at the root: SwiftPM reads no manifest in a subfolder (blocks#1 has swift/Package.swift)
package.json                    at the root: an npm git dependency installs only the root (blocks#1 has web/package.json)
crates/blocks/src/
  kind/<kind>.rs                one file per block kind; kind/parts.rs the shared parts; kind/mod.rs generated
  built.rs wire.rs diff.rs patch.rs shelf.rs mirror.rs      drover #1318's shapes (screen-hub/shapes.md)
  layout.rs                     layout.json: the types, `check`, `merge`, `resolved`
  theme/                        scheme.rs (tokens, the gate), style.rs, pack.rs (theme.json, the vendored packs)
  web.rs                        `JS` and `CSS`: web/dist as two strings
  codegen.rs, bin/codegen.rs    behind the `schema` feature, as blocks#1 has it
schema/blocks.schema.json       generated
web/src/gen/                    generated: types.ts (with `Kind`), schemes.ts
web/src/                        stream.ts, patch.ts, theme.ts, shell.ts, blocks.css
web/src/render/<kind>.ts        one file per kind; render/index.ts generated
web/dist/blocks.{js,css}        generated: the bundle for a host with no Node
swift/Sources/Blocks/           Gen/ (generated: Blocks.swift, Schemes.swift), JSONValue, Mirror, Layout, Style, Scheme
swift/Sources/BlocksUI/         BlocksView, SlotView, Look, Palette; Kinds/<Kind>.swift; Kinds.swift generated
theme/schemes/<name>.json       the 12 built-in schemes, one file each
theme/packs/<name>/             swag's `packs/` at the commit theme/packs/SOURCE names, with SHA256SUMS
fixtures/                       blocks/<kind>.json, screens/, protocol/, layouts/, schemes/, styles/
docs/                           one file per area: schema, layout, theme, html, swift, consume, deps
```

## Block

A block is a JSON object with a `type`, as both apps send it today. The wire does not change.

```rust
/// kind/mod.rs, generated from the folder: one variant per file, its `type` the file's name in kebab-case.
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum Block {
    Screen(Screen), Sheet(Sheet), Section(Section), List(List), Row(Row), Card(Card), Choice(Choice), Form(Form),
    Config(Form), Secret(Secret), Run(Run), Button(Button), Chips(Chips), Stat(Stat), Text(Text), Images(Images),
    Web(Web), Diff(Diff), Editor(Editor), Scene(Scene), Diagram(Diagram),      // cooee's schema: 21 kinds
    Composer(Composer),                                                        // drover's: not in that schema
    App(AppBlock),                                                             // any other `type`: an app's own
}
pub struct AppBlock { pub kind: String, pub id: Option<String>, pub fields: Map<String, Value> }

/// kind/row.rs: every field cooee's schema has, plus what drover's rows carry (`sticky`).
pub struct Row {
    pub id: Option<String>,
    pub title: String,
    pub subtitle: Option<Toned>,
    pub badge: Option<Badge>,
    pub figure: Option<Figure>,
    pub value: Option<Shown>,                 // a string, a number, or { since } / { until }
    pub tap: Option<Tap>,
    pub swipe: Vec<Act>,
    pub rounds: Vec<Round>,                   // … the rest of the 16 fields
    #[serde(flatten)]
    pub more: Map<String, Value>,             // a field this version lacks: kept on the wire
}
/// kind/parts.rs
pub enum Tone { Ok, Warn, Bad, Info, Mute, Accent, Working, Needs, Done, Fail, Idle }
pub struct Tap { open, sheet, action, values, thread, url, focus, copy, keep }    // each optional
pub struct Act { label, icon, action, values, tone, tap, confirm, menu }
pub struct Field { kind: FieldKind /* text | toggle | picker | secret */, name, label, value, options, … }
```

- **The superset.** The 21 kinds of cooee's schema, drover's `composer`, and every field either app sends. B1 finds
  the fields by parsing both apps' goldens: an `Extra` fault is fixed by adding the field, never by dropping it.
  Known from reading: `screen.focus`, `screen.badge`, `row.sticky`, `card.fold`, `tap.copy`, `tap.keep`.
- **Not blocks.** `header-strip`, `chat-cards` and `menu-row` are a plugin's places: they are in `layout`, below.
  (screen-hub's sketch lists them as kinds; that is the one line of its `Block` this ADR changes.) `toggle` and
  `picker` are field kinds.
- **`scene` is the schema's**: `{ label, lanes }`. drover's Herd block has another shape under the same name
  (`{ weather, repos }`); it becomes drover's app kind `herd`.
- **Children.** A kind's child list is `blocks` or `rows`; also `buttons` (card), `lanes` (scene), `rounds` (row).
  The diff walks them; an `insert` goes into the container's one list, as cooee's `LiveScreen` chooses it today.
- **Reading is lenient, writing is strict** (screen-hub): a client keeps an unknown kind and an unknown field; a
  server's own screen with either has a fault. `Built::check` takes the app's kinds:

```rust
impl Built { pub fn check(&self, app: &[&str]) -> Vec<Fault>; }
pub enum Fault { Twice, Unnamed, Unknown, Shape, Extra,          // screen-hub's five
                 Clash { kind: String } }                        // an app kind named like a core kind
```

## Op

```rust
#[serde(tag = "op", rename_all = "lowercase")]
pub enum Op {
    Merge { id: String, fields: Map<String, Value> },
    Insert { into: String, before: Option<String>, after: Option<String>, block: Value },   // `after`: cooee reads it today
    Move { id: String, into: String, before: Option<String> },                               // screen-hub's
    Remove { id: String },
    Replace { id: String, block: Value },
    Badge { count: u64 },
    Dot { on: bool },                                             // cooee's unread dot; drover's page lacks it today
    Screen { screen: Value },                                     // only in an action's answer and the old per-screen stream
    #[serde(other)]
    Unknown,                                                      // an op from a newer server: see Versioning
}
```

`insert` lands before `before`, else after `after`, else at the end. The diff writes `before` only.

## Wire

Reused from `screen-hub/shapes.md`, field for field: `Hello`, `Frame`, `Bye`, `Sync`, `Have`, `Synced`, `KeyState`,
`Shelf<K>`, `Mirror`, `wire::old`. Two more types, for the one call both apps already make:

```rust
pub struct Action { pub screen: String, pub block: Option<String>, pub action: String, pub values: Map<String, Value> }
pub struct Answer { pub ops: Vec<Op>, pub toast: Option<String>, pub close: bool, pub open: Option<String> }
```

`Hello.v` is `SCHEMA_VERSION`. The transport (SSE, the `POST`, cookies, tokio) stays in the apps.

## Layout

`layout.json` is cooee's (`layout-blocks/shapes.md`), unchanged on the wire. What is an app's becomes a `Contract`.

```rust
pub struct Layout { pub format: u32, pub theme: Option<String>, pub root: Node }
pub struct Node {
    pub id: String,                                    // unique in the file; default `<source>:<path>` or the kind
    pub content: Content,
    pub label: Option<String>,
    pub place: Placement,
    pub transition: Transition,                        // Push | Sheet | Fade | None
    pub config: Map<String, Value>,
    pub slots: BTreeMap<String, Vec<Node>>,
    pub locked: bool,
}
pub enum Content { Screen { source: String, path: String }, Component { kind: String } }
pub struct Placement { pub compact: Place, pub wide: Place }       // a size the file leaves out inherits the other
pub enum Place { Push, Sheet, Panel, Column, Strip, Cards, Menu, Inline, Hidden }
pub enum SizeClass { Compact, Wide }

/// The app's part: its components beside `nav`, and the screens no file may place, replace or hide.
pub struct Contract { pub components: &'static [Component], pub locked: &'static [&'static str] }
pub struct Component { pub kind: &'static str, pub slots: &'static [&'static str], pub config: &'static [&'static str] }
/// A plugin's manifest places: merged into the layout unless the owner's file already places that plugin.
pub struct PlaceEntry { pub kind: PlaceKind /* HeaderStrip | ChatCards | MenuRow */, pub source: String, pub id, label, subtitle, screen }

pub fn check(text: &str, c: &Contract) -> Result<Layout, Broken>;      // Broken { line, col, why }
pub fn merge(l: Layout, places: &[PlaceEntry], c: &Contract) -> (Layout, Vec<String>);
impl Layout { pub fn resolved(&self, size: SizeClass) -> Resolved; }    // one `Place` per node
```

- `nav` is the one component this repo knows (slots `side`, `main`, `menu`). Every other kind is the app's.
- The rules are cooee's: format 1, the root is a `nav` and not hidden, ids unique, slots and config keys from the
  contract, depth at most 6, at most 200 nodes, 64 KiB, a locked path never named.
- A shell reads only `Resolved`. `place` says how a node shows (`strip`: a tab or chip; `cards`; `menu`: a row in the
  menu sheet; `sheet`; `push`; `column` and `panel` on wide); a component node is handed to the app.
- Two readers: Rust (a server's edge) and Swift (the app keeps its bundled default and its locked screens whatever
  a server says). They refuse the same `fixtures/layouts/`. The page trusts its server's checked layout.

## Theme

```rust
pub struct Scheme { pub label: String, pub mode: Mode /* "color-scheme": dark | light */, pub tokens: Tokens }
pub struct Tokens { pub bg: Hex, pub card: Hex, pub edge: Hex, pub line: Hex, pub scrim: Hex, pub fg: Hex, pub mute: Hex,
    pub l: Hex, pub link: Hex, pub g: Hex, pub a: Hex, pub r: Hex, pub p: Hex, pub c: Hex,
    pub fk_l: Hex, pub fk_p: Hex, pub fk_c: Hex, pub fk_g: Hex, pub fk_a: Hex }      // on the wire `--bg` … `--fk-a`
pub struct Hex(String);                                  // #rrggbb or #rrggbbaa: nothing else parses
pub struct Miss { pub what: String, pub got: f64, pub min: f64 }
pub fn gate(s: &Scheme) -> Vec<Miss>;                    // text 4.5:1, state colours 3:1, ΔE2000 20 apart
pub fn schemes() -> &'static [(&'static str, Scheme)];   // theme/schemes/*.json

pub struct Style { format, label, icon, type_, radius, surface, fills, marks, figures, sections, labels, stage }
pub struct Theme { label, scheme: PerMode<String>, sprites: bool, moments: bool, words: BTreeMap<String, String>, scene, style }
pub struct Pack { pub name: &'static str, pub files: &'static [(&'static str, &'static [u8])] }
pub fn packs() -> &'static [Pack];                       // theme/packs/: theme.json, sprites.svg, scene.svg, icon.png
pub fn check_pack(files: &[(&str, &[u8])]) -> Vec<String>;   // cooee's theme gate: words, sprites, sizes, schemes
```

- A scheme's 19 tokens and their gate are the same in both apps today; `Style` and `Theme` are cooee's
  (`styles-as-packs/shapes.md`, cooee `docs/themes.md`).
- The gate is this one function. The page and the Swift app never run it: a server serves only what passed.
- A renderer reads the theme through a port, so it never knows which art an app has:

```ts
export type Theme = { figure(f: Figure): Node | null; word(key: string, plain: string): Node; css(s: Scheme): string };
export function packs(look: { theme: ThemeJson; base: string }): Theme;      // the port over a swag `packs/` pack
```

## What is generated

| File | From | By |
|---|---|---|
| `crates/blocks/src/kind/mod.rs`, `web/src/render/index.ts`, `swift/Sources/BlocksUI/Kinds.swift` | the three kind folders | `scripts/lists.sh` |
| `schema/blocks.schema.json` | the Rust types | `blocks-codegen` (schemars, the `schema` feature) |
| `web/src/gen/types.ts`, `swift/Sources/Blocks/Gen/Blocks.swift` | the schema | `blocks-codegen` |
| `web/src/gen/schemes.ts`, `swift/Sources/Blocks/Gen/Schemes.swift` | `theme/schemes/*.json` | `blocks-codegen` |
| `schema/sample.json`, `web/src/sample.ts` | the Rust types (blocks#1) | `blocks-codegen` |
| `web/dist/blocks.js`, `web/dist/blocks.css` | `web/src` | `npm run build` (esbuild, pinned) |

`just gen` runs the three steps in that order. `drover arch-check` fails a PR whose generated files differ.
The Swift decoder switches on `type`; it is generated too, so there is still no hand-written decoding. The crate
exposes the schema as `blocks::SCHEMA` (a string), so an app can validate a plugin's answer without a copy of the file.

## Versioning

`SCHEMA_VERSION` is the wire's major version: in the crate, the schema's `$id`, `types.ts`, `Blocks.swift` and `Hello.v`.

| A newer server sends | Version | What an older client does |
|---|---|---|
| a kind it does not know | same | draws the block's children, else nothing; keeps the JSON |
| a field it does not know | same | ignores it; keeps it |
| a `tone`, `style` or other enum value it does not know | same | draws the default of that field |
| an op it does not know | same | drops that frame and opens the key again with no rev: the server answers the whole screen |
| a removed or renamed field or kind, a changed type or meaning, a new required field | `SCHEMA_VERSION` + 1 | on `hello.v` above its own: keeps its last copy, shows `update the app`, stops syncing |

- A breaking change is made in three PRs: add the new form, move both apps' pins, remove the old form (then + 1).
- `layout.json` and `style.json` carry `format`; a reader refuses a newer one and keeps its last good copy. These
  are files an owner edits, so a server's check refuses an unknown key or value with its line, and never skips it.
- The pin is a commit on blocks' `staging`. A tag `v<SCHEMA_VERSION>.<n>` marks a promote to `main`; no manifest names it.
