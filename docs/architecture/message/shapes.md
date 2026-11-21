# Shapes

Rust is the source, as for every kind; `just gen` writes the schema, TS and Swift from it. Nothing here exists yet.

## The two kinds: `kind/core/message.rs`, `kind/core/tool.rs`

```rust
words!(Role { Agent, Owner, System });
words!(ToolState { Running, Done, Failed });

kind! {
    /// One message of a conversation: who said it, what was said as blocks, and its attachments.
    pub struct Message {
        id: Option<String>,
        role: Role,
        name: String,
        avatar: Option<String>,
        time: Option<String>,
        blocks: Option<Vec<Block>>,
        files: Option<Vec<Attachment>>,
    }
}

kind! {
    /// One tool call: its name, a one-line summary, its state, and a body shown when it is opened.
    pub struct Tool {
        id: Option<String>,
        name: String,
        state: ToolState,
        summary: Option<String>,
        body: Option<String>,
    }
}

wire! {
    /// A message's attachment: its name and what opens it; with `src` it is an image, drawn small.
    pub struct Attachment {
        name: String,
        tap: Tap,
        src: Option<String>,
    }
}
```

- The builders are the macro's: `Message::new(role, name)`, `Tool::new(name, state)`, a setter per optional field.
- `role` is a word: a client that does not know one draws `agent`. `avatar` is an image URL; with none the design
  says what stands there.
- `blocks` is a list ops can reach: `message` joins `screen`, `sheet`, `section` and `card` in `patch.rs`'s
  `kids`, `list` and `lists`, and in the `hosts` table of the TS and Swift copies.
- `body` is plain text, drawn in the code face. Whether it is open is the client's own state, kept by the tool's
  id, as a card's fold is. A tool with no `body` has nothing to open.
- `Attachment` is not a block: it is set once with its message and never changes alone.
- `prose` gains one field, `streaming: Option<bool>`: more text is coming.

## The op: `wire.rs`

```rust
Append {
    id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    keep: Option<usize>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    parts: Vec<Part>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    text: String,
}
```

Applied to the prose block `id`, in this order:

1. With `keep`, only the first `keep` parts stay. A `keep` over the number of parts does not fit.
2. `parts` are added at the end.
3. `text` is added to the end of the last part's text: the last span of a heading, a paragraph or a quote, the
   last span of a list's last item, a code part's own text. A last part with no text to add to (a rule, no spans,
   no part at all) does not fit.

An op that does not fit, or an `id` that is no prose block, is `ApplyError::Shape`: the mirror reports a gap and
opens the key again, as for any op that does not fit. Counts are of parts, never of characters, so Rust (bytes),
TS and Swift (UTF-16) cannot disagree.

```rust
impl Prose {
    /// The parts of `markdown`: headings, paragraphs, lists, quotes, fenced code, rules; bold, italic, code and links.
    pub fn read(markdown: &str) -> Vec<Part>;
    pub(crate) fn grow(&mut self, keep: Option<usize>, parts: &[Part], text: &str) -> Result<(), String>;
}
```

`read` is a pure function of the text so far, so reading a longer text gives the same first parts. What it does
not know stays text: an unclosed mark is literal, a fence still open is code to the end, a table or raw HTML is a
paragraph, a nested list item keeps its text and loses its indent. A link that `Built`'s link rule refuses is
plain text.

## What `diff` writes

For a prose block whose `parts` changed, `diff` no longer puts `parts` in a `merge`. It writes one `append`:

| old and new parts | the op |
|---|---|
| the same but for the last part's text, which grew | `{ id, text }` with what was added |
| anything else | `{ id, keep, parts }`: `keep` is how many parts are equal from the start, `parts` is new's rest |

Other changed fields of the block (`streaming`) stay in a `merge` before it. `diff` still checks that its ops
give the new screen and falls back to `replace` as today.

## On the wire

```json
{ "type": "message", "id": "t7", "role": "agent", "name": "Scout", "avatar": "/media/scout.png",
  "blocks": [
    { "type": "prose", "id": "t7-a", "parts": [{ "part": "para", "spans": [{ "text": "Reading both files." }] }] },
    { "type": "tool", "id": "t7-b", "name": "Read", "state": "done", "summary": "patch.rs, 238 lines", "body": "use std::fmt;\n…" },
    { "type": "tool", "id": "t7-c", "name": "Test", "state": "running", "summary": "cargo test -p blocks" },
    { "type": "prose", "id": "t7-d", "parts": [], "streaming": true } ],
  "files": [{ "name": "plan.pdf", "tap": { "url": "/files/9" } }, { "name": "shot.png", "src": "/files/10/small", "tap": { "url": "/files/10" } }] }
```

`Built::of` writes each kind's fallback as for any kind: the message's title is its `name`, the tool's its
`name`. A client with no view for them draws those rows and then the message's blocks, so the prose is still read.

## Hooks, roles and names

| Kind | Root | Variant hook | Parts | Role | Name |
|---|---|---|---|---|---|
| `message` | `b b-message` | `data-variant` = `role` | `name`, `avatar`, `files` | `article` | its `name` |
| `tool` | `b b-tool` | `data-variant` = `state` | `name`, `summary`, `body` | `group` | its `name` |
| `prose` with `streaming` | as today, plus `aria-busy="true"` | | | as today | as today |

- An attachment is a link (`tap.url`) or a button (any other tap), named by its `name`; its image has that name as
  `alt`. An action it sends carries `data-action`, as every action does.
- A tool with a `body` draws its head as a button that opens it, named by the tool's `name`, with
  `aria-expanded`. On the static page it is a `<details>`, so it opens with no script.
- The streaming sign has no node among the parts (on the web a pseudo-element of the block), so growing the text
  in place and the same-markup test between HTML and React both hold.

## Fixtures

| File | Holds |
|---|---|
| `fixtures/blocks/message.json`, `tool.json` | each kind's sample, generated, with its trees and HTML as every kind |
| `fixtures/stress/` | `message`: long `name` and file names, empty `blocks`, many `blocks`; `tool`: long `name`, `summary` and `body` |
| `fixtures/append/*.json` | `{ why, parts, op, want }` cases of the op, read by Rust, TS and Swift; `want` is null when it does not fit |
| `fixtures/append/thread.steps.json` | the script of `usage.md` part 5, with its screen |
| `fixtures/read/*.json` | `{ markdown, parts }` cases of `Prose::read`, Rust only |
| `fixtures/guard/bad/lint/` | one failing screen per new rule (`adr.md`, Guard rules) |

The cases of `append` are not put in `fixtures/protocol/`: the compat job runs the last release on that folder,
and the last release reads `append` as an op it does not know.
