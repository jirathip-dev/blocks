# `stat`

Figures: a list of tiles, or one tile inline.

The Rust type `Stat`; in TS, `stat(fields: Stat)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `id` | `string` | optional |
| `items` | `Tile[]` | optional |
| `label` | `string` | optional |
| `show` | `Expr` | optional |
| `spark` | `number[]` | optional |
| `tone` | `Tone` | optional |
| `unit` | `string` | optional |
| `value` | `Shown` | optional |

## A sample

```json
{
  "type": "stat",
  "id": "open",
  "label": "open",
  "value": 3
}
```

## The tree it draws

```json
{
  "kind": "stat",
  "id": "open",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "open",
  "children": []
}
```
