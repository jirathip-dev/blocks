# `toast`

A short line after an action, in a tone, with an optional undo: an answer's toast, or drawn where it sits.

The Rust type `Toast`; in TS, `toast(fields: Toast)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `fallback` | `Fallback` | optional |
| `id` | `string` | optional |
| `show` | `Expr` | optional |
| `title` | `string` | required |
| `tone` | `Tone` | optional |
| `undo` | `Undo` | optional |

## A sample

```json
{
  "type": "toast",
  "id": "archived",
  "tone": "ok",
  "title": "Archived 3 orders",
  "undo": {
    "action": "unarchive",
    "values": {
      "ids": [
        "o-4821",
        "o-4822",
        "o-4825"
      ]
    }
  }
}
```

## The tree it draws

```json
{
  "kind": "toast",
  "id": "archived",
  "variant": null,
  "drawn": "native",
  "role": "status",
  "name": "Archived 3 orders",
  "children": []
}
```
