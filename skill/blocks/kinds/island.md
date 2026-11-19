# `island`

A client component the app hosts: its props in, its named events out.

The Rust type `Island`; in TS, `island(fields: Island)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `events` | `string[]` | optional |
| `fallback` | `Fallback` | required |
| `id` | `string` | optional |
| `name` | `string` | required |
| `props` | `Record<string, unknown>` | optional |
| `show` | `Expr` | optional |
| `size` | `IslandSize` | optional |

## A sample

```json
{
  "type": "island",
  "id": "map",
  "name": "x-map",
  "fallback": {
    "title": "The map"
  },
  "props": {
    "zoom": 3
  },
  "events": [
    "pick"
  ]
}
```

## The tree it draws

```json
{
  "kind": "island",
  "id": "map",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "x-map",
  "children": []
}
```
