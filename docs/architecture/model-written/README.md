# model-written screens: catalogs, a check-and-repair reader, a prompt and evals (#359)

## Summary

Decision: a catalog is a JSON file in the host's repo: the kinds a model may write, their fields, the actions each
may send, and the links and files a screen may reach. One new function reads a model's text into checked blocks. It
mends only what cannot change meaning (never an action, a link or a secret input), else refuses with a short list
the model gets once; after that the reply is shown as plain text. Streaming: blocks are drawn as each one closes.
Slices: four, about 1,300 lines: the catalog and its check rules; the reader; the generated prompt; the evals.
Open questions: (1) four issues, the first under #359, or one PR? (2) who records the first eval replies (spend)?

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: the catalog file, a reply with its one retry, a reply still being written, an action coming back, the command, the evals |
| `adr.md` | the question, what exists, five options tables, the decision in eleven parts, consequences, the slices, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the catalog and what its load refuses, the eight rules, the reader's types, what is mended and what never is, the prompt and its sizes, the eval files and the model command |
| `boundaries.md` | which module may call which and what enforces it, the reader's steps, two statecharts, what stays the host's job |
| `proto/prompt.py` | the script behind the prompt sizes: `python3 docs/architecture/model-written/proto/prompt.py ask` |

## The path in one picture

```
.blocks/catalog/reply.json ──Catalog::read──▶ Catalog ──model::prompt──▶ the system prompt ──▶ the host's model call
                                                 │                                                     │
                                                 ▼                                                     ▼ text
            Fit: checked blocks, ids written ◀── model::read: find, close, mend, type, check ◀─────────┘
                       │                         │
                       ▼                         └─▶ Refusal: say() to the model once, then plain()
            a message's blocks ──▶ Shelf::put ──▶ the stream, as any screen
```

## Where each ask of the issue is answered

| The issue asks | Decision | Detail |
|---|---|---|
| the catalog's shape and where it lives | 1 | `shapes.md`, The catalog; `adr.md` option 1 |
| how `check` takes one, naming the block and the rule | 2, 3 | `shapes.md`, The check |
| the repair rules, and what is never repaired (actions, secrets) | 5, 6, 7 | `shapes.md`, What is mended, and what never is |
| a refusal short enough for one retry, then a plain-text fallback | 8 | `usage.md` part 3; `boundaries.md` chart 1 |
| whether streamed or partial output is in scope | 9 | `adr.md` option 3; `usage.md` part 4; `boundaries.md` chart 2 |
| the prompt's format and its size per catalog | 10 | `shapes.md`, The prompt; `adr.md` option 4 |
| the evals' form | 11 | `shapes.md`, The evals; `usage.md` part 7 |
| what stays the host's job | | `boundaries.md`, last table |
| no new dependency | | none: `adr.md`, Consequences |

## Beside A2UI

| A2UI has | Here |
|---|---|
| a catalog a client and an agent agree on | a catalog the host holds. A client that lacks a kind already draws its fallback, so nothing is agreed on the wire |
| its own component JSON | the wire's own blocks, with two differences for a model: no ids, and prose as markdown |
| a data model and bindings updated by messages | a new reply and `diff`'s ops |
| a stream of JSON lines | the reader on the text so far |

## Open questions

1. **Four issues or one PR.** The slices are about 290, 430, 265 and 290 lines and each is useful alone.
   Recommended: #359 carries S1 (the catalog and its check), and the orchestrator files S2 to S4, with cooee's issue
   blocked on S2 and S3. Or all four in #359's one PR.
2. **The first recorded replies.** S4 ships the cases, their gold replies and a few hand-made near misses, which
   need no model. Real marks need real calls, which cost money and a key blocks must not hold. Recommended: after
   S4 the owner runs `blocks eval --model` once with cooee's command for the two or three models cooee may use, and
   commits the replies. Or cooee's lane does it as part of its own issue.

## What was read and measured

- blocks `staging` at `764c38ec`: `built.rs`, `kind/` (macros, parts, `read.rs`, `prose`, `message`, `tool`,
  `form`, `button`, `secret`, `screen`, `card`, `choice`, `text`), `wire.rs`, `guard/` (`mod.rs`, `cx.rs`,
  `shape.rs`, `judge.rs`, four rules), `codegen/` (`mod.rs`, `model.rs`, `skill.rs`), `blocks-cli` (`lib.rs`,
  `files.rs`), `web/src/core/check.ts`, `skill/blocks/`, `docs/schema/`, `docs/guard.md`, `.drover/arch.toml`,
  `.gatekeeper/deps.toml`, and the message, guard and wasm-core ADRs.
- Measured: the prompt's size for three catalogs against the JSON Schema and the skill pages for the same kinds
  (`proto/prompt.py`, on `schema/blocks.schema.json`); the cap (`drover cap blocks`: 22,095 of 44,000).
- Not measured: tokens (estimated at 3.5 characters each), the reader's time (S2 sets its budget in `perf.rs`), and
  any model's marks (open question 2). The line counts are estimates from the size of `guard/`, `codegen/skill.rs`
  and `kind/read.rs`.
