# `card`

A card: an ask, a run, a config or a proposal.

The Rust type `Card`; in TS, `card(fields: Card)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `badge` | `Label` | optional |
| `blocks` | `Block[]` | optional |
| `buttons` | `Block[]` | optional |
| `fold` | `Fold` | optional |
| `id` | `string` | optional |
| `kind` | `CardKind` | optional |
| `menu` | `Act[]` | optional |
| `meta` | `string` | optional |
| `push` | `boolean` | optional |
| `show` | `Expr` | optional |
| `subtitle` | `string` | optional |
| `tap` | `Tap` | optional |
| `title` | `string` | optional |
| `tone` | `Tone` | optional |

## A sample

```json
{
  "type": "card",
  "id": "card",
  "kind": "ask",
  "title": "q1",
  "subtitle": "waiting"
}
```

## The tree it draws

```json
{
  "kind": "card",
  "id": "card",
  "variant": "ask",
  "drawn": "native",
  "role": "group",
  "name": "q1",
  "children": []
}
```
