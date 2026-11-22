# Shapes (#359)

Rust is the source. None of these is on the wire: `SCHEMA_VERSION` stays 2, and TS and Swift get nothing.

## The catalog: `crates/blocks/src/catalog/mod.rs`

```rust
/// What a host lets a model write: read from the host's own JSON file, never sent to a client.
#[non_exhaustive]
#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalog {
    pub name: String,
    pub kinds: BTreeMap<String, Allow>,
    #[serde(default)]
    pub links: Vec<String>,
    #[serde(default)]
    pub media: Vec<String>,
    #[serde(default)]
    pub max: Max,
    #[serde(default)]
    pub example: Option<Value>,
}

/// One kind's entry: the fields a model may write, the actions a block of it may send, a form's field types.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Allow {
    pub fields: Option<Vec<String>>,
    pub actions: Vec<String>,
    pub inputs: Vec<String>,
}

/// The most a reply may hold: 40 blocks and 16,000 characters unless the file says otherwise.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Max {
    pub blocks: usize,
    pub chars: usize,
}

impl Catalog {
    /// The catalog in `json`, or why it does not load.
    pub fn read(json: &str) -> Result<Catalog, String>;
    /// Whether any kind of the catalog may send `action`.
    pub fn sends(&self, action: &str) -> bool;
}
```

`Catalog::read` is the only way to make one. It refuses:

| Refused at load | Why |
|---|---|
| an unknown key; a kind that is no core kind; a field its kind lacks | a typo must not become a default |
| a field from the never-offered list below | no entry can switch local state or ids on |
| `inputs` on a kind that is no `form` or `config`; an input that is no field type | the same |
| a `links` or `media` entry that does not end in `/` or `:` | `https://a.example` would also allow `https://a.example.evil.net` |
| an `example` that `model::read` refuses under this catalog, or that needs a mend | the prompt never shows a wrong example |

An app's own kind cannot be in a catalog in this version: its fields have no schema to build a prompt or a check from.

**Never offered, in any catalog.** A block's `id` and `fallback` (the reader and `Built` write them); `show`,
`enabled`, `checks`, `set` and a `{"get": key}` value (local state: its keys are shared by the whole screen);
a tap's `focus`, `keep`, `open`, `sheet` and `thread`. A host that wants a model's button to open a screen lists an
action and answers it with `Answer.open`.

## The check: `guard::lint_in`

```rust
/// What `lint` sees on `screen`, plus the `catalog/` rules; no app kinds.
pub fn lint_in(screen: &Built, catalog: &Catalog) -> Vec<Seen>;
```

`Built::check(app)` and `guard::lint(screen, app)` keep their signatures. The new rules are files in
`guard/rules/`, in the rule table with a fix text each; with no catalog they see nothing. `guard::VERSION` becomes 4.

| Rule (all errors) | Fires on | What the model is told |
|---|---|---|
| `catalog/kind` | a block of a kind the catalog does not name | Use only these kinds: (the list). |
| `catalog/field` | a field outside its kind's `fields`, or a never-offered one | Leave it out. This kind takes: (the list). |
| `catalog/action` | an `action` anywhere in a block that its kind's entry does not list | This kind may send: (the list), or nothing. |
| `catalog/input` | a form field whose type `inputs` does not list | A form here takes: (the list). |
| `catalog/link` | a `url`, `href` or a span's `link` that starts with no `links` entry | A link may start with: (the list). Else write it as text. |
| `catalog/media` | a `src`, `avatar` or `poster` that starts with no `media` entry | No file is loaded here; describe it in text. |
| `catalog/open` | a tap with `open`, `sheet` or `thread` | Send an action; the app opens the screen. |
| `catalog/size` | more blocks than `max.blocks` | Say it in fewer blocks. |

A rule's fix text is fixed, as for every rule; the list is the finding's detail, from the catalog. A link or a
file address also fails its rule when it holds a space, a control character or a backslash, or starts with `//`
while no entry does. `fixtures/model/links.json` holds the cases.

`Fault::Shape`'s `why` becomes the kind's own parse error (`missing field `label``), from a new `Block::read(kind,
value)` the `kinds!` macro writes. Today it is serde's "did not match any variant", which tells a model nothing.

## The reader: `crates/blocks/src/model/`

```rust
/// A model's `text` as checked blocks under `catalog`, their ids written under `prefix`; or why not.
pub fn read(catalog: &Catalog, prefix: &str, text: &str) -> Result<Fit, Refusal>;
/// The values of an action sent from a block under `prefix`, the prefix off their field names.
pub fn own(prefix: &str, action: &Action) -> Option<Fields>;
/// The catalog as a system prompt's text.
pub fn prompt(catalog: &Catalog) -> String;

pub struct Fit {
    pub blocks: Vec<Block>,
    pub mends: Vec<Mend>,
    pub warned: Vec<Wrong>,
    pub cut: bool,
}

pub struct Refusal {
    pub errors: Vec<Wrong>,
    pub cut: bool,
    lines: Vec<String>,
}

impl Refusal {
    /// The errors as text for the model: at most 6, each under 160 characters.
    pub fn say(&self) -> String;
    /// What the reply said, as one prose block of plain lines: no action, no link, no file.
    pub fn plain(&self, prefix: &str) -> Block;
}

/// One thing wrong: its rule, where in the model's own JSON (`blocks[1].buttons[0]`), the kind, and the line to say.
pub struct Wrong { pub rule: String, pub at: String, pub kind: String, pub say: String }

/// One mend the reader made, with where.
pub enum Mend { Around, Closed, Root, Dropped { at: String, field: String }, Cut { at: String } }
```

`rule` is a guard rule's id, or one of the reader's four: `read/size` (over `max.chars`, refused before parsing),
`read/json` (no JSON value in the text, even closed), `read/empty` (a closed reply with no block) and `read/kept`
(below). A reply that is only text is `read/json`: its `plain` is that text read as markdown, less its links, and a
host may show it without asking again.

### What is mended, and what never is

A mend removes or completes. It never invents and never guesses.

| Mend | The model wrote | The reader |
|---|---|---|
| `Around` | text or a code fence around the JSON | takes the first JSON value |
| `Closed` | JSON that stops early, a trailing comma | closes the open strings, lists and objects |
| `Cut` | a top-level block that had not closed when the text stopped | leaves it out and sets `cut` |
| `Root` | a bare list, or one block, in place of `{"blocks": []}` | wraps it |
| `Dropped` | a field its kind lacks or its entry does not offer, when nothing in it sends, opens or loads | removes the field |
| always | an `id` on a block; a form field's or a chips' `name` | writes `<prefix>.<n>`; puts `<prefix>.` before the name |
| always | a `prose` block's `markdown` | its `parts`, by `Prose::read` |

The last row is the one place a model's format is not the wire's: a model writes markdown well and a tree of parts
badly. A prefix may not hold a `.`, so `own` takes it off again without guessing.

| Never mended: refused as it is | Why |
|---|---|
| an `action` not listed, misspelt or in the wrong kind | the nearest name may be the dangerous one |
| a link or a file address outside the lists | shortening an address changes where it goes |
| a field that sends, opens or loads, outside `fields` | dropping it leaves a control that does nothing |
| a `confirm`, a `destructive` style, `values` | they are the model's promise to the user; none is added or taken away |
| a `secret` block or a secret input, in or out of the catalog | never dropped, never turned into a text input or back |
| a kind's name; a required field that is missing | no nearest kind, no made-up value |
| one bad block among good ones | the reply is refused whole: a question without its buttons is worse than text |

Held twice. On every read the reader compares the actions, values, confirms, links and file addresses of the typed
blocks with those in the model's JSON, in order, and refuses on any difference (`read/kept`); a link made from a
prose block's markdown is the one addition, held to `links` like any other. And a test runs that comparison over
every case in `fixtures/model/read/` and every eval reply.

## The prompt

Generated by `just gen` into `catalog/cards.rs` (one card per kind and per part: its line, its fields, the parts it
names, whether a field can send), then cut to the catalog at run time. Type lines a model reads as TypeScript:

```
Reply with one JSON object {"blocks": Block[]} and nothing else: no prose around it, no code fence.
Write no `id`. Write text as markdown in a `prose` block. Use only the kinds and fields below.
An `action` is one of its kind's `sends`, spelt as written. A link may start with: https://. No file is loaded.

A Block is one of:
{type: "prose", markdown: string}  // Text as a tree of headings, paragraphs, lists, quotes and code.
{type: "row", badge?: Label, subtitle?: Toned, title?: string, value?: Shown}  // One row of a list.
{type: "button", label: string, action?: string, confirm?: Confirm, style?: "primary"|"plain"|"destructive", values?: {}}  // A button. sends: "pick" | "open-plan"
…
where
Confirm = {title: string, destructive?: bool, message?: string, ok?: string}
Label = {text: Shown, tone?: Tone}
Tone = "ok"|"warn"|"bad"|"info"|"mute"|"accent"|"working"|"needs"|"done"|"fail"|"idle"
…
For example:
{"blocks":[{"type":"prose","markdown":"Pick a plan."},{"type":"button","label":"Pro","action":"pick","values":{"plan":"pro"}}]}
```

A field that can send is shown only for a kind with `actions`. The sizes, before the example, as
`proto/prompt.py` measures them on today's schema (tokens are characters over 3.5, not counted by a tokenizer):

| Catalog | Kinds | Characters | About, in tokens |
|---|---|---|---|
| `say`: prose, list, row, stat, table, steps, each with a `fields` list | 6 | 1,915 | 550 |
| `ask`: `say` plus card, button, choice, chips, form | 11 | 3,394 | 950 |
| every core kind, no `fields` lists | 39 | 12,947 | 3,700 |

A test holds the three within a tenth of these, so a kind that bloats the prompt is seen in its own PR.

## The evals: `fixtures/evals/`

```
fixtures/evals/catalogs/<name>.json    the catalogs the cases use: say, ask
fixtures/evals/cases/<case>.json       { catalog, ask, expect: { kinds, actions, says, blocks }, gold }
fixtures/evals/replies/<set>/<case>.1.txt, <case>.2.txt    a model's raw first reply, and its reply to say()
```

About twelve cases to start. `expect` is what any good answer holds: these kinds, these actions sent, these words
shown, at most this many blocks. `gold` is one such reply; a test reads every gold with no mend and full marks.

```rust
/// One case's marks for one set of replies.
pub struct Score {
    pub fit: bool,
    pub retry: bool,
    pub fell: bool,
    pub mends: usize,
    pub warns: usize,
    pub meets: bool,
    pub chars: usize,
}
```

`fit`: the first reply reads. `retry`: the second does. `fell`: neither. `warns`: guard warnings on the blocks.
`meets`: `expect` holds. The sets under `replies/` are named for what wrote them; CI scores each and holds its
summary line to a file beside it, so a reader change that turns a `fit` into a refusal shows as a diff.

### The model command

`--model <command>` is run once per call. It reads one JSON object on stdin and writes the reply's text to stdout:

```json
{ "system": "…the prompt…", "messages": [{ "role": "user", "text": "…" }, { "role": "assistant", "text": "…" }] }
```

A non-zero exit stops the run. The command, its key and its cost are the owner's; none is in this repo.
