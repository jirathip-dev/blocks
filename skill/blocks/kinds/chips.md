# `chips`

A row of chips, one or many selected.

The Rust type `Chips`; in TS, `chips(fields: Chips)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `action` | `string` | optional |
| `id` | `string` | optional |
| `multi` | `boolean` | optional |
| `name` | `string` | required |
| `options` | `ChipOption[]` | required |
| `selected` | `string[]` | optional |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "chips",
  "id": "effort",
  "name": "effort",
  "options": [
    {
      "value": "low",
      "label": "low"
    },
    {
      "value": "high",
      "label": "high"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "chips",
  "id": "effort",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "effort",
  "children": []
}
```
