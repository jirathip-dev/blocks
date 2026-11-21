# Usage: how the callers read

A Rust server (cooee's chat, drover's threads), then a client, a TS app and the test. Every name is specified in
`shapes.md`. Nothing here exists yet.

## 1. A thread screen, built as any screen is

A message says who is speaking. What was said is its blocks, in the order it was said: text is a `prose` block,
a tool call is a `tool` block. Any other block may sit there too (a `diff`, an ask `card`).

```rust
fn said(turn: &Turn) -> Block {
    let mut blocks = vec![];
    for step in &turn.steps {
        blocks.push(match step {
            Step::Text { id, markdown, writing } => {
                let text = Prose::new(Prose::read(markdown)).id(id);
                Block::Prose(Box::new(if *writing { text.streaming(true) } else { text }))
            }
            Step::Call { id, tool, state, line, output } => {
                let row = Tool::new(tool, state.clone()).id(id).summary(line);
                Block::Tool(Box::new(match output {
                    Some(o) => row.body(o),
                    None => row,
                }))
            }
        });
    }
    Block::Message(Box::new(Message::new(Role::Agent, "Scout").id(&turn.id).avatar("/media/scout.png").blocks(blocks)))
}

fn asked(m: &Sent) -> Block {
    let files = m.files.iter().map(|f| Attachment {
        name: f.name.clone(),
        tap: Tap { url: Some(format!("/files/{}", f.id)), ..Tap::default() },
        src: f.image.then(|| format!("/files/{}/small", f.id)),
    });
    let text = Prose::new(Prose::read(&m.text)).id(format!("{}-text", m.id));
    Block::Message(Box::new(
        Message::new(Role::Owner, "You").id(&m.id).blocks(vec![Block::Prose(Box::new(text))]).files(files.collect::<Vec<_>>()),
    ))
}
```

The thread is a `section` of messages over the `composer` that exists today. `Prose::read` is the one place
markdown is read; no renderer reads it.

## 2. A reply that streams: nothing new to call

The app keeps the markdown it has so far and builds the screen again, as it does for any change. `Shelf::put`
diffs it, and the diff finds that a prose block only grew at its end.

```rust
// each time the model sends text; the app batches to at most 20 puts a second (measured.md, the server's cost)
turn.steps.last_text().push_str(&delta);
let screen = thread_screen(&thread);
if let Put::Changed(d) = shelf.put(&key, &wire, &screen)? {
    streams.send(&d.frame);
}
```

What goes out, frame by frame:

```json
{"op":"insert","into":"log","block":{"type":"message","id":"t7","role":"agent","name":"Scout","blocks":[{"type":"prose","id":"t7-a","parts":[],"streaming":true}]}}
{"op":"append","id":"t7-a","keep":0,"parts":[{"part":"para","spans":[{"text":"I will read the"}]}]}
{"op":"append","id":"t7-a","text":" two files first"}
{"op":"append","id":"t7-a","text":", then run the "}
{"op":"append","id":"t7-a","keep":0,"parts":[{"part":"para","spans":[{"text":"I will read the two files first, then run the "},{"text":"tests","bold":true}]}]}
{"op":"merge","id":"t7-a","fields":{"streaming":null}}
{"op":"insert","into":"t7","block":{"type":"tool","id":"t7-b","name":"Read","state":"running","summary":"patch.rs"}}
{"op":"merge","id":"t7-b","fields":{"state":"done","summary":"patch.rs, 238 lines"}}
```

- Text that only got longer is one small `append` with `text`.
- When the open part changes shape (a word became bold, a list got an item, a new paragraph began), the `append`
  carries the parts from the first changed one on. Parts before it are never sent again.
- A tool row is a block: it arrives by `insert` and changes by `merge`, as a row does today.

An app that still serves the old per-screen stream passes its ops through `wire::old(ops, &screen)`, as it does
today; `old` turns an `append` into a `merge` of the prose block's `parts`.

## 3. A client: nothing new to call

A frame goes into `Mirror::frame` (Rust), `Mirror.frame` (TS) or `Replica.frames` (Swift) as before. Each applies
`append` to the screen it holds, and each renderer grows the drawn text where it stands (`boundaries.md`).

```swift
replica.frames(burst)                       // unchanged
BlocksView(replica.screen(key)!, source: nil, act: send)
```

## 4. A TS app (Mode B, the React adapter)

```ts
const reply = message({
  id: "t7", role: "agent", name: "Scout",
  blocks: [prose({ id: "t7-a", parts, streaming: true }), tool({ id: "t7-b", name: "Read", state: "done", summary: "patch.rs, 238 lines" })],
  files: [{ name: "plan.pdf", tap: { url: "/files/9" } }],
});
```

The app hands `BlocksView` the next screen. `share` and the memo per block keep every block that did not change,
so only the prose that grew is drawn again. An app that receives ops applies them with `apply(screen, ops)`, which
moves into the core (`web/src/core/apply.ts`).

## 5. The test: a reply streams in place

One script, played by `blocks-shot`, `blocks-snap` and the desktop harness (`fixtures/append/thread.steps.json`):

```json
[ { "tap": { "id": "t7-b" } },
  { "frame": { "k": "/t", "from": 1, "rev": 2, "ops": [{ "op": "append", "id": "t7-c", "text": " and more" }] } },
  { "frame": { "k": "/t", "from": 2, "rev": 3, "ops": [{ "op": "merge", "id": "t7-d", "fields": { "state": "done" } }] } },
  { "shot": { "name": "after" } } ]
```

It passes when the drawn tree is the tree of the screen after the ops, the body of tool `t7-b` opened by the first
step is still open, and (HTML) the longest patch stays under the 4 ms the 200-row gate already uses.
