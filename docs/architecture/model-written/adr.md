# ADR: model-written screens: catalogs, a check-and-repair reader, a prompt and evals (#359)

## Summary

Decision: a catalog is a JSON file in the host's repo: the kinds a model may write, their fields, the actions each
may send, and the links and files a screen may reach. One new function reads a model's text into checked blocks. It
mends only what cannot change meaning (never an action, a link or a secret input), else refuses with a short list
the model gets once; after that the reply is shown as plain text. Streaming: blocks are drawn as each one closes.
Slices: four, about 1,300 lines: the catalog and its check rules; the reader; the generated prompt; the evals.
Open questions: (1) four issues, the first under #359, or one PR? (2) who records the first eval replies (spend)?

## Question

A model writes a screen at run time, mid-chat. Its output is untrusted and often nearly right. What must a host
hold to draw it safely, what may be fixed for the model without asking, and what does the model need to be told?

## What exists, read from the code (staging `764c38ec`)

- `Built::check(app)` lists structural faults: an id twice, an unknown kind, a wrong shape, an extra field, a link
  that is not http, https, mailto or relative, an action twice in one block, an undeclared state key. Its `app`
  list is the only allow-list, and it only adds kinds. `web/src/core/check.ts` is its twin, held by
  `fixtures/check/`. Swift has none.
- `guard::lint(screen, app)` runs `Built::check` and the `lint/` rules. Each rule is one file with an id, a severity
  and a fix text written for an agent. `Finding` names the rule and the block. This is what `blocks check` runs.
- A shape fault's reason is serde's "data did not match any variant of untagged enum Block": the kind is known, the
  field at fault is not.
- An action is a string. It sits in a button, a tap, an act, a submit, a fold, a gesture, an undo, a page.
  `Built`'s walk already finds every one inside a block. A client sends `Action { screen, block, action, values }`.
- State keys are one flat set per screen, and a form field's `name` is one. Two forms with a field `email` on one
  screen are a fault today.
- The dev-time skill (`skill/blocks/`) is generated from the schema by `codegen/skill.rs`: 49 KB of kind pages for
  the 39 kinds. The schema itself is 170 KB; the part a screen needs is 58 KB minified.
- `Prose::read` turns markdown into parts in the crate. `message` holds any blocks; `diff` sends a grown list as
  inserts by id.
- The crate has no transport, no clock, no file and no process outside codegen and `blocks-cli`, by arch-check.
  `schemars` is in codegen only, so the running crate has no schema to build a prompt from.

## Options

### 1. Where the catalog lives

| | A. On the wire: a client sends its catalog | B. In `Built::check`, replacing `app` | C. The host's file, checked by the guard |
|---|---|---|---|
| Who decides what is allowed | the client, as in A2UI | the host | the host |
| Why | a client says what it can draw | one check for everything | the model's text reaches the server first: the server is the trust line |
| What it costs | a new stream message, in three languages; a version question | a breaking change for drover, cooee and the TS twin; the rules again in the web bundle | one Rust module; nothing for clients |
| What a client that lacks a kind does | sends a smaller catalog | | draws the fallback, as `versioning.md` says today |

### 2. What may be fixed for the model

| | A. Strict: refuse anything wrong | B. Mend what is inert | C. Mend to the nearest valid screen |
|---|---|---|---|
| A code fence, a cut-off end, an extra field | one retry spent | fixed, and counted | fixed |
| `"action": "confrim"` | refused | refused | becomes `confirm` |
| A bad block among good ones | refused | refused | dropped |
| Retries used | most | few | fewest |
| What can go wrong | a slower chat | nothing that sends or opens is changed | a model reaches an action it never named; a question loses its buttons |

### 3. Streamed and partial output

| | A. Whole replies only | B. The same reader on the text so far | C. An incremental parser with its own state |
|---|---|---|---|
| A reply cut by the token limit | refused | the blocks that closed are kept, `cut` is set | the same |
| Shown while writing | nothing | block by block | character by character |
| New state, new ops | none | none: `diff` sends the new blocks | a parser to resume; a grown block per frame |
| Cost | | the text is read again per call: under 16,000 characters each time | least per chunk, most code |

### 4. The prompt's format

Measured on today's schema by `proto/prompt.py`, before the catalog's example:

| Catalog | JSON Schema, minified | The skill's kind pages | Type lines (chosen) |
|---|---|---|---|
| `say`: 6 kinds that only show | 17,497 | 9,788 | 1,915 |
| `ask`: 11 kinds, five that send | 28,973 | 15,007 | 3,394 |
| every core kind | 57,791 | 49,489 | 12,947 |

A JSON Schema could also drive a provider's constrained output. It would put the schema in the running crate, it
cannot say "this action only in this kind" without one schema per catalog, and the reader is needed either way.

### 5. The evals' form

| | A. Compare to one expected screen | B. Marks from the check, plus what the answer must hold | C. A second model as judge |
|---|---|---|---|
| Two good answers that differ | one fails | both pass | both pass |
| Runs in CI | yes | yes, on recorded replies | no |
| Spend | none | once per recording | every run |

## Decision

1. **A catalog is the host's file (1C).** JSON, by hand, read by `Catalog::read`, never sent. It names core kinds,
   and per kind its `fields`, the `actions` a block of it may send and a form's `inputs`; for the whole reply the
   `links` and `media` starts, a size limit and one example. Everything not named is refused. It is not on the wire:
   `SCHEMA_VERSION` stays 2 and no client changes.
2. **`check` takes it as `guard::lint_in(screen, catalog)`.** Eight `catalog/` rules join the rule table, each with
   a fix text and a failing fixture, each naming the block. `Built::check` and its TS twin keep their signatures.
3. **A shape fault says which field.** `Block::read(kind, value)` parses as the named kind, so the reason is
   `missing field `label`` for every caller, not only for models.
4. **One reader: `model::read(catalog, prefix, text)`.** It finds the JSON, closes it if cut, mends, parses into
   typed `Block`s and runs decision 2. It returns `Fit` (the blocks, the mends, the warnings) or `Refusal`. Before
   it returns a `Fit` it checks that what sends, opens or loads is exactly what the model wrote.
5. **Mend what is inert, refuse the rest (2B).** A mend removes or completes: text around the JSON, an open end, a
   wrong root, a field with nothing in it that sends, opens or loads. Never mended: an action, a link, a file
   address, a confirm, `values`, a secret input, a kind's name, a missing field, one bad block among good ones.
   `shapes.md` has both tables; one test holds the second.
6. **The reader writes the ids.** `<prefix>.<n>` by position, and the prefix before each form field's name. Two
   replies on one screen cannot clash, a model spends no words on ids, and an action tells the host which reply it
   came from. Local state, `open`, `sheet`, `thread` and `focus` are offered to no model.
7. **A model writes markdown, not parts.** A `prose` block takes `markdown` from a model and the reader calls
   `Prose::read`. It is the one place the model's format is not the wire's.
8. **The refusal is the retry.** `Refusal::say()` is at most six lines, each a place in the model's own JSON, the
   kind and the rule's fix text. `Refusal::plain()` is what the reply said as one prose block of plain lines. The
   host calls its model once more, then falls back; blocks holds no loop and no state.
9. **Partial output is in scope as 3B, and no further.** `read` takes any prefix: top-level blocks that closed are
   read and checked, the open one is left out, `cut` is set. No parser state, no new op, no text that grows
   inside a model-written block.
10. **The prompt is type lines from generated cards.** `just gen` writes each kind's and part's line into
    `catalog/cards.rs`; `model::prompt(catalog)` keeps the catalog's kinds and fields, the parts they name, each
    kind's `sends`, the link starts and the example. Same catalog, same bytes. One format ships.
11. **The evals are cases, recorded replies and marks (5B).** A case holds a catalog, an ask, what a good answer
    holds and one gold reply. `blocks eval` scores a folder of recorded replies; with `--model` it first asks the
    owner's command and records. CI scores the recorded sets, so it needs no model. Another prompt format is tried
    with `--system <file>`, not by a second format in the crate.

## Consequences

- cooee builds "a persona replies with Blocks" from four calls: `Catalog::read`, `model::prompt`, `model::read`,
  `model::own`. `boundaries.md` lists what stays its job: the model call, the retry, the catalog's contents, and
  checking the values of an action a model-written form sent.
- A model cannot reach an action the host did not list for that kind, a link or a file outside the lists, a
  secret input, the host's other screens or local state. It can still write misleading text; no check reads meaning.
- Form values come back keyed `<prefix>.<name>`; `model::own` takes the prefix off. A host that reads `values`
  itself sees the prefix.
- A model's own `id` is dropped, so a model cannot name a block to change later. A changed reply is a whole new
  reply, and `diff` sends the difference.
- A reply appears block by block while it is written, never character by character. A host that wants streaming
  text keeps text outside the blocks: its own `prose` with `streaming`, and a tool call for the blocks.
- An app's own kind cannot be model-written yet: it has no schema for a card or a check.
- The run-time prompt and the dev-time skill are two outputs of one schema. The skill is untouched.
- `Fault::Shape`'s `why` changes wording for every caller. `fixtures/check/` is regenerated; the TS twin's wording
  already differs and is not compared.
- `guard::VERSION` becomes 4. The new rules see nothing without a catalog, so no app's baseline moves.
- Not done: a JSON Schema per catalog for constrained output; catalogs in `blocks check`'s fixture runs; a reader
  in TS or Swift; an A2UI importer.
- The cap: about 1,300 counted lines against 20,593 free after the open PRs (`drover cap blocks`). No raise.
- No new dependency: the closing of cut JSON is about 150 lines over `serde_json`, held by `fixtures/model/read/`.

## The slices

| | Slice | Builds | Counted | After |
|---|---|---|---|---|
| S1 | the catalog and its check | `catalog/mod.rs`; the eight rules and their fixtures; `lint_in`; `Block::read` | 290 | |
| S2 | the reader | `model/`: find, close, mend, type, check; `Fit`, `Refusal`, `say`, `plain`, `own`; `fixtures/model/read/`, `links.json`; the kept-sends test; `blocks read` | 430 | S1 |
| S3 | the prompt | `codegen/cards.rs`, `catalog/cards.rs` (generated), `model::prompt`, the size test, `blocks prompt` | 265 | S1 |
| S4 | the evals | `model::score`, `blocks eval`, `fixtures/evals/` with two catalogs, twelve cases and their golds; `docs/model.md` | 290 | S2, S3 |

Each is useful alone: after S1 a host can hold any screen to a catalog; after S2 it can read a model's reply.

## Hot files

- **Central lists.** The rule list (`guard/rules/mod.rs`) is generated from its folder: eight new files, no shared
  edit. Eval cases, recorded replies and reader cases are one file each in a folder the tests list, with no index.
- **Generated files.** `catalog/cards.rs` is new and written by `just gen` (`sh scripts/arch-gen.sh`), never by
  hand. `fixtures/check/*.json` is regenerated for decision 3.
- **Shared files touched, a line or two each:** `crates/blocks/src/lib.rs` (two `mod` lines),
  `codegen/mod.rs` (one area), `kind/macros.rs` (`Block::read`, in S1 only), `blocks-cli/src/lib.rs` (three commands,
  one per slice S2 to S4). None is on the hotspots list, and no slice shares one with another but `lib.rs`.
- **Docs.** One new page, `docs/model.md`, in the collected `docs/` folder. `docs/schema.md` is frozen and is not
  touched: a catalog is not the wire. `docs/guard.md` gets the eight rules in S1.

## The `.drover/arch.toml` lines

S1 adds the `catalog` layer and widens `guard` and `cli`; S2 adds the `model` layer; S3 adds the `generated` line.

```toml
generated = [
    "crates/blocks/src/catalog/cards.rs",
]

[[layer]]
name = "catalog"
paths = ["crates/blocks/src/catalog/**"]
mods = ["crate::catalog", "blocks::catalog"]
may_use = ["kind"]

[[layer]]
name = "model"
paths = ["crates/blocks/src/model/**"]
mods = ["crate::model", "blocks::model"]
may_use = ["kind", "built", "catalog", "guard"]
```

And three `may_use` lists gain names: `guard` gains `"catalog"`; `codegen` gains `"catalog", "model"`; `cli` gains
`"catalog", "model"`. No `frozen`, `collect`, `shared` or `ban` line changes: the bans on a transport, a process, a
file and a clock already cover both new folders.
