# Usage: how the callers read (#359)

Sketches, not code to copy. A Rust host (cooee's persona reply), then the command and the evals. Every name is
specified in `shapes.md`. Nothing here exists yet.

## 1. The host writes a catalog, once

One JSON file per trust level, by hand, in the host's repo. It names what a model may write and nothing else.

```json
{
  "name": "reply",
  "kinds": {
    "prose":  {},
    "list":   {},
    "row":    { "fields": ["title", "subtitle", "value", "badge"] },
    "table":  { "fields": ["title", "columns", "rows", "empty"] },
    "card":   { "fields": ["title", "subtitle", "badge", "tone", "blocks", "buttons"] },
    "button": { "actions": ["pick", "open-plan"] },
    "choice": { "actions": ["answer"] },
    "form":   { "actions": ["submit"], "inputs": ["text", "toggle", "picker"] }
  },
  "links": ["https://"],
  "media": [],
  "example": { "blocks": [{ "type": "prose", "markdown": "Pick a plan." },
                          { "type": "button", "label": "Pro", "action": "pick", "values": { "plan": "pro" } }] }
}
```

- A kind that is not named is refused. A kind with no `actions` sends nothing. With no `fields`, every field of the
  kind that a model may write is allowed.
- `links` and `media` are the starts a link and a loaded file may have. Empty means none.
- Unknown keys, an unknown kind or field, and an `example` that does not fit its own catalog are refused when the
  file is read, so a typo never becomes a silent default.

## 2. The host reads it at start and builds the prompt

```rust
let catalog = Catalog::read(include_str!("../.blocks/catalog/reply.json"))?;
let system = format!("{}\n\n{}", persona.voice, model::prompt(&catalog));
```

`model::prompt` gives the same bytes for the same catalog, so a provider's prompt cache holds. `blocks prompt
.blocks/catalog/reply.json` prints it with its size.

## 3. A reply: read, one retry, then plain text

The model call is the host's. The reader is a pure function: text in, checked blocks or a refusal out.

```rust
async fn reply(llm: &Llm, system: &str, turn: &Turn, catalog: &Catalog) -> Vec<Block> {
    let first = llm.ask(system, &turn.history).await;
    let no = match model::read(catalog, &turn.id, &first) {
        Ok(fit) => return fit.blocks,
        Err(no) => no,
    };
    let again = turn.history.said(&first).told(&no.say());
    match model::read(catalog, &turn.id, &llm.ask(system, &again).await) {
        Ok(fit) => fit.blocks,
        Err(no) => vec![no.plain(&turn.id)],
    }
}
```

- `turn.id` is the prefix: the reader writes every block's id as `<prefix>.<n>`, so two replies never share an id.
- `no.say()` is short enough to hand back as it is:

  ```
  Not drawn: 2 problems. Send the whole JSON again with these fixed.
  1. blocks[1].buttons[0] (button): the action `wipe` is not listed. A button may send: pick, open-plan.
  2. blocks[0] (table): missing field `columns`.
  ```

- `no.plain(id)` is one `prose` block: what the reply said, as plain lines, with no action and no link.
- A reply that is only text is refused like any other. Its `plain` is that text, so a host may show it without
  asking again.

The blocks then go where any blocks go. Nothing downstream knows a model wrote them:

```rust
let message = Message::new(Role::Agent, &persona.name).id(&turn.id).blocks(blocks);
shelf.put(&key, &thread_with(message));
```

## 4. While the model is still writing (the host's choice)

The same function takes the text so far. It returns the blocks that have closed, and `cut` says the text ended early.
Ids are by position, so `diff` sends only what is new.

```rust
while let Some(chunk) = stream.next().await {
    text.push_str(&chunk);
    if let Ok(fit) = model::read(catalog, &turn.id, &text) {
        shelf.put(&key, &thread_with(writing(&turn.id, fit.blocks)));
    }
}
```

The retry in part 3 runs only on the whole text. A reply that hit the token limit is whole with `fit.cut` set: the
host keeps what closed, or asks again.

## 5. An action comes back

```rust
fn on_action(a: &Action, turn: &Turn, catalog: &Catalog) {
    let Some(values) = model::own(&turn.id, a) else { return ours(a) };
    if catalog.sends(&a.action) {
        persona.heard(turn, &a.action, values);
    }
}
```

`model::own` gives the action's values when its block is under the prefix, with the prefix taken off the form field
names. The values are the user's input to a model-written form: the host checks them as it checks any input.

## 6. The command

```sh
blocks prompt .blocks/catalog/reply.json                 # the prompt, then "3394 characters" on stderr
blocks read   .blocks/catalog/reply.json < reply.txt     # the blocks as JSON, exit 0; or say()'s text, exit 1
```

## 7. The evals

A case is one file: a catalog's name, what the user asked, what the answer must hold, and one reply that does.

```json
{ "catalog": "ask", "ask": "Offer me the Pro and Team plans and let me pick one.",
  "expect": { "kinds": ["button"], "actions": ["pick"], "says": ["Pro", "Team"], "blocks": 6 },
  "gold": { "blocks": [] } }
```

```sh
blocks eval fixtures/evals --replies fixtures/evals/replies/gold             # score recorded replies; no model
blocks eval fixtures/evals --replies /tmp/sonnet --model ./ask-sonnet.sh     # ask, record, then score
blocks eval fixtures/evals --replies /tmp/terse  --model ./ask-sonnet.sh --system terse.txt
```

```
case         fit  retry  fell  mends  warns  meets  chars
pick-plan     1     0     0      1      0      1     412
compare       0     1     0      0      1      1    1904
12 cases: fit 83%, after one retry 100%, meets 92%, clean 75%, 0.4 mends, 1,020 characters a reply
```

`--model` is the owner's own command (`shapes.md`, The model command): blocks never calls a model. CI runs only the
first line, on the replies kept in the repo, so the reader's rules are held to real model output with no model.
