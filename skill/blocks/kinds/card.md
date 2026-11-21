# `card`

A card: an ask, a run, a config or a proposal.

The Rust type `Card`; in TS, `card(fields: Card)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `badge` | `Label` | optional |
| `blocks` | `Block[]` | optional |
| `buttons` | `Block[]` | optional |
| `color` | `string` | optional |
| `fold` | `Fold` | optional |
| `id` | `string` | optional |
| `kind` | `CardKind` | optional |
| `menu` | `Act[]` | optional |
| `meta` | `Shown` | optional |
| `push` | `boolean` | optional |
| `show` | `Expr` | optional |
| `subtitle` | `Toned` | optional |
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
  "subtitle": "waiting",
  "meta": {
    "since": "2026-11-09T09:35:00Z",
    "label": "as of {} ago"
  },
  "badge": {
    "text": {
      "until": "2026-11-09T09:53:00Z",
      "label": "lapses in {rel}"
    }
  },
  "blocks": [
    {
      "type": "row",
      "id": "card-row",
      "title": "Review",
      "subtitle": {
        "text": {
          "until": "2026-11-09T09:53:00Z",
          "label": "decides in {rel}"
        }
      },
      "value": {
        "since": "2026-11-09T09:35:00Z",
        "label": "{} ago"
      }
    },
    {
      "type": "stat",
      "id": "card-up",
      "label": "up",
      "value": {
        "since": "2026-11-09T09:35:00Z",
        "label": "{}"
      }
    }
  ]
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
  "children": [
    {
      "kind": "row",
      "id": "card-row",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "Review",
      "children": []
    },
    {
      "kind": "stat",
      "id": "card-up",
      "variant": null,
      "drawn": "native",
      "role": "group",
      "name": "up",
      "children": []
    }
  ]
}
```
