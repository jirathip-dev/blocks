# blocks: the repo's layout and the data shapes (#2)

## The repo

```
Cargo.toml                      the workspace: crates/blocks
Package.swift                   at the root: SwiftPM reads no manifest in a subfolder (blocks#1 has swift/Package.swift)
package.json                    at the root: an npm git dependency installs only the root (blocks#1 has web/package.json)
crates/blocks/src/
  expr.rs                       `Expr`, `Lit`, `eval`: the behaviour language
  kind/<kind>.rs                one file per block kind, with its typed sample; kind/parts.rs; kind/mod.rs generated
  built.rs wire.rs diff.rs patch.rs shelf.rs mirror.rs      drover #1318's shapes; wire.rs also `Format` and `prev`
  behave.rs tree.rs             a screen's local state as a view; the tree a renderer must draw, the harness's shapes
  site/<kind>.rs                one static HTML writer per kind; site/page.rs the document; site/mod.rs generated
  layout.rs                     layout.json: the types, `check`, `merge`, `resolved`
  theme/                        scheme.rs (tokens, the gate, `css`), style.rs, pack.rs (theme.json, `check_pack`)
  web.rs                        `JS` and `CSS`: web/dist as two strings
  codegen.rs, bin/codegen.rs    behind the `schema` feature, as blocks#1 has it
schema/blocks.schema.json       generated
web/src/gen/                    generated: types.ts (with `Kind`), hooks.ts, schemes.ts
web/src/                        stream.ts, patch.ts, theme.ts, behave.ts, island.ts, dump.ts, shell.ts, blocks.css
web/src/render/<kind>.ts        one file per kind; render/index.ts generated
web/shot/                       `blocks-shot`: the HTML harness on Playwright's WebKit; not in the bundle
web/dist/blocks.{js,css}        generated: the bundle for a host with no Node
swift/Sources/Blocks/           Gen/ (generated types and decoders), JSONValue, Mirror, Layout, Expr
swift/Sources/BlocksUI/         BlocksView, SlotView, Look, Palette, BlockStyle, Behave, Island; Kinds/<Kind>.swift
swift/Sources/BlocksSnapshot/   the SwiftUI harness; swift/Sources/blocks-snap/ its CLI (macOS)
fixtures/                       generated: blocks/<kind>.json, trees/, html/. Kept: screens/ (both apps' goldens),
                                protocol/, behave/, site/, layouts/, schemes/, styles/, packs/ (hand-made test inputs)
docs/                           one file per area: schema, layout, theme, html, swift, site, behave, islands, headless, consume
```

## Block

A block is a JSON object with a `type`, as both apps send it today. The wire gains fields; none changes.

```rust
/// kind/mod.rs, generated from the folder: one variant per file, its `type` the file's name in kebab-case.
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum Block {
    Screen(Screen), Sheet(Sheet), Section(Section), List(List), Row(Row), Card(Card), Choice(Choice), Form(Form),
    Config(Form), Secret(Secret), Run(Run), Button(Button), Chips(Chips), Stat(Stat), Text(Text), Images(Images),
    Web(Web), Diff(Diff), Editor(Editor), Scene(Scene), Diagram(Diagram),      // cooee's schema: 21 kinds
    Composer(Composer),                                                        // drover's: not in that schema
    Prose(Prose), Hero(Hero), Media(Media), Nav(Nav),                          // content, for websites (q2060)
    Island(Island),                                                            // a hosted client component (q2067)
    App(AppBlock),                                                             // any other `type`: an app's own
}
pub struct AppBlock { pub kind: String, pub id: Option<String>, pub fallback: Fallback, pub fields: Map<String, Value> }

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
    pub show: Option<Expr>,                   // on every kind: drawn while true (Behaviours, below)
    #[serde(flatten)]
    pub more: Map<String, Value>,             // a field this version lacks: kept on the wire
}
/// kind/parts.rs
pub enum Tone { Ok, Warn, Bad, Info, Mute, Accent, Working, Needs, Done, Fail, Idle }
pub struct Tap { open, sheet, action, values, thread, url, focus, copy, keep }    // each optional
pub struct Act { label, icon, action, values, tone, tap, confirm, menu }
pub struct Field { kind: FieldKind /* text | toggle | picker | secret */, name, label, value, options, checks, enabled, show, … }
/// What a client with no view for the `type` draws: a plain row; with only a title, a line of text.
pub struct Fallback { pub title: String, pub subtitle: Option<String>, pub tap: Option<Tap> }
pub trait Plain { fn plain(&self) -> Fallback; }          // every core kind: its fallback from its own fields
```

- **Built by type, never by hand (q2063).** Each kind has `new(<its required fields>)` and one setter per optional
  field, written by one `kind!` macro from the field list. A server never writes `json!` or a string of JSON.
- **The fallback (q2064)** is written by the serializer from `plain()` for every block but `row` and `text`, the
  two forms it is drawn as. `AppBlock` and `Island` have no `plain()`: their constructors take the fallback.
- **The superset.** The 21 kinds of cooee's schema, drover's `composer`, every field either app sends, and the five
  new kinds below: 27. B1 finds
  the apps' fields by parsing both apps' goldens: an `Extra` fault is fixed by adding the field, never by dropping it.
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
impl Built { pub fn of(screen: &Screen) -> Built;                 // typed in: a server's own screen; writes each fallback
             pub fn new(v: Value) -> Built;                      // read in: another server's or a plugin's JSON
             pub fn check(&self, app: &[&str]) -> Vec<Fault>; }
pub enum Fault { Twice, Unnamed, Unknown, Shape, Extra,          // screen-hub's five
                 Clash { kind: String },                         // an app kind named like a core kind
                 Bare { kind: String, id: String },              // an app kind or island with an empty fallback
                 State { key: String } }                         // a `get` of no declared key, or a key declared twice
```

### Content kinds and the island

```rust
pub struct Prose { pub id: Option<String>, pub parts: Vec<Part> }
pub enum Part { Heading { level: u8, spans: Vec<Span> }, Para { spans: Vec<Span> }, List { ordered: bool, items: Vec<Vec<Span>> },
                Quote { spans: Vec<Span> }, Code { lang: Option<String>, text: String }, Rule }
pub struct Span { pub text: String, pub bold: bool, pub italic: bool, pub code: bool, pub link: Option<String> }
pub struct Hero { pub id, pub title: String, pub subtitle: Option<String>, pub media: Option<Media>, pub actions: Vec<Act> }
pub struct Media { pub id, pub src: String, pub alt: String, pub width: u32, pub height: u32,     // the size is required:
                   pub video: bool, pub poster: Option<String>, pub caption: Option<String> }     // no layout shift
pub struct Nav { pub id, pub brand: Option<Link>, pub links: Vec<Link> }     // Link { label, href, current }
pub struct Island {
    pub id: String,                              // required: events and patches name it
    pub name: String,                            // the component: a custom element's tag, a registered SwiftUI view
    pub props: Map<String, Value>,               // from the app's own `Serialize` props type
    pub events: Vec<String>,                     // the names it may send; any other is dropped
    pub size: Option<Size>,                      // width and height, or an aspect: the box is reserved before it loads
    pub fallback: Fallback,
}
```

- The block `nav` is a site's link bar, a `type` in a screen. The layout's `nav` is the shell, a `kind` in
  `layout.json`. Two files, two namespaces.
- `text` keeps `markdown`, as both apps send it. `prose` is a tree, so no renderer needs a markdown reader for it.

## Behaviours

```rust
/// expr.rs. A tree, built by the typed API and sent like any field. `Lit` is written bare: true, 3, "x", null.
pub enum Lit { Null, Bool(bool), Num(f64), Str(String) }
pub enum Expr {
    Lit(Lit),
    Get(String),                                  // {"get":"email"}: a state key
    Not(Box<Expr>), All(Vec<Expr>), Any(Vec<Expr>),
    Eq(Pair), Lt(Pair),                           // ne, le, gt and ge are built from these by the typed API
    Len(Box<Expr>),                               // of a string, in Unicode scalar values
    Has(Pair),                                    // a string contains another
    Is(Box<Expr>, Pattern),                       // Filled | Email | Url | Number: named, never a regex
    Add(Pair), Sub(Pair), Cat(Vec<Expr>),         // numbers; strings joined
    Pick(Box<[Expr; 3]>),                         // if the first, the second, else the third
}
pub fn eval(e: &Expr, state: &State) -> Lit;      // total: a wrong type gives null; null is false; never panics

pub struct Screen { /* … */ pub state: BTreeMap<String, Lit> }     // the screen's local state and its start values
pub struct Check { pub ok: Expr, pub say: String }                 // on a field: the first that fails shows `say`
pub struct Set { pub key: String, pub to: Expr }                   // on a tap: changes state, sends nothing
// show: Option<Expr> on every kind and field · enabled: Option<Expr> on a button, an act, a field
// Tap.set: Vec<Set> · Shown::Get(Expr): a value or a text bound to state

/// behave.rs: what the state makes of a screen. The static writer and `tree::expect` call it; TS and Swift mirror it.
pub struct View { pub hidden: BTreeSet<String>, pub disabled: BTreeSet<String>, pub says: BTreeMap<String, String> }
pub fn view(screen: &Built, state: &State) -> View;
```

- **State keys**: the screen's `state`, and the `name` of every field and `chips` (its start value is the control's
  `value` or `selected`).
- **State is the client's.** It lives beside the client's copy of the screen and survives every op; a whole-screen
  frame keeps the keys the new screen still declares. A server sees it only as an action's `values`, as today.
- **A check never replaces the server's.** A form's submit is disabled while a check fails; the server validates again.
- **Unknown is absent.** An operation a client does not know makes that one `show`, `enabled`, check or `set` count
  as not written: the block shows, the control works, the server decides.
- **The spec is `docs/behave.md` and `fixtures/behave/*.json`**: state, expression, expected value. The Rust, TS
  and Swift evaluators run the same files, among them an emoji length and a number shown as text.

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

```rust
/// The format and the version travel as one media type: `application/vnd.blocks+json;v=1` (q2063).
pub enum Format { Json }                                  // Cbor and MsgPack: one more variant each, no schema change
pub struct MediaType { pub format: Format, pub v: u8 }
impl MediaType {
    pub fn pick(offered: &str) -> Result<MediaType, Outdated>;   // an `Accept` value; `application/json` reads as Json, v current
    pub fn write<T: Serialize>(&self, value: &T) -> Vec<u8>; // through `prev` when `v` is the version before
    pub fn read<T: DeserializeOwned>(&self, bytes: &[u8]) -> Result<T, Broken>;
}
impl Action { pub fn from_form(body: &str) -> Result<Action, Broken>; }   // a static page's `<form>` post
```

- `Hello.v` is the version the stream runs at: the lower of the two sides'. The transport (SSE, the `POST`,
  cookies, tokio) stays in the apps, and so does where the media type travels: the `Accept` and `Content-Type`
  headers, or a query on the stream's URL, because an `EventSource` cannot set a header.
- Every type reads and writes through serde with a self-describing format in mind (`type` tags, flattened extras),
  which CBOR and MessagePack are. A binary format also needs a binary transport; SSE is text.
- `wire::prev` is empty at version 1. A breaking change adds the functions that write and read the version before;
  the next breaking change deletes them. screen-hub's `wire::old` is the same idea for cooee's stream of today.

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
pub fn default() -> &'static PerMode<Scheme>;            // the built-in neutral grey pair, light and dark
pub const DEFAULT_STYLE: [(&str, &str); 11];             // its tile style: radius, seam, dot grid, motion

pub struct Style { format, label, icon, type_, space, radius, motion, surface, fills, marks, figures, sections, labels, stage }
pub fn css(schemes: &PerMode<Scheme>, style: &Style) -> String;   // every token as a CSS variable, both modes
pub struct Theme { label, scheme: PerMode<String>, sprites: bool, moments: bool, words: BTreeMap<String, String>, scene, style }
pub fn check_pack(files: &[(&str, &[u8])], schemes: &[(&str, Scheme)]) -> Vec<String>;   // words, sprites, sizes,
                                                         // and the pack's schemes, found in `schemes` and gated
```

- A scheme's 19 tokens and their gate are the same in both apps today; `Style` and `Theme` are cooee's
  (`styles-as-packs/shapes.md`, cooee `docs/themes.md`). `space` and `motion` are new keys with defaults, so
  `style.json` goes to format 2 and a reader takes 1 and 2. These are the tokens q2061 names: colours (`Scheme`);
  type, spacing, radius and motion (`Style`).
- `default()` is blocks' one theme of its own (q2118, q2119): a neutral grey pair with ink as the only accent and
  the five state colours muted and used small, plus the tile style values in `DEFAULT_STYLE` (`docs/theme.md`).
  It paints when no theme is supplied: blocks' tests, the headless PNGs, the showcase and an app's first paint.
  Both schemes pass the gate. Every named scheme and pack is swag's (q2115): an app parses swag's text with these
  types and hands `check_pack` the schemes a pack may name. `fixtures/packs/plain` tests it here.
- The gate is this one function. The page and the Swift app never run it: a server serves only what passed.
- A renderer reads the theme through a port, so it never knows which art an app has:

```ts
export type Theme = { figure(f: Figure): Node | null; word(key: string, plain: string): Node; css(s: Scheme): string };
export function packs(look: { theme: ThemeJson; base: string }): Theme;      // the port over a swag `packs/` pack
```

## What is generated

| File | From | By |
|---|---|---|
| `crates/blocks/src/kind/mod.rs`, `site/mod.rs`, `web/src/render/index.ts`, `swift/Sources/BlocksUI/Kinds.swift` | the four kind folders | `scripts/lists.sh` |
| `schema/blocks.schema.json` | the Rust types | `blocks-codegen` (schemars, the `schema` feature) |
| `web/src/gen/types.ts`, `swift/Sources/Blocks/Gen/Blocks.swift` | the schema | `blocks-codegen` |
| `web/src/gen/hooks.ts` and the `site` writers' names | each kind file's `parts` and `variant` | `blocks-codegen` |
| `web/src/gen/schemes.ts`, `swift/Sources/Blocks/Gen/Schemes.swift` | `theme::default()` and `DEFAULT_STYLE` | `blocks-codegen` |
| `fixtures/blocks/<kind>.json` | each kind file's typed sample (it replaces blocks#1's `sample.json`) | `blocks-codegen` |
| `fixtures/trees/<kind>.json`, `fixtures/html/<kind>.html` | those fixtures, through `tree::expect` and `site` | `blocks-codegen` |
| `web/dist/blocks.js`, `web/dist/blocks.css` | `web/src` | `npm run build` (esbuild, pinned) |

`just gen` runs the three steps in that order. `drover arch-check` fails a PR whose generated files differ.
The Swift decoder switches on `type`; it is generated too, so there is still no hand-written decoding, and the
layout, style, scheme, expression, tree and step shapes are generated with it. Generated files do not count toward
the line cap, which is one more reason a shape is written once, in Rust. The crate exposes the schema as
`blocks::SCHEMA` (a string), so an app can validate a plugin's answer without a copy of the file.

## Versioning

`SCHEMA_VERSION` is the wire's version: in the crate, the schema's `$id`, `types.ts`, `Blocks.swift`, the media type
and `Hello.v`. It changes only with a breaking change. A release is a promote to `main`, tagged `v<SCHEMA_VERSION>.<n>`.

| A newer server sends | Version | What an older client does |
|---|---|---|
| a kind it has no view for (new, another app's, an island it lacks) | same | draws the block's `fallback`, then its children; keeps the JSON |
| a field it does not know | same | ignores it; keeps it |
| a `tone`, `style` or other enum value it does not know | same | draws the default of that field |
| an expression operation it does not know | same | that one `show`, `enabled`, check or `set` counts as absent |
| an op it does not know | same | drops that frame and opens the key again with no rev: the server answers the whole screen |
| a removed or renamed field or kind, a changed type or meaning, a new required field | `SCHEMA_VERSION` + 1 | one version behind: nothing, the server writes its form through `wire::prev`. Further behind: keeps its last copy, shows `update the app`, stops syncing |

- **Two versions on each side.** A server at N serves clients at N and N − 1; a client at N reads a server at N and
  N − 1. The stream runs at the lower. More than one apart, the client says `update the app` or `update the server`.
- A server keeps at most two written forms of a screen, and writes the second only while such a client is connected.
- A breaking change is made in three PRs: add the new form, move both apps' pins, remove the old form (then + 1,
  with its `prev` functions and a `fixtures/protocol/` case that reads the old form).
- **Old renderers, new screens.** `compat.yml` checks out the last release tag of this version and of the one
  before, and runs those renderers' own harnesses over today's `fixtures/`: no error, and every block drawn natively
  or as its fallback. So the harness's flags and the tree's shape are part of the contract (`renderers.md`).
- `layout.json` and `style.json` carry `format`; a reader refuses a newer one and keeps its last good copy. These
  are files an owner edits, so a server's check refuses an unknown key or value with its line, and never skips it.
- The pin is a commit on blocks' `staging`. No manifest names a tag.
