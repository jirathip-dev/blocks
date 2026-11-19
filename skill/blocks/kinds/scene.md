# `scene`

Lanes at work.

The Rust type `Scene`; in TS, `scene(fields: Scene)` from `web/src/gen/builders.ts`.

## Fields

| field | type | |
|---|---|---|
| `id` | `string` | optional |
| `label` | `string` | optional |
| `lanes` | `Lane[]` | optional |
| `show` | `Expr` | optional |

## A sample

```json
{
  "type": "scene",
  "id": "scene",
  "label": "lanes",
  "lanes": [
    {
      "id": "impl-1",
      "title": "impl",
      "state": "working"
    }
  ]
}
```

## The tree it draws

```json
{
  "kind": "scene",
  "id": "scene",
  "variant": null,
  "drawn": "native",
  "role": "group",
  "name": "lanes",
  "children": []
}
```
