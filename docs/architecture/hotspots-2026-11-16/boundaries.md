# Boundaries and state

## Who may use whom

| module | may use | never |
|---|---|---|
| `web/src/render/kind/<kind>.ts` | `gen/types.ts`, `render/ctx.ts`, `dom.ts`, `act.ts`, `text.ts`, `block.ts` (`kids`, `render`, `fallback`), a part another kind exports, `island.ts`, `behave.ts` | `gen/kinds.ts`; `fetch` and `localStorage` (today's bans) |
| `web/src/render/block.ts` | `gen/kinds.ts`, `gen/hooks.ts`, `kind/row.ts` for the fallback's row | the shell, the stream |
| `web/src/gen/kinds.ts` | every file in `render/kind/`, `render/block.ts`, `render/ctx.ts` | a hand edit |
| `web/src/shell.ts`, `tree.ts` | `render/block.ts`, `ctx.ts`, `dom.ts`, `text.ts`, `gen/kinds.ts` | a kind's file by name |
| `web/src/css/kind/<kind>.css` | the theme's variables, a class from `base/` | a rule for a class that another kind's file also styles at the same weight |
| `web/test/kind/<kind>.test.ts` | `kit.ts`, the kind's fixture, `src/` | another kind's test file |
| `site/kind/<kind>.rs` | `site::write`, `site::md`, `super::{kids, holder, fallback}`, a `pub(super)` part of another kind, `behave`, `theme` | `site::page` |
| `site/kind/mod.rs` | every kind's `draw` | a kind's HTML |
| `site/page.rs` | `site::write`, `kind::block` | a kind by name |
| `codegen/<area>.rs` | `codegen/model.rs`, the crate's layers as today | another area; a file outside its own outputs |
| `codegen/mod.rs` | each area's `files` | a generated path by name |
| `BlocksUI/Kind/<Kind>.swift` | `BlockNode`, `BlockStack`, `ActButton`, `Components.swift`, the look | another kind's private views |
| `BlocksUI/BlockNode.swift` | every kind's view | a kind's layout |

The crate's layers do not change: `site` and `codegen` are the same two layers over more files. What holds each
rule:

| rule | held by |
|---|---|
| a kind file's export fits its kind | `tsc`, through the type of `R` in the generated table |
| a file in `render/kind/` names a kind | the generator fails |
| the table matches the folder | arch-check: `web/src/gen/kinds.ts` is `generated` |
| a kind never reads the table | arch-check: the `gen/kinds.ts` ban in `web/src/render/kind/**` |
| a listed site kind has `draw` | the compiler: the macro calls `<kind>::draw` |
| a site kind's file is in the list | its site test and its `fixtures/html` file: an unlisted file is not compiled, so both show the fallback |
| Swift draws every kind | the compiler: the `switch` over `Block` is exhaustive |
| an old list does not come back | arch-check: `frozen` |
| a shared file stays small | arch-check: its `[[size]]` rule (Rust and TS only today; open question 2) |
| two kinds' rules do not depend on file order | none; pictures prove it once (`shapes.md`), and a kind's own screenshots show it after |

## A listed file, as a statechart

```text
  [quiet]  under the bar
     │  5 or more counted PRs in 14 days
     ▼
  [hot]  in the weekly report; its PRs run one at a time
     │                         │                          │                          │
     │ a list of kinds         │ has areas                │ one concern              │ prose
     ▼                         ▼                          ▼                          ▼
  [folder]                  [by area]                  [shared]                   [frozen]
  the old file deleted      one file an area,          whole, under a size        may be reworded,
  and frozen; one file      the old file deleted       limit just above           may not grow;
  per kind; the table       or a frozen index          today's size               a new subject is
  generated                                                                       a new file
     │                         │                          │
     │ a new file gets hot     │ an area gets hot         │ the file is full
     ▼                         ▼                          ▼
  next week's report: it was split along the wrong line  the next feature goes in a new file beside it
```

## A kind in a PR, as a statechart

```text
  [a kind's files added or changed]
     │  web: `just gen`
     ▼
  [table rebuilt] ──▶ arch-check runs `just gen` again: same bytes ──▶ pass
     │
     ├─ the table not rebuilt ──▶ arch-check: `web/src/gen/kinds.ts` differs ──▶ fail, names the command
     ├─ a file in `render/kind/` that names no kind ──▶ `just gen` fails, names the file
     ├─ a site kind's file with no line in `site/kind/mod.rs` ──▶ not compiled: its site test sees the fallback ──▶ fail
     └─ staging moved and the table conflicts ──▶ update round: take either side, run `just gen`, commit ──▶ pass
```

A slice's own PR adds one more state: an open PR that still edits a deleted list (`render/index.ts`,
`blocks.css`, `render.test.ts`) gets a conflict on merge, and its update round moves its lines into the kind's file.
