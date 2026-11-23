# Model-written screens: catalogs, the reader, the prompt and the evals

A host's model can write a screen mid-chat. Its output is untrusted and often nearly right, so blocks gives the host
four calls: `Catalog::read`, `model::prompt`, `model::read` and `model::own`. The model call, its key, the one retry
and what an action does stay the host's. The design is `docs/architecture/model-written/` (#359); this page is how
to use it.

## The catalog

One JSON file per trust level, by hand, in the host's repo. It names what a model may write; anything not named is
refused. It is never sent to a client, so no client changes.

```json
{
  "name": "reply",
  "kinds": {
    "prose":  {},
    "row":    { "fields": ["title", "subtitle", "value", "badge"] },
    "button": { "actions": ["pick", "open-plan"] },
    "form":   { "actions": ["submit"], "inputs": ["text", "toggle", "picker"] }
  },
  "links": ["https://"],
  "media": [],
  "max": { "blocks": 40, "chars": 16000 },
  "example": { "blocks": [{ "type": "prose", "markdown": "Pick a plan." },
                          { "type": "button", "label": "Pro", "action": "pick", "values": { "plan": "pro" } }] }
}
```

- `kinds`: core kinds only. Per kind, `fields` (with none, every field a model may write), the `actions` a block of
  it may send (with none, it sends nothing), and for a `form` or `config` the field types in `inputs`.
- `links` and `media`: the starts a link and a loaded file may have; each ends in `/` or `:`. Empty means none.
- `max`: the most blocks and characters a reply may hold; 40 and 16,000 unless set.
- `example`: one reply shown in the prompt. It must read under its own catalog with no mend.

`Catalog::read(json)` refuses an unknown key, a kind that is no core kind, a field its kind lacks, a field that is
never offered (`id`, `fallback`, local state, a tap's `open`, `sheet` or `thread`), and an example that does not fit.
`guard::lint_in(screen, catalog)` holds any screen to a catalog with the eight `catalog/` rules in `docs/guard.md`.

## The prompt

```rust
let catalog = Catalog::read(include_str!("../.blocks/catalog/reply.json"))?;
let system = format!("{}\n\n{}", persona.voice, model::prompt(&catalog));
```

`model::prompt` writes the catalog as TypeScript-like type lines: its kinds and fields, the parts they name, what
each kind sends, the link starts and the example. The same catalog gives the same bytes, so a provider's prompt cache
holds. `blocks prompt <catalog.json>` prints it, then its size on stderr.

## The reader

```rust
match model::read(&catalog, &turn.id, &text) {
    Ok(fit) => fit.blocks,
    Err(no) => match model::read(&catalog, &turn.id, &ask_again(no.say())) {
        Ok(fit) => fit.blocks,
        Err(no) => vec![no.plain(&turn.id)],
    },
}
```

- The prefix (`turn.id`) may not hold a `.`. Every block's id is written as `<prefix>.<n>`, and a form field's name
  as `<prefix>.<name>`, so two replies never clash. A model writes no id.
- It mends only what cannot change meaning: text or a code fence around the JSON, an open end or a trailing comma,
  a bare list in place of `{"blocks": []}`, an inert field the catalog does not offer, a top-level block cut off at
  the end (left out, `cut` set). A `prose` block's `markdown` becomes its parts.
- It never mends an action, a link, a file address, a `confirm`, `values`, a secret, a kind's name or a missing
  field, and one bad block refuses the whole reply. Before it returns a `Fit` it checks that what sends, opens or
  loads is exactly what the model wrote (`read/kept`).
- `Refusal::say()` is at most six lines for the model, once. `Refusal::plain(prefix)` is what the reply said as one
  `prose` block of plain lines with no action, link or file: show it after the retry fails.
- It takes the text so far while the model writes: the top-level blocks that closed come back and `cut` is set.
- `model::own(prefix, action)` gives an action's values when its block is under the prefix, the prefix off the field
  names. They are user input through a form a model designed: check them as any input.

`blocks read <catalog.json> < reply.txt` prints the blocks (exit 0) or `say()`'s text (exit 1).

## The evals

```
fixtures/evals/catalogs/<name>.json             the catalogs the cases use
fixtures/evals/cases/<case>.json                { catalog, ask, expect: { kinds, actions, says, blocks }, gold }
fixtures/evals/replies/<set>/<case>.1.txt       a model's raw first reply
fixtures/evals/replies/<set>/<case>.2.txt       its reply to say(), when the first was refused
fixtures/evals/replies/<set>.txt                the set's kept table
```

`expect` is what any good answer holds: these kinds, these actions sent, these words shown (any case), at most this
many top-level blocks. `gold` is one such reply. `model::score(catalog, expect, first, second)` marks one case:

| Mark | Means |
|---|---|
| `fit` | the first reply reads |
| `retry` | the first is refused and the second reads |
| `fell` | neither reads |
| `mends`, `warns` | the mends made and the guard's warnings on the reply drawn |
| `meets` | the reply drawn holds `expect` |
| `chars` | the drawn reply's length, else the last one read |

```sh
blocks eval fixtures/evals --replies fixtures/evals/replies/near                      # score a recorded set
blocks eval fixtures/evals --replies <dir> --model ./ask-model.sh                     # ask, record, then score
blocks eval fixtures/evals --replies <dir> --model ./ask-model.sh --system terse.txt  # the same with another prompt
```

A set scores the cases it holds a first reply for. The table ends in one summary line: the share that fit, that fit
after one retry, that meet their case and that fit clean (no mend, no warning), the mends a reply and its length.

`--model <command>` runs through `sh -c` once per call. It reads one JSON object on stdin and writes the reply's text
to stdout; a non-zero exit stops the run:

```json
{ "system": "…the prompt…", "messages": [{ "role": "user", "text": "…" }, { "role": "assistant", "text": "…" }] }
```

The first call holds the case's ask; when its reply is refused, a second call adds that reply and `say()`. Both are
written to the set. `--system <file>` replaces the generated prompt; it needs `--model`. The command, its key and
its cost are the host's: blocks never calls a model.

CI scores every set under `fixtures/evals/replies/` with no model call and fails when a table differs from the kept
`<set>.txt`, so a reader change that turns a fit into a refusal shows as a diff. `gold` is the cases' golds, which
must read with no mend and full marks; `near` is hand-made near misses. To add a recorded set, write its folder with
`--model` and keep its table: `blocks eval fixtures/evals --replies fixtures/evals/replies/<set> > fixtures/evals/replies/<set>.txt`.
